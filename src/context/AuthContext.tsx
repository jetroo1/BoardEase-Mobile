// AuthContext keeps track of "who is logged in" for the whole app.
//
// Instead of every screen asking Firebase directly "who is the user right
// now?", we check once here and share the answer with every screen through
// React Context. Screens read it with the useAuth() hook at the bottom
// of this file.

// Sign-in is email and password only.
//
// Facebook and Google were implemented here and have been removed. Both need
// native code compiled into the application, and Expo's SDK 57 documentation
// is explicit that such libraries "can't be used in Expo Go". This course
// requires Expo Go, so the buttons could never have worked for the people
// marking it -- they were hidden in Expo Go and live only in a development
// build, which amounts to a feature nobody could reach. Carrying the code,
// the two native dependencies and the config plugins for that was cost
// without benefit.

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { clearOfflineCache } from '../utils/offlineCache';
import { LEGAL_VERSION } from '../legal';
import { UserRole } from '../types';

// This describes everything a screen can read or call through useAuth().
interface AuthContextType {
  user: User | null; // the raw Firebase Auth user object (or null if logged out)
  role: UserRole | null; // 'tenant' or 'admin', loaded from Firestore
  // The signed-in person's profile picture, or null for the default avatar.
  // Kept here rather than read from Firebase Auth's own photoURL because the
  // Auth object only changes identity on sign-in: a picture saved while the
  // app is running would not reach any screen until the next launch.
  photoURL: string | null;
  loading: boolean; // true while we are still checking login state on startup
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Saves a new picture, or clears it with null. Writes Firestore and the
  // Auth profile, then updates the screen.
  setProfilePhoto: (url: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setAuthRevision] = useState(0);

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
            setPhotoURL(typeof data.photoURL === 'string' && data.photoURL ? data.photoURL : null);
          } else {
            // Signed in and verified, but with no profile document. register()
            // writes one, so this only happens to an account whose document
            // was removed by hand. Treating them as a tenant keeps the app
            // usable rather than leaving them on a screen with no role and no
            // way forward -- a role is read from the document, never granted
            // by it, so this cannot hand anybody admin.
            setRole('tenant');
            setPhotoURL(null);
          }
        } catch {
          // A network or rules failure must not leave the whole app on a blank
          // startup screen. Data requests will still surface their own error.
          setRole(null);
          setPhotoURL(null);
        }
      } else {
        // Nobody is logged in, or the email/password account has not confirmed
        // its email yet. Both states must not inherit an earlier user's role
        // or picture.
        setRole(null);
        setPhotoURL(null);
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

  // Save a profile picture, or clear it by passing null.
  //
  // Written in two places on purpose. Firestore is the record the app reads on
  // every sign-in and the only one the security rules can see. The Auth
  // profile is written as well so that anything which only ever has a
  // firebase User to hand -- a future owner-contact view, an exported account
  // record -- still finds the picture. The Auth write is best-effort: it is a
  // convenience copy, and failing it must not lose a picture that Firestore
  // already accepted.
  async function setProfilePhoto(url: string | null) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You are not signed in.');
    }

    // deleteField() rather than null, so clearing a picture removes the key
    // instead of leaving a null the read path would have to keep allowing for.
    await updateDoc(doc(db, 'users', currentUser.uid), {
      photoURL: url ?? deleteField(),
    });

    await updateProfile(currentUser, { photoURL: url }).catch(() => undefined);

    setPhotoURL(url);
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
    photoURL,
    loading,
    login,
    register,
    resendVerificationEmail,
    refreshUser,
    setProfilePhoto,
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
