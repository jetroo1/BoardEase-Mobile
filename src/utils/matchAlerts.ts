// Saved filter alerts -- the "Match Alerts" half of our proposal's
// "Save to Favorites with Match Alerts" feature.
//
// How it works, start to finish:
//   1. On the Filter screen the user switches on "Save these filters and
//      alert me". We copy their filters onto their own users/{uid}
//      document, along with alertsEnabled and a lastAlertCheck timestamp.
//   2. Every time the app opens the Home or Notifications screen we look
//      for approved listings created AFTER lastAlertCheck that match those
//      saved filters.
//   3. Each new match becomes a phone notification plus a record in the
//      list on the Notifications screen.
//   4. lastAlertCheck is then moved forward to "now". That single step is
//      what stops the same listing from alerting the user twice.
//
// Why LOCAL notifications (fired when the app opens) instead of real push
// notifications that arrive while the app is closed: real push needs a
// server to send it (Firebase Cloud Functions), and that requires a paid
// Firebase plan -- we are on the free Spark plan. On top of that, Expo Go
// on SDK 57 no longer supports remote push at all. Local notifications are
// free, work in Expo Go, and still demonstrate the feature.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AppNotification, Filters, Property } from '../types';
import { formatDistance, getDistanceInKm } from './distance';

// What we store about alerts on the users/{uid} document.
export interface AlertSettings {
  alertsEnabled: boolean;
  savedFilters: Filters | null; // null = the user has never saved any
}

// ---------------------------------------------------------------------------
// Saving / reading the user's alert settings (Firestore)
// ---------------------------------------------------------------------------

// Reads alertsEnabled + savedFilters off users/{uid}.
// If anything goes wrong (no internet, no user document yet) we just answer
// "alerts are off" instead of throwing, so no screen ever crashes over it.
export async function loadAlertSettings(userId: string): Promise<AlertSettings> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) {
      return { alertsEnabled: false, savedFilters: null };
    }

    const data = userSnap.data();
    return {
      alertsEnabled: data.alertsEnabled === true,
      savedFilters: (data.savedFilters as Filters) || null,
    };
  } catch {
    return { alertsEnabled: false, savedFilters: null };
  }
}

// Switches alerts on and stores the filters the user is currently using.
// We also reset lastAlertCheck to right now, so the user only hears about
// listings posted from this moment on -- not about every listing that was
// already in the database.
export async function saveFilterAlerts(userId: string, filters: Filters): Promise<void> {
  // merge: true means "only touch these fields" -- it leaves email and role
  // on the user document alone instead of overwriting the whole thing.
  await setDoc(
    doc(db, 'users', userId),
    {
      savedFilters: filters,
      alertsEnabled: true,
      lastAlertCheck: Date.now(),
    },
    { merge: true }
  );
}

// Switches alerts off. We keep savedFilters around so the user can turn
// alerts back on later without re-picking everything.
export async function turnOffFilterAlerts(userId: string): Promise<void> {
  await setDoc(doc(db, 'users', userId), { alertsEnabled: false }, { merge: true });
}

// ---------------------------------------------------------------------------
// Finding new matches
// ---------------------------------------------------------------------------

// Does one listing satisfy the saved filters? Same three rules the Search
// screen uses: price cap, room type, and "has all of these amenities".
function matchesSavedFilters(property: Property, filters: Filters): boolean {
  if (filters.maxPrice !== null && property.price > filters.maxPrice) {
    return false;
  }
  if (filters.roomType !== null && property.roomType !== filters.roomType) {
    return false;
  }
  if (filters.amenities.length > 0) {
    const hasAllSelectedAmenities = filters.amenities.every((amenity) =>
      property.amenities.includes(amenity)
    );
    if (!hasAllSelectedAmenities) {
      return false;
    }
  }
  return true;
}

// Returns the approved listings that appeared since the last check AND match
// the user's saved filters, newest first.
export async function findNewMatches(userId: string): Promise<Property[]> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    return [];
  }

  const data = userSnap.data();
  const savedFilters = (data.savedFilters as Filters) || null;
  if (data.alertsEnabled !== true || savedFilters === null) {
    // The user never switched alerts on, so there is nothing to check.
    return [];
  }

  const now = Date.now();
  const lastAlertCheck = typeof data.lastAlertCheck === 'number' ? data.lastAlertCheck : null;

  // No timestamp saved yet (shouldn't normally happen -- we write one when
  // alerts are switched on). Start the clock now rather than announcing
  // every listing that already existed before today.
  if (lastAlertCheck === null) {
    await setDoc(userRef, { lastAlertCheck: now }, { merge: true });
    return [];
  }

  // We ask Firestore only for the approved listings, then do the "is it new?"
  // and "does it match?" work here in plain JavaScript. Asking Firestore to
  // filter on several fields and sort at the same time would need a manually
  // created composite index in the Firebase console, which this project
  // deliberately avoids (the same reason DetailsScreen sorts reviews in JS).
  const approvedQuery = query(collection(db, 'properties'), where('isApproved', '==', true));
  const snapshot = await getDocs(approvedQuery);
  const properties: Property[] = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Property, 'id'>),
  }));

  const newMatches = properties.filter(
    (property) => property.createdAt > lastAlertCheck && matchesSavedFilters(property, savedFilters)
  );
  newMatches.sort((a, b) => b.createdAt - a.createdAt);

  // Move the clock forward. This is the line that guarantees we never alert
  // about the same listing a second time on the next app open.
  await setDoc(userRef, { lastAlertCheck: now }, { merge: true });

  return newMatches;
}

// ---------------------------------------------------------------------------
// Showing the phone notification
// ---------------------------------------------------------------------------

// The phone usually remembers where it was the last time it used GPS. We
// read that cached position instead of asking for a fresh fix, so building
// the alert text is instant and never pops up a location dialog of its own.
// Returns null when we have no location to work with.
async function getLastKnownPoint(): Promise<{ lat: number; lng: number } | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    const position = await Location.getLastKnownPositionAsync();
    if (!position) {
      return null;
    }

    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

// Builds the one-line summary shown in the notification and in the list,
// e.g. "New listing matches your saved filters — ₱2,400 · 600 m".
// If we don't know where the user is we show the room type instead of a
// distance, so the line never ends up half-empty.
function buildAlertMessage(
  property: Property,
  userPoint: { lat: number; lng: number } | null
): string {
  let detail = property.roomType;

  if (userPoint) {
    const distanceKm = getDistanceInKm(
      userPoint.lat,
      userPoint.lng,
      property.latitude,
      property.longitude
    );
    detail = formatDistance(distanceKm);
  }

  return `New listing matches your saved filters — ₱${property.price} · ${detail}`;
}

// ---------------------------------------------------------------------------
// The stored notification list (AsyncStorage, on this phone only)
// ---------------------------------------------------------------------------

// We keep the alert history on the phone with AsyncStorage instead of in
// another Firestore collection: it only matters to this one user on this one
// device, and a local list is far simpler to build and to explain. The key
// includes the user id so two accounts sharing a phone don't see each
// other's alerts.
function storageKey(userId: string): string {
  return `boardease_notifications_${userId}`;
}

export async function loadStoredNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as AppNotification[];
    parsed.sort((a, b) => b.createdAt - a.createdAt); // newest first
    return parsed;
  } catch {
    // Corrupted or unreadable storage -- start from an empty list rather
    // than crashing the Notifications screen.
    return [];
  }
}

export async function saveStoredNotifications(
  userId: string,
  notifications: AppNotification[]
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(notifications));
}

// ---------------------------------------------------------------------------
// The one function the screens call
// ---------------------------------------------------------------------------

// Runs the whole check: find new matches, show a notification for each one,
// store them, and hand back the full up-to-date list (newest first).
export async function runAlertCheck(userId: string): Promise<AppNotification[]> {
  const stored = await loadStoredNotifications(userId);

  try {
    const newMatches = await findNewMatches(userId);
    if (newMatches.length === 0) {
      return stored;
    }

    const userPoint = await getLastKnownPoint();

    const freshNotifications: AppNotification[] = [];
    for (const property of newMatches) {
      const message = buildAlertMessage(property, userPoint);

      freshNotifications.push({
        // The id is built from the listing, so the same listing can only
        // ever produce one row in the list.
        id: `match_${property.id}`,
        propertyId: property.id,
        title: property.title,
        // We use the listing's own createdAt so the list can honestly say
        // "posted 2 hours ago" rather than "just now" every time the check
        // happens to run.
        createdAt: property.createdAt,
        message,
        read: false,
      });
    }

    // Combine the new alerts with the old ones, drop any duplicate ids (a
    // safety net in case the same listing is somehow checked twice), and
    // sort newest first.
    const combined = [...freshNotifications, ...stored];
    const unique = combined.filter(
      (item, index) => combined.findIndex((other) => other.id === item.id) === index
    );
    unique.sort((a, b) => b.createdAt - a.createdAt);

    await saveStoredNotifications(userId, unique);
    return unique;
  } catch {
    // Offline, or Firestore is unreachable. Show whatever we already have
    // saved on the phone instead of failing.
    return stored;
  }
}
