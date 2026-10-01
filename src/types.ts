// Shared TypeScript types used across the app.
// Keeping them in one file makes it easy to see the whole "shape" of our data.

// A boarding house listing, stored in the Firestore "properties" collection.
export interface Property {
  id: string; // Firestore document id
  title: string;
  description: string;
  address: string;
  price: number;
  roomType: string; // e.g. "Single", "Shared", "Studio"
  amenities: string[]; // e.g. ["WiFi", "CR", "Parking"]
  latitude: number;
  longitude: number;
  // The cover photo -- the one on the card, the map marker's popup and the top
  // of the details screen.
  imageUrl: string;
  // Every photo of the place, cover first: the room, the CR, the kitchen, the
  // frontage. Optional because every listing created before galleries existed
  // has only imageUrl, and those must keep working rather than showing an
  // empty gallery. Read it through photosOf() in src/utils/photos.ts, which
  // falls back to imageUrl, instead of touching this field directly.
  images?: string[];
  ownerId: string;
  isApproved: boolean;
  createdAt: number; // stored as a timestamp (milliseconds)
}

// A property that also carries the distance from the user, in kilometers.
// We use this after we run the Haversine calculation in distance.ts.
export interface PropertyWithDistance extends Property {
  distanceKm: number;
}

// A review left by a tenant, stored in the "reviews" collection.
export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  body: string;
  createdAt: number;
}

// A favorite record, stored in the "favorites" collection.
export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: number;
}

// One saved "match alert": a listing that matched the filters the user
// saved on the Filter screen. Kept on the phone with AsyncStorage rather
// than in Firestore -- see src/utils/matchAlerts.ts for why.
export interface AppNotification {
  id: string;
  propertyId: string; // which listing to open when the user taps the alert
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
}

// The role saved on the users/{uid} document.
export type UserRole = 'tenant' | 'admin';

// The choices a user makes on the Filter screen. `null` / empty means
// "no filter applied for this field".
export interface Filters {
  maxPrice: number | null;
  roomType: string | null;
  amenities: string[];
}

// The filter values we start with when nothing has been chosen yet.
export const EMPTY_FILTERS: Filters = {
  maxPrice: null,
  roomType: null,
  amenities: [],
};
