// One place that answers "what pictures does this listing have?".
//
// There are two shapes in the database and there always will be. Listings made
// before galleries existed carry a single imageUrl; ones made since carry an
// images array with the cover first. Rather than make every screen check both
// -- and get it subtly wrong somewhere -- everything asks here.
//
// The rules, in order:
//   - an images array with anything in it wins, and its first entry is the
//     cover;
//   - otherwise a lone imageUrl is a gallery of one;
//   - otherwise there are no photographs, and the caller shows a placeholder.
//
// Blank strings are dropped throughout. An empty imageUrl is how "no photo"
// has always been stored, and an empty entry in the middle of an array would
// otherwise render as a broken image in the gallery.

import { Property } from '../types';

type PhotoSource = Pick<Property, 'imageUrl'> & { images?: string[] };

export function photosOf(property: PhotoSource): string[] {
  const gallery = (property.images ?? []).filter((url) => typeof url === 'string' && url !== '');
  if (gallery.length > 0) {
    return gallery;
  }
  return property.imageUrl ? [property.imageUrl] : [];
}

// The single photo to show where there is only room for one.
export function coverOf(property: PhotoSource): string {
  return photosOf(property)[0] ?? '';
}
