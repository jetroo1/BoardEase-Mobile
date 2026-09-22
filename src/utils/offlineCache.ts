// Offline cache -- the "Device/Local Storage" item in section 9 of the
// proposal: "caching favorites and recently viewed listings for offline
// access."
//
// The idea is simple. Every time a screen successfully loads something from
// Firestore, it also writes a copy here with AsyncStorage. If the phone is
// later offline and Firestore cannot be reached, the screen reads that copy
// instead of showing an error or an empty list.
//
// This is a cache, not a database. It is always a copy of something that
// already lives in Firestore, it is only ever read when the network fails,
// and throwing it away loses nothing. That is why every function here
// swallows its own errors -- a cache that fails should be invisible, never
// a crash.
//
// The keys include the user id so two accounts sharing one phone never see
// each other's favorites, the same way the alert history works in
// matchAlerts.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property } from '../types';

// How many listings we keep in the recently-viewed list. Five is enough to
// be useful on the Home screen without the stored string growing forever.
const RECENTLY_VIEWED_LIMIT = 5;

function favoritesKey(userId: string): string {
  return `boardease_favorites_${userId}`;
}

function recentlyViewedKey(userId: string): string {
  return `boardease_recent_${userId}`;
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

// Called by the Favorites screen after a successful Firestore load, so there
// is always a fresh copy on the phone to fall back to.
export async function cacheFavorites<T extends Property>(
  userId: string,
  favorites: T[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(favoritesKey(userId), JSON.stringify(favorites));
  } catch {
    // Storage full or unavailable. The screen already has its data from
    // Firestore, so there is nothing to recover from here.
  }
}

// Called only when the Firestore load fails. Returns an empty list if the
// user has never loaded their favorites on this phone while online.
export async function loadCachedFavorites<T extends Property>(userId: string): Promise<T[]> {
  try {
    const stored = await AsyncStorage.getItem(favoritesKey(userId));
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as T[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Recently viewed
// ---------------------------------------------------------------------------

// Called by the Details screen every time a listing is opened. The listing
// moves to the front of the list; if it was already in there, the old entry
// is dropped first so it is not listed twice.
export async function recordRecentlyViewed(userId: string, property: Property): Promise<void> {
  try {
    const existing = await loadRecentlyViewed(userId);
    const withoutThisOne = existing.filter((item) => item.id !== property.id);
    const updated = [property, ...withoutThisOne].slice(0, RECENTLY_VIEWED_LIMIT);
    await AsyncStorage.setItem(recentlyViewedKey(userId), JSON.stringify(updated));
  } catch {
    // Viewing a listing must never fail because of the cache.
  }
}

// Newest first. This one is read whether or not the phone is online -- the
// whole list lives on the device, so there is no Firestore version of it.
export async function loadRecentlyViewed(userId: string): Promise<Property[]> {
  try {
    const stored = await AsyncStorage.getItem(recentlyViewedKey(userId));
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as Property[];
  } catch {
    return [];
  }
}

// Used on logout so the next person to log in on this phone does not see
// the previous account's cached listings.
export async function clearOfflineCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([favoritesKey(userId), recentlyViewedKey(userId)]);
  } catch {
    // Nothing to do -- worst case the cache is overwritten on next use.
  }
}
