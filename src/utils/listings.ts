// Deleting a listing properly.
//
// deleteDoc on the property alone leaves three things behind, none of which
// are visible from the screen that did the deleting:
//
//   - its reviews, which stay in the reviews collection for ever and show up
//     in the admin panel labelled "Deleted listing";
//   - its photographs, which stay in Cloud Storage and keep counting against
//     the free tier that no longer has anything pointing at them.
//
// So the delete is a cascade, and the order matters: the children go first.
// If the run dies halfway, what is left is a listing whose extras are gone --
// untidy, but still coherent. Deleting the property first and then failing
// would leave orphans with nothing naming them, which nothing can clean up
// afterwards.
//
// Favourites are deliberately NOT cleaned up here. firestore.rules lets each
// person read and delete only their own, which is the right call -- an admin
// has no business reading everybody's saved list -- and so this code could not
// touch them even if it wanted to. It does not need to: FavoritesScreen
// fetches each saved listing and skips the ones that no longer exist, so an
// orphaned favourite is invisible rather than broken, and disappears the next
// time that person unsaves anything.

import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { Property } from '../types';
import { photosOf } from './photos';

export interface DeleteListingResult {
  reviewsDeleted: number;
  photosDeleted: number;
  // Photographs that could not be removed from Storage. Not a failure: the
  // listing is still gone, and a leftover file in a bucket is not something to
  // block an admin over.
  photosLeftBehind: number;
}

export async function deleteListing(property: Property): Promise<DeleteListingResult> {
  const result: DeleteListingResult = {
    reviewsDeleted: 0,
    photosDeleted: 0,
    photosLeftBehind: 0,
  };

  // --- reviews -------------------------------------------------------------
  const reviews = await getDocs(
    query(collection(db, 'reviews'), where('propertyId', '==', property.id))
  );
  for (const reviewDoc of reviews.docs) {
    await deleteDoc(doc(db, 'reviews', reviewDoc.id));
    result.reviewsDeleted += 1;
  }

  // --- photographs ---------------------------------------------------------
  //
  // Public links belong to their original host and are not ours to delete.
  // Firebase download URLs can be cleaned up when Storage is enabled later.
  for (const url of photosOf(property)) {
    if (!url.startsWith('https://firebasestorage.googleapis.com/')) {
      continue;
    }
    try {
      await deleteObject(ref(storage, url));
      result.photosDeleted += 1;
    } catch {
      result.photosLeftBehind += 1;
    }
  }

  // --- the listing itself --------------------------------------------------
  await deleteDoc(doc(db, 'properties', property.id));

  return result;
}
