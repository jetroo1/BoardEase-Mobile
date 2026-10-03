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

export async function uploadPhoto(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
  // Checked before the upload rather than after it, so an empty or missing
  // file is reported as itself instead of as a Cloudinary error.
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('That photo is no longer on this phone.');
  }
  if (file.size === 0) {
    throw new Error('That photo appears to be empty.');
  }

  // Sent as a base64 data URI in an ordinary form-encoded body.
  //
  // Two other ways were tried and neither survives React Native:
  //
  //   fetch(uri).blob() -- React Native's Blob holds a reference to native
  //   data rather than the data itself, so the request body comes out empty.
  //   That is what broke the Firebase upload.
  //
  //   FormData.append('file', { uri, name, type }) -- the long-standing React
  //   Native idiom, and as of 0.86 its fetch rejects it outright with
  //   "Unsupported FormDataPart implementation". The descriptor form is gone.
  //
  // Base64 avoids both: it is a plain string, so nothing has to understand a
  // file handle, and Cloudinary documents `file` as accepting a data URI. It
  // costs about a third more bytes on the wire than a binary upload, which on
  // a photo already compressed to quality 0.8 is a fair trade for an upload
  // path that cannot break on the next React Native release.
  const base64 = await file.base64();

  const body = new URLSearchParams({
    file: `data:${mimeType};base64,${base64}`,
    upload_preset: UPLOAD_PRESET,
  });

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
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

// Listing photographs and profile pictures go to the same place by the same
// route. They are named apart only so a call site reads as what it is, and so
// that if one of them ever needs its own preset or folder, the change has a
// seam to happen at.
export const uploadListingPhoto = uploadPhoto;
export const uploadProfilePhoto = uploadPhoto;
