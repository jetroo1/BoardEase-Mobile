// AuthContext keeps track of "who is logged in" for the whole app.
//
// Instead of every screen asking Firebase directly "who is the user right
// now?", we check once here and share the answer with every screen through
// React Context. Screens read it with the useAuth() hook at the bottom
// of this file.

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { clearOfflineCache } from '../utils/offlineCache';
import { UserRole } from '../types';

// This describes everything a screen can read or call through useAuth().
interface AuthContextType {
  user: User | null; // the raw Firebase Auth user object (or null if logged out)
  role: UserRole | null; // 'tenant' or 'admin', loaded from Firestore
  loading: boolean; // true while we are still checking login state on startup
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    // onAuthStateChanged is a Firebase "listener": it fires once right away
    // with whoever is currently logged in (or null), and then fires again
    // automatically every time someone logs in or logs out.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // A user is logged in. Look up their role from Firestore, in the
        // "users" collection, using their unique id (uid) as the document id.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setRole((data.role as UserRole) || 'tenant');
        } else {
          // No users/{uid} doc yet (shouldn't normally happen, but just in
          // case) -- treat them as a regular tenant.
          setRole('tenant');
        }
      } else {
        // Nobody is logged in.
        setRole(null);
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
    await setDoc(doc(db, 'users', result.user.uid), {
      email,
      role: 'tenant',
    });
  }

  async function logout() {
    // Drop this account's cached favorites and recently-viewed listings
    // first, so the next person to log in on this phone does not see them.
    if (user) {
      await clearOfflineCache(user.uid);
    }

    await firebaseSignOut(auth);
  }

  const value: AuthContextType = { user, role, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
