import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';

const photoUrl = 'https://res.cloudinary.com/bo25vkvx/image/upload/v1790847163/FRONT_PAGE_BH.png';
const title = 'La Garbosa Apt';
const email = process.env.BOARDEASE_EMAIL;
const password = process.env.BOARDEASE_PASSWORD;

if (!email || !password) {
  console.error('Set BOARDEASE_EMAIL and BOARDEASE_PASSWORD in this terminal first.');
  process.exit(1);
}

const app = initializeApp({
  apiKey: 'AIzaSyBdngn2pVpZ1Vdt4Da-oz81Kyl_n-ziYF8',
  authDomain: 'boardease-aefc2.firebaseapp.com',
  projectId: 'boardease-aefc2',
  appId: '1:1060973925533:web:a03938bfb7199a890db074',
});
const auth = getAuth(app);
const db = getFirestore(app);

try {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.getIdToken(true);

  const profile = await getDoc(doc(db, 'users', credential.user.uid));
  if (profile.data()?.role !== 'admin') {
    throw new Error('This account is not a BoardEase admin. Nothing was changed.');
  }

  const matches = await getDocs(query(collection(db, 'properties'), where('title', '==', title)));
  if (matches.size !== 1) {
    throw new Error(`Expected one "${title}" listing; found ${matches.size}. Nothing was changed.`);
  }

  const reference = matches.docs[0].ref;
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data();
    if (!data) throw new Error('The listing disappeared. Nothing was changed.');

    const previous = Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : (data.imageUrl ? [data.imageUrl] : []);
    const images = [photoUrl, ...previous.filter((url) => typeof url === 'string' && url !== photoUrl)]
      .slice(0, 6);
    transaction.update(reference, { images, imageUrl: photoUrl });
  });

  const saved = await getDoc(reference);
  if (saved.data()?.imageUrl !== photoUrl || saved.data()?.images?.[0] !== photoUrl) {
    throw new Error('The write was not verified. Check the listing in Firebase.');
  }
  console.log(`Linked and verified ${title} (${reference.id}): ${photoUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await auth.signOut();
}
