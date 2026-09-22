// Maintenance script for the sample listings.
//  - createdAt was saved as a text date, but the app expects a number
//    (milliseconds), so we convert it.
//  - adds a placeholder photo to any listing that has none, so the app
//    doesn't show "No Photo" everywhere during the demo.
//
// Run with: node scripts/fixSampleData.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBdngn2pVpZ1Vdt4Da-oz81Kyl_n-ziYF8',
  authDomain: 'boardease-aefc2.firebaseapp.com',
  projectId: 'boardease-aefc2',
  storageBucket: 'boardease-aefc2.firebasestorage.app',
  messagingSenderId: '1060973925533',
  appId: '1:1060973925533:web:a03938bfb7199a890db074',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snapshot = await getDocs(collection(db, 'properties'));

for (const propertyDoc of snapshot.docs) {
  const data = propertyDoc.data();
  const updates = {};

  // Convert a text date like "2026-09-10T07:43:04.377Z" into a number.
  if (typeof data.createdAt === 'string') {
    updates.createdAt = new Date(data.createdAt).getTime();
  }
  if (data.createdAt === undefined) {
    updates.createdAt = Date.now();
  }

  // Give listings without a photo a placeholder image.
  if (!data.imageUrl) {
    const seed = encodeURIComponent(data.title || propertyDoc.id);
    updates.imageUrl = `https://picsum.photos/seed/${seed}/600/400`;
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'properties', propertyDoc.id), updates);
    console.log(`Updated "${data.title}":`, updates);
  }
}

console.log('Done.');
process.exit(0);
