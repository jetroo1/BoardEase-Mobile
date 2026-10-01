// AuthContext keeps track of "who is logged in" for the whole app.
//
// Instead of every screen asking Firebase directly "who is the user right
// now?", we check once here and share the answer with every screen through
// React Context. Screens read it with the useAuth() hook at the bottom
// of this file.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  FacebookAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signInWithCredential,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { clearOfflineCache } from '../utils/offlineCache';
import { LEGAL_VERSION } from '../legal';
import { UserRole } from '../types';

// This describes everything a screen can read or call through useAuth().
interface AuthContextType {
  user: User | null; // the raw Firebase Auth user object (or null if logged out)
  role: UserRole | null; // 'tenant' or 'admin', loaded from Firestore
  loading: boolean; // true while we are still checking login state on startup
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  completeFacebookProfile: () => Promise<void>;
  facebookLoginAvailable: boolean;
  needsProfileSetup: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [, setAuthRevision] = useState(0);
  const facebookLoginAvailable =
    Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient';

  useEffect(() => {
    // onAuthStateChanged is a Firebase "listener": it fires once right away
    // with whoever is currently logged in (or null), and then fires again
    // automatically every time someone logs in or logs out.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && !needsEmailVerification(firebaseUser)) {
        // A user is logged in. Look up their role from Firestore, in the
        // "users" collection, using their unique id (uid) as the document id.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setRole((data.role as UserRole) || 'tenant');
            setNeedsProfileSetup(false);
          } else {
            setRole(null);
            setNeedsProfileSetup(true);
          }
        } catch {
          // A network or rules failure must not leave the whole app on a blank
          // startup screen. Data requests will still surface their own error.
          setRole(null);
          setNeedsProfileSetup(false);
        }
      } else {
        // Nobody is logged in, or the email/password account has not confirmed
        // its email yet. Both states must not inherit an earlier user's role.
        setRole(null);
        setNeedsProfileSetup(false);
      }

      setLoading(false);
    });

    // This runs when AuthProvider unmounts, to stop listening for changes.
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    // We don't need to setUser() here -- onAuthStateChanged above will
    // fire automatically and update the state for us.
  }

  async function register(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Every brand-new account gets a matching users/{uid} document with the
    // default role "tenant". Admin accounts are promoted later by manually
    // editing this field to "admin" in the Firebase console.
    //
    // The consent block is written in the same document, in the same write, as
    // the account itself. Under the Data Privacy Act of 2012 consent has to be
    // evidenced, and an account that exists without a record of what its owner
    // agreed to is exactly the gap that requirement is about. The version
    // matters as much as the timestamp: it says which wording was on screen,
    // so amending src/legal.ts later cannot retroactively change what somebody
    // accepted.
    //
    // Register will not call this without consent -- the button is disabled
    // until the box is ticked -- so there is no unconsented path to guard.
    try {
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        role: 'tenant',
        consent: {
          termsVersion: LEGAL_VERSION,
          privacyVersion: LEGAL_VERSION,
          acceptedAt: serverTimestamp(),
        },
      });
    } catch (error) {
      // Do not leave an Auth account behind when its required profile failed.
      await deleteUser(result.user).catch(() => undefined);
      await firebaseSignOut(auth).catch(() => undefined);
      throw error;
    }

    // Firebase sends a signed verification link to the account's inbox. The
    // app gates email/password accounts until the person uses that link.
    await sendEmailVerification(result.user);
  }

  async function resendVerificationEmail() {
    const currentUser = auth.currentUser;
    if (!currentUser || !needsEmailVerification(currentUser)) {
      return;
    }
    await sendEmailVerification(currentUser);
  }

  async function refreshUser() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    await currentUser.reload();
    await currentUser.getIdToken(true);
    setUser(auth.currentUser);
    // reload() mutates Firebase's User object in place. The revision makes
    // React render again so RootNavigator sees the new emailVerified value.
    setAuthRevision((revision) => revision + 1);
  }

  async function loginWithFacebook() {
    if (!facebookLoginAvailable) {
      const error = new Error('Facebook login is available in the BoardEase development build.');
      Object.assign(error, { code: 'auth/operation-not-supported-in-this-environment' });
      throw error;
    }

    // Loaded only in the development build. Expo Go does not include this
    // native module, which is why the login button is hidden there.
    const { AccessToken, LoginManager } = require('react-native-fbsdk-next') as typeof import('react-native-fbsdk-next');
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    if (result.isCancelled) {
      const error = new Error('Facebook sign-in was cancelled.');
      Object.assign(error, { code: 'auth/popup-closed-by-user' });
      throw error;
    }

    const accessToken = await AccessToken.getCurrentAccessToken();
    if (!accessToken) {
      throw new Error('Facebook did not return an access token.');
    }

    const credential = FacebookAuthProvider.credential(accessToken.accessToken);
    await signInWithCredential(auth, credential);
  }

  async function completeFacebookProfile() {
    const currentUser = auth.currentUser;
    const isFacebookUser = currentUser?.providerData.some(
      (provider) => provider.providerId === FacebookAuthProvider.PROVIDER_ID
    );

    if (!currentUser || !isFacebookUser || !currentUser.email) {
      throw new Error('Facebook did not provide an email address for this account.');
    }

    await setDoc(doc(db, 'users', currentUser.uid), {
      email: currentUser.email,
      role: 'tenant',
      consent: {
        termsVersion: LEGAL_VERSION,
        privacyVersion: LEGAL_VERSION,
        acceptedAt: serverTimestamp(),
      },
    });
    setRole('tenant');
    setNeedsProfileSetup(false);
  }

  async function logout() {
    // Drop this account's cached favorites and recently-viewed listings
    // first, so the next person to log in on this phone does not see them.
    if (user) {
      await clearOfflineCache(user.uid);
    }

    await firebaseSignOut(auth);
  }

  const value: AuthContextType = {
    user,
    role,
    loading,
    login,
    register,
    resendVerificationEmail,
    refreshUser,
    loginWithFacebook,
    completeFacebookProfile,
    facebookLoginAvailable,
    needsProfileSetup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function needsEmailVerification(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'password')
    && !user.emailVerified;
}

// A small helper hook so screens can write `const { user } = useAuth();`
// instead of importing useContext and AuthContext everywhere.
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth() must be called from inside an <AuthProvider>');
  }
  return context;
}
