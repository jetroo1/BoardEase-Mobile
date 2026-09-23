// Saving a listing to "My shortlist".
//
// The favorites collection stores only { userId, propertyId, createdAt } --
// the listing itself is not copied, so a price change is never stale.
//
// This lives in one file because three screens need it (Search, Details and
// Favorites) and the rule "one favourite row per user per property" has to be
// enforced the same way in all of them. It used to exist only inside
// DetailsScreen, which is why the Search screen could not save anything.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// propertyId -> the id of the favourites document that records it.
// We need the document id to delete the row again, so a plain Set of property
// ids would not be enough.
export type FavoriteMap = Record<string, string>;

export async function loadFavoriteMap(userId: string): Promise<FavoriteMap> {
  const snapshot = await getDocs(
    query(collection(db, 'favorites'), where('userId', '==', userId))
  );

  const map: FavoriteMap = {};
  snapshot.docs.forEach((favoriteDoc) => {
    const propertyId = favoriteDoc.data().propertyId as string;
    // If duplicates somehow exist, the last one wins -- the extra row is
    // harmless and gets cleaned up the next time the user unfavourites.
    map[propertyId] = favoriteDoc.id;
  });
  return map;
}

export async function addFavorite(userId: string, propertyId: string): Promise<string> {
  const created = await addDoc(collection(db, 'favorites'), {
    userId,
    propertyId,
    createdAt: Date.now(),
  });
  return created.id;
}

export async function removeFavorite(favoriteDocId: string): Promise<void> {
  await deleteDoc(doc(db, 'favorites', favoriteDocId));
}
