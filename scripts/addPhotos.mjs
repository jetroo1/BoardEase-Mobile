// Adds photographs to the sample listings that are ALREADY in Firestore.
// Run with: node scripts/addPhotos.mjs
//
// Why this exists instead of just re-running seedData.mjs: that script only
// ever adds. Running it a second time gives you eight listings instead of four,
// which is the warning printed in docs/report/04-setup.md. This one matches on
// title and updates in place, so it is safe to run on a database that already
// has the sample data in it.
//
// It is also safe to run twice: a listing that already has a photo is skipped
// unless you pass --force.
//
//   node scripts/addPhotos.mjs           # fill in blanks only
//   node scripts/addPhotos.mjs --force   # overwrite existing photos too

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { PHOTOS } from './photos.mjs';

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

const force = process.argv.includes('--force');

let updated = 0;
let skipped = 0;
let missing = 0;

for (const [title, imageUrl] of Object.entries(PHOTOS)) {
  const matches = await getDocs(
    query(collection(db, 'properties'), where('title', '==', title))
  );

  if (matches.empty) {
    console.log(`- "${title}" is not in Firestore. Run seedData.mjs first.`);
    missing += 1;
    continue;
  }

  // A title is not a key, so there may be more than one match if the seed
  // script was run twice at some point. Patch every copy rather than guessing
  // which one the app is showing.
  for (const match of matches.docs) {
    const existing = match.data().imageUrl;

    if (existing && !force) {
      console.log(`- "${title}" already has a photo. Skipping (use --force to replace).`);
      skipped += 1;
      continue;
    }

    await updateDoc(doc(db, 'properties', match.id), { imageUrl });
    console.log(`+ "${title}" updated (${match.id})`);
    updated += 1;
  }
}

console.log(
  `\nDone. ${updated} updated, ${skipped} skipped, ${missing} not found in Firestore.`
);

if (missing > 0) {
  console.log('Listings reported as not found are the ones seedData.mjs creates.');
}

process.exit(0);
