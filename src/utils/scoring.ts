// "Smart Filter & Recommendation" -- this is the proposal's requirement to
// rank listings instead of just filtering them out. We give every property
// a match score out of 100, made of 3 simple parts:
//   - how close it is           (up to 40 points)
//   - whether it fits the budget (up to 30 points)
//   - how many wanted amenities it has (up to 30 points)
// The property with the highest score is the "best match" for the user.

import { Filters, PropertyWithDistance } from '../types';

// Closer properties score higher. Anything at or past the cutoff gets 0
// points for this part; anything right next to the user gets close to 40.
//
// Why 3 km: our study area is roughly 2 km around UM Tagum College, and
// students walk to campus. With a larger cutoff (say 10 km) a 300 m place
// and a 1.5 km place would score almost the same, which defeats the point
// of ranking by distance at all.
function scoreDistance(distanceKm: number): number {
  const MAX_USEFUL_DISTANCE_KM = 3;
  const closeness = 1 - Math.min(distanceKm / MAX_USEFUL_DISTANCE_KM, 1);
  return closeness * 40;
}

// If the user set a max budget, full points only if the property is at or
// under that price. If they didn't set a budget, this part is neutral
// (everyone gets full points) so it doesn't skew the ranking.
function scorePrice(price: number, maxPrice: number | null): number {
  if (maxPrice === null) return 30;
  return price <= maxPrice ? 30 : 0;
}

// Points scale with how many of the *selected* amenities the property has.
// If the user didn't pick any amenities, this part is also neutral.
function scoreAmenities(propertyAmenities: string[], wantedAmenities: string[]): number {
  if (wantedAmenities.length === 0) return 30;
  const matchedCount = wantedAmenities.filter((wanted) =>
    propertyAmenities.includes(wanted)
  ).length;
  return (matchedCount / wantedAmenities.length) * 30;
}

// Adds a "matchScore" (0-100) to each property based on the current filters.
export function scoreProperties(
  properties: PropertyWithDistance[],
  filters: Filters
): (PropertyWithDistance & { matchScore: number })[] {
  return properties.map((property) => {
    const matchScore =
      scoreDistance(property.distanceKm) +
      scorePrice(property.price, filters.maxPrice) +
      scoreAmenities(property.amenities, filters.amenities);

    return { ...property, matchScore: Math.round(matchScore) };
  });
}
