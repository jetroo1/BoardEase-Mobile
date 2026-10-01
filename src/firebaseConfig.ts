// This file connects the app to Firebase (Authentication, Firestore, and Storage).
//
// HOW TO SET THIS UP:
// 1. Go to https://console.firebase.google.com and create a project (it's free).
// 2. Inside your project, click the "</>" (web app) icon to register a web app.
// 3. Firebase will show you a config object that looks like the placeholder below.
//    Copy your real values and paste them over the placeholders.
// 4. In the Firebase console, enable:
//      - Authentication -> Sign-in method -> Email/Password
//      - Firestore Database -> Create database (start in test mode for development)
//      - Storage -> Get started
//
// Until you paste your real config in, the app will build and the screens will
// render, but any Firebase call (login, fetching properties, etc.) will fail.

import { initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// PASTE YOUR REAL FIREBASE CONFIG HERE:
const firebaseConfig = {
  apiKey: 'AIzaSyBdngn2pVpZ1Vdt4Da-oz81Kyl_n-ziYF8',
  authDomain: 'boardease-aefc2.firebaseapp.com',
  projectId: 'boardease-aefc2',
  storageBucket: 'boardease-aefc2.firebasestorage.app',
  messagingSenderId: '1060973925533',
  appId: '1:1060973925533:web:a03938bfb7199a890db074',
};

// Start up Firebase using the config above.
const app = initializeApp(firebaseConfig);

// These are the three Firebase services this app uses as its whole backend.
// Any screen that needs to talk to Firebase imports "auth", "db", or "storage"
// from this file instead of setting up its own connection.

// Staying signed in between launches.
//
// getAuth() on its own gives React Native memory persistence: close the app,
// and you are logged out. Firebase says so on every start-up, in a warning
// several paragraphs long. It is not only untidy -- it means the app forgets
// you every time, which is not how any phone application behaves.
//
// getReactNativePersistence exists only in the React Native build of
// firebase/auth, and the package's published types describe the web build, so
// TypeScript does not know about it. Hence the require and the narrow type
// rather than a blanket ts-ignore: the shape asserted here is exactly the one
// used on the next line, and on web the property is simply absent.
const rnAuth = require('firebase/auth') as {
  getReactNativePersistence?: (storage: unknown) => Persistence;
};

function createAuth(): Auth {
  // Web has its own persistence and needs none of this.
  if (!rnAuth.getReactNativePersistence) {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if auth has already been initialised for this
    // app -- which happens when Fast Refresh re-runs this module. The
    // instance that already exists is the configured one, so use it.
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
