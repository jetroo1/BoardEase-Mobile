// Turn-by-turn directions.
//
// Drawing a straight line between two points is easy, but it isn't real
// navigation -- it ignores roads. To get a route that actually follows
// streets, we ask a free routing service called OSRM (Open Source Routing
// Machine). It needs no account and no API key.
//
// We send it "start point, end point" and it sends back:
//   - the shape of the route (a long list of points along the roads)
//   - a list of steps, like "turn right onto Rizal Street"

import { RouteStep } from '../components/LeafletMap';

export interface WalkingRoute {
  // Every point along the route, as [latitude, longitude] pairs, ready to
  // hand straight to Leaflet to draw as a line.
  line: [number, number][];
  steps: RouteStep[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

// Turns OSRM's robot-ish instructions into a readable sentence.
// OSRM tells us a "type" (turn, depart, arrive...) and a "modifier"
// (left, right, slight left...), plus the street name.
function buildInstruction(maneuver: any, streetName: string): string {
  const type = maneuver.type as string;
  const modifier = maneuver.modifier as string | undefined;
  const road = streetName ? ` onto ${streetName}` : '';

  if (type === 'depart') {
    return streetName ? `Head out along ${streetName}` : 'Start walking';
  }
  if (type === 'arrive') {
    return 'Arrive at the boarding house';
  }
  if (type === 'roundabout' || type === 'rotary') {
    return `Take the roundabout${road}`;
  }
  if (modifier === 'straight' || !modifier) {
    return `Continue straight${road}`;
  }
  // e.g. "Turn slight left onto Rizal Street"
  return `Turn ${modifier}${road}`;
}

// Asks OSRM for a walking route between two points.
// Returns null if the service can't be reached or has no route.
export async function fetchWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<WalkingRoute | null> {
  // Note the order: OSRM expects longitude first, then latitude.
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    return null;
  }

  const route = data.routes[0];

  // OSRM gives coordinates as [longitude, latitude], but Leaflet wants
  // [latitude, longitude], so we swap each pair around.
  const line: [number, number][] = route.geometry.coordinates.map(
    (point: [number, number]) => [point[1], point[0]]
  );

  const steps: RouteStep[] = (route.legs[0]?.steps || []).map((step: any) => ({
    instruction: buildInstruction(step.maneuver, step.name),
    distanceMeters: step.distance,
  }));

  return {
    line,
    steps,
    totalDistanceMeters: route.distance,
    totalDurationSeconds: route.duration,
  };
}

// "450 m" or "1.2 km"
export function formatMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// "8 min" -- rounded up, minimum 1.
export function formatMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}
