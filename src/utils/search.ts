// Matching a typed word against listings.
//
// Shared by the search field on Home, which shows suggestions as you type, and
// by the Search screen, which filters its whole list. They have to agree:
// typing "la" and tapping "See all results" must not produce a different set
// from the suggestions it was just showing.
//
// Not a "contains" match. Somebody typing "la" means a place whose name begins
// with "la", not every listing with those letters buried mid-word -- "Villa"
// should not outrank "La Garbosa". So matches are ranked by where they landed:
// the start of the name first, then the start of any word in it, then the
// address, and only then a loose match anywhere. A loose match is kept rather
// than discarded, because somebody who types the middle of a name should still
// find it; it just sorts below the obvious answers.

import { Property } from '../types';

// Lower is a better match. Infinity means no match at all.
export function rankListing(property: Property, needle: string): number {
  const term = needle.trim().toLowerCase();
  if (term === '') {
    return Number.POSITIVE_INFINITY;
  }

  const title = (property.title ?? '').toLowerCase();
  const address = (property.address ?? '').toLowerCase();
  const roomType = (property.roomType ?? '').toLowerCase();

  if (title.startsWith(term)) return 0;
  if (title.split(/\s+/).some((word) => word.startsWith(term))) return 1;
  if (address.split(/\s+/).some((word) => word.startsWith(term))) return 2;
  // Room type last among the ordered matches: "studio" is a useful thing to
  // type, but a place actually named "Studio something" should come first.
  if (roomType.startsWith(term)) return 3;
  if (title.includes(term)) return 4;
  if (address.includes(term)) return 5;
  return Number.POSITIVE_INFINITY;
}

// The matching listings, best first. An empty term returns everything
// unchanged, so a caller can hand its whole list through this without
// special-casing "nothing typed yet".
export function searchListings<T extends Property>(listings: T[], needle: string): T[] {
  if (needle.trim() === '') {
    return listings;
  }
  return listings
    .map((property) => ({ property, rank: rankListing(property, needle) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => (a.rank - b.rank) || a.property.title.localeCompare(b.property.title))
    .map((entry) => entry.property);
}
