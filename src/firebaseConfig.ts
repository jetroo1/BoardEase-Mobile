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
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
//
// Note: with this basic setup, a logged-in user is remembered only while the
// app is open (closing the app fully will require logging in again). That is
// fine for this school project; making the login "stick" across app restarts
// needs extra persistence setup that is not required here.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
