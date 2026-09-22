// Promotes an existing account to admin, so you can demo the admin panel
// (listing verification). The account must already be registered in the app.
//
// Run with: node scripts/makeAdmin.mjs your-email@example.com

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBdngn2pVpZ1Vdt4Da-oz81Kyl_n-ziYF8',
  authDomain: 'boardease-aefc2.firebaseapp.com',
  projectId: 'boardease-aefc2',
  storageBucket: 'boardease-aefc2.firebasestorage.app',
  messagingSenderId: '1060973925533',
  appId: '1:1060973925533:web:a03938bfb7199a890db074',
};

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/makeAdmin.mjs your-email@example.com');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// The app saves { email, role } to users/{uid} when someone registers,
// so we can find the right document by searching for the email.
const usersQuery = query(collection(db, 'users'), where('email', '==', email));
const snapshot = await getDocs(usersQuery);

if (snapshot.empty) {
  console.error(`No account found for "${email}". Register it in the app first.`);
  process.exit(1);
}

for (const userDoc of snapshot.docs) {
  await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
  console.log(`"${email}" is now an admin (uid: ${userDoc.id}).`);
}

console.log('Log out and log back in on the phone for the change to take effect.');
process.exit(0);
