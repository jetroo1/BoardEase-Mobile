// Where a listing's photographs are stored.
//
// Not Firebase Storage, which the rest of the backend would have suggested.
// Enabling Storage on a Firebase project now requires the Blaze plan, and
// Blaze requires a credit card on file even though the first 5 GB cost
// nothing. That is not a reasonable thing to ask of a student project, and the
// 404 the bucket returned was the only symptom -- the upload code was correct
// the whole time and still failed, because there was nowhere to put anything.
//
// Cloudinary's free tier needs no card, and an unsigned upload preset lets the
// phone post straight to it. What comes back is an ordinary https URL, which
// is exactly what the listing already stores, so nothing downstream changed:
// the gallery, the cards, the map popups and the offline cache all keep
// reading the same field.
//
// On the preset being unsigned: the alternative is signing each upload, which
// needs the API secret, which would then have to ship inside the app where
// anybody can read it. An unsigned preset is the lesser exposure -- the worst
// it allows is an unwanted upload to this one account, and it can be revoked
// from the Cloudinary console without touching the app.

import { File } from 'expo-file-system';

// Neither value is secret. The cloud name appears in every delivered image URL
// and the preset name is designed to sit in client applications.
const CLOUD_NAME = 'bo25vkvx';
const UPLOAD_PRESET = 'BoardEase';

const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export async function uploadListingPhoto(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
  // Checked before the upload rather than after it, so an empty or missing
  // file is reported as itself instead of as a Cloudinary error.
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('That photo is no longer on this phone.');
  }
  if (file.size === 0) {
    throw new Error('That photo appears to be empty.');
  }

  // Posted as a file descriptor, not as a Blob.
  //
  // fetch(uri).blob() is the obvious way and it does not work on a phone:
  // React Native's Blob holds a reference to native data rather than the data
  // itself, so what gets posted is empty. That is what broke the Firebase
  // upload, and the same trap is here. React Native's FormData understands
  // { uri, name, type } and streams the file itself.
  const form = new FormData();
  // React Native's FormData takes a file descriptor rather than a Blob, and
  // this shape -- uri, name, type -- is what it understands.
  form.append('file', {
    uri: localUri,
    name: `listing-${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
    type: mimeType,
  } as unknown as Blob);
  form.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(ENDPOINT, { method: 'POST', body: form });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.secure_url) {
    // Cloudinary explains itself properly, so pass that along rather than
    // replacing it with a guess. "Upload preset must be whitelisted for
    // unsigned uploads" tells you exactly which switch to flip; "upload
    // failed" does not.
    const reason = result?.error?.message || `HTTP ${response.status}`;
    throw new Error(reason);
  }

  return result.secure_url as string;
}
