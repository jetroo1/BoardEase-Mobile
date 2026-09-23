// One-time script to add sample boarding house listings to Firestore,
// so the app has something to show while testing.
// Run with: node scripts/seedData.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
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

// Sample listings around Tagum City / UM Tagum area, so distance search
// gives realistic results when testing near the school.
const sampleProperties = [
  {
    title: 'Sunrise Boarding House',
    description: 'Cozy rooms near UM Tagum, walking distance to campus.',
    address: 'Visayan Village, Tagum City',
    price: 2500,
    roomType: 'Single',
    amenities: ['WiFi', 'Own CR', 'Aircon'],
    latitude: 7.4485,
    longitude: 125.8085,
    imageUrl: PHOTOS['Sunrise Boarding House'],
    ownerId: 'sample-owner',
    isApproved: true,
  },
  {
    title: 'Greenview Dormitory',
    description: 'Shared rooms with a friendly community, budget-friendly.',
    address: 'Magugpo East, Tagum City',
    price: 1800,
    roomType: 'Shared',
    amenities: ['WiFi', 'Kitchen', 'Laundry'],
    latitude: 7.4470,
    longitude: 125.8050,
    imageUrl: PHOTOS['Greenview Dormitory'],
    ownerId: 'sample-owner',
    isApproved: true,
  },
  {
    title: 'CityStay Rooms',
    description: 'Modern rooms close to the city center and markets.',
    address: 'Magugpo Poblacion, Tagum City',
    price: 3200,
    roomType: 'Single',
    amenities: ['WiFi', 'Own CR', 'Parking', 'Aircon'],
    latitude: 7.4460,
    longitude: 125.8100,
    imageUrl: PHOTOS['CityStay Rooms'],
    ownerId: 'sample-owner',
    isApproved: true,
  },
  {
    title: "Student's Nest",
    description: 'Quiet study-friendly boarding house for students.',
    address: 'Visayan Village, Tagum City',
    price: 2100,
    roomType: 'Shared',
    amenities: ['WiFi', 'Study Area'],
    latitude: 7.4500,
    longitude: 125.8070,
    imageUrl: PHOTOS["Student's Nest"],
    ownerId: 'sample-owner',
    isApproved: true,
  },
];

for (const property of sampleProperties) {
  const docRef = await addDoc(collection(db, 'properties'), {
    ...property,
    createdAt: new Date().toISOString(),
  });
  console.log(`Added "${property.title}" with id ${docRef.id}`);
}

console.log('Done adding sample listings.');
process.exit(0);
