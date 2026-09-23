// This file has ONE job: figure out how far apart two GPS points are.
//
// The Earth is a sphere (roughly), so we can't just subtract latitude and
// longitude like normal numbers -- 1 degree of longitude is a different real
// distance near the equator than it is near the poles. The "Haversine
// formula" is the standard math formula for finding the straight-line
// distance between two GPS points on a sphere, and it is what we use below.
//
// You do not need to memorize the formula. Just know what it does:
// it takes two (latitude, longitude) points and returns the distance
// between them in kilometers.

// Small helper: converts an angle from degrees to radians.
// The Haversine formula's math (sin, cos) works in radians, not degrees.
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

const EARTH_RADIUS_KM = 6371; // average radius of the Earth

export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Step 1: find the difference in latitude and longitude, in radians.
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Step 2: this is the Haversine formula itself. "a" represents the
  // square of half the straight-line (chord) distance between the points.
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  // Step 3: "c" is the angular distance in radians.
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Step 4: multiply by the Earth's radius to turn the angle into a
  // real-world distance in kilometers.
  const distanceKm = EARTH_RADIUS_KM * c;

  return distanceKm;
}

// Small helper used by the UI to show a friendly distance string,
// e.g. "350 m" for anything under 1 km, otherwise "2.3 km".
export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return 'Distance unavailable';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
