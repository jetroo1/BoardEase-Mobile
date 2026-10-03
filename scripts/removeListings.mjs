// Removes listings by title, signed in as an admin.
//
// This exists to clear out the four invented samples that seedData.mjs wrote
// while the project was still a prototype -- Sunrise, Greenview, CityStay and
// Student's Nest. Now that the real boarding houses are in, those four are
// the only things in the app that are not a real place, and a demo that shows
// made-up listings alongside real ones is worse than no demo at all.
//
// It mirrors deleteListing() in src/utils/listings.ts: the reviews go first,
// then the listing. If the run dies halfway, what is left is a listing whose
// reviews are gone -- untidy, but still coherent. Deleting the property first
// and then failing would leave reviews with nothing naming them.
//
// Credentials are read from the environment, never the command line, so they
// do not end up in the shell history.
//
// Usage (PowerShell):
//
//   $env:BOARDEASE_EMAIL    = "boardeaseadmin@gmail.com"
//   $env:BOARDEASE_PASSWORD = "..."
//   node scripts/removeListings.mjs --dry-run     # see what would go
//   node scripts/removeListings.mjs               # actually delete
//
// With no titles given it removes the four seeded samples. To remove
// something else, name it:
//
//   node scripts/removeListings.mjs "Some Other Listing"
//
// Titles must match exactly, which is deliberate: a fuzzy match on a script
// that deletes things is a way to lose a real listing to a typo.

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  deleteDoc,
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

// The four samples seedData.mjs writes.
const SEEDED_SAMPLES = [
  'Sunrise Boarding House',
  'Greenview Dormitory',
  'CityStay Rooms',
  "Student's Nest",
];

const email = process.env.BOARDEASE_EMAIL;
const password = process.env.BOARDEASE_PASSWORD;
const dryRun = process.argv.includes('--dry-run');
const named = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const titles = named.length > 0 ? named : SEEDED_SAMPLES;

if (!email || !password) {
  console.error('Set BOARDEASE_EMAIL and BOARDEASE_PASSWORD first. See the top of this file.');
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
// refused on the first delete with a bare "permission denied". Saying so here
// is clearer than letting that happen.
const me = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
const role = me.empty ? null : me.docs[0].data().role;
if (role !== 'admin') {
  console.error(`${email} has role "${role ?? 'none'}", not admin. Only an admin may remove listings.`);
  process.exit(1);
}

if (dryRun) {
  console.log('Dry run. Nothing will be deleted.\n');
}

let removed = 0;
let reviewsRemoved = 0;
let missing = 0;

for (const title of titles) {
  const matches = await getDocs(
    query(collection(db, 'properties'), where('title', '==', title))
  );

  if (matches.empty) {
    console.log(`- "${title}" is not there. Nothing to do.`);
    missing += 1;
    continue;
  }

  for (const match of matches.docs) {
    const reviews = await getDocs(
      query(collection(db, 'reviews'), where('propertyId', '==', match.id))
    );

    if (dryRun) {
      console.log(`x "${title}" (${match.id}) and its ${reviews.size} review(s) would go`);
      removed += 1;
      reviewsRemoved += reviews.size;
      continue;
    }

    // Children first. See the note at the top.
    for (const reviewDoc of reviews.docs) {
      await deleteDoc(doc(db, 'reviews', reviewDoc.id));
      reviewsRemoved += 1;
    }
    await deleteDoc(doc(db, 'properties', match.id));
    console.log(`x "${title}" removed (${match.id}), ${reviews.size} review(s) with it`);
    removed += 1;
  }
}

// Photographs are left alone on purpose. The seeded samples point at public
// stock images that belong to their original host and are not ours to delete,
// and the real listings' photographs live on Cloudinary, which this script has
// no credentials for.
const verb = dryRun ? 'would be removed' : 'removed';
console.log(`\nDone. ${removed} listing(s) ${verb}, ${reviewsRemoved} review(s) with them, ${missing} not found.`);
process.exit(0);
