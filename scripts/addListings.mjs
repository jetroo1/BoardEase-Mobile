// Adds real boarding houses in bulk, signed in as an admin.
//
// Why this exists alongside seedData.mjs: that script writes four invented
// sample listings and does it unauthenticated, which only worked while the
// project was still in test mode. The security rules now say what they always
// meant -- only a signed-in admin may create a listing -- so anything writing
// to properties has to log in first, exactly as the app does.
//
// The password is never stored here and never passed on the command line,
// where it would end up in the shell history. It is read from the
// environment, so whoever runs the script is the only one who sees it.
//
// Usage (PowerShell):
//
//   $env:BOARDEASE_EMAIL    = "boardeaseadmin@gmail.com"
//   $env:BOARDEASE_PASSWORD = "..."
//   node scripts/addListings.mjs scripts/listings.json
//
// The JSON file is an array of listings. Only title, address, price,
// latitude and longitude are required:
//
//   [
//     {
//       "title": "Name of the boarding house",
//       "address": "Purok, Barangay, Tagum City",
//       "price": 2500,
//       "roomType": "Single",
//       "amenities": ["WiFi", "CR"],
//       "latitude": 7.4485,
//       "longitude": 125.8085,
//       "description": "What it is like to live there.",
//       "images": []
//     }
//   ]
//
// Running it twice does not duplicate anything: a listing whose title already
// exists is skipped unless --force is passed, in which case it is updated in
// place.

import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  addDoc,
  updateDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBdngn2pVpZ1Vdt4Da-oz81Kyl_n-ziYF8',
  authDomain: 'boardease-aefc2.firebaseapp.com',
  projectId: 'boardease-aefc2',
  storageBucket: 'boardease-aefc2.firebasestorage.app',
  messagingSenderId: '1060973925533',
  appId: '1:1060973925533:web:a03938bfb7199a890db074',
};

const email = process.env.BOARDEASE_EMAIL;
const password = process.env.BOARDEASE_PASSWORD;
const file = process.argv[2];
const force = process.argv.includes('--force');

if (!email || !password) {
  console.error('Set BOARDEASE_EMAIL and BOARDEASE_PASSWORD first. See the top of this file.');
  process.exit(1);
}
if (!file) {
  console.error('Usage: node scripts/addListings.mjs <listings.json> [--force]');
  process.exit(1);
}

const listings = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(listings)) {
  console.error('That file should contain an array of listings.');
  process.exit(1);
}

// Checked here rather than letting Firestore reject a half-written batch, so a
// typo in one entry does not leave some listings created and the rest not.
const problems = [];
listings.forEach((item, index) => {
  const where_ = `entry ${index + 1}${item.title ? ` ("${item.title}")` : ''}`;
  if (!item.title) problems.push(`${where_}: no title`);
  if (!item.address) problems.push(`${where_}: no address`);
  if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) {
    problems.push(`${where_}: price must be a number above zero`);
  }
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) problems.push(`${where_}: latitude out of range`);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) problems.push(`${where_}: longitude out of range`);
});
if (problems.length > 0) {
  console.error('Nothing was written. Fix these first:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let credential;
try {
  credential = await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  console.error(`Could not sign in as ${email}: ${error.code || error.message}`);
  process.exit(1);
}

// The rules read the role from the user document, so a non-admin would be
// refused on the first write with a bare "permission denied". Saying so here
// is clearer than letting that happen.
const me = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
const role = me.empty ? null : me.docs[0].data().role;
if (role !== 'admin') {
  console.error(`${email} has role "${role ?? 'none'}", not admin. Only an admin may add listings.`);
  process.exit(1);
}

let added = 0;
let updated = 0;
let skipped = 0;

for (const item of listings) {
  const fields = {
    title: String(item.title).trim(),
    description: String(item.description ?? '').trim(),
    address: String(item.address).trim(),
    price: Number(item.price),
    roomType: item.roomType || 'Single',
    amenities: Array.isArray(item.amenities) ? item.amenities : [],
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    images: Array.isArray(item.images) ? item.images : [],
    imageUrl: (Array.isArray(item.images) && item.images[0]) || item.imageUrl || '',
  };

  const existing = await getDocs(
    query(collection(db, 'properties'), where('title', '==', fields.title))
  );

  if (!existing.empty) {
    if (!force) {
      console.log(`- "${fields.title}" already exists. Skipped (use --force to update).`);
      skipped += 1;
      continue;
    }
    for (const match of existing.docs) {
      await updateDoc(doc(db, 'properties', match.id), fields);
      console.log(`~ "${fields.title}" updated (${match.id})`);
      updated += 1;
    }
    continue;
  }

  const created = await addDoc(collection(db, 'properties'), {
    ...fields,
    ownerId: credential.user.uid,
    // Added by an admin, so it is live immediately -- the same decision the
    // Add listing screen makes.
    isApproved: true,
    createdAt: Date.now(),
  });
  console.log(`+ "${fields.title}" added (${created.id})`);
  added += 1;
}

console.log(`\nDone. ${added} added, ${updated} updated, ${skipped} skipped.`);
process.exit(0);
