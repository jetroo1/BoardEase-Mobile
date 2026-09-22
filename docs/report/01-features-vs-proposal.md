# Features vs. Proposal

Traces every commitment in *"BoardEase: A Mobile Application Guide for Finding,
Comparing, and Navigating to Boarding Houses"* to the code that delivers it.

Verified against the source on 22 September 2026. Paths are relative to the
project root.

---

## 1. Specific Objectives

| # | Objective | Where it lives | Status |
|---|---|---|---|
| 1 | Search boarding houses based on the user's current location | [`src/screens/SearchScreen.tsx`](../../src/screens/SearchScreen.tsx) + [`src/utils/distance.ts`](../../src/utils/distance.ts) | **Done** — `expo-location` reads GPS, Haversine formula computes distance, results sort nearest-first |
| 2 | Comparison tool that automatically ranks listings by price, distance, amenities | [`src/utils/scoring.ts`](../../src/utils/scoring.ts) + [`src/screens/CompareScreen.tsx`](../../src/screens/CompareScreen.tsx) | **Done** — every listing gets a match score; Search defaults to "Recommended" order |
| 3 | Map-based navigation guidance | [`src/screens/NavigationScreen.tsx`](../../src/screens/NavigationScreen.tsx) + [`src/utils/routing.ts`](../../src/utils/routing.ts) | **Done** — real walking route from OSRM, drawn on the map with turn-by-turn steps below |
| 4 | Rating and review aggregation | [`src/screens/ReviewsScreen.tsx`](../../src/screens/ReviewsScreen.tsx) | **Done** — average rating computed per listing, shown on Details and Compare |

---

## 2. Main Features

| Feature | Implementation | Status |
|---|---|---|
| Registration / Login / Profile | `LoginScreen`, `RegisterScreen`, `ProfileScreen`, [`src/context/AuthContext.tsx`](../../src/context/AuthContext.tsx) | Done — Firebase Auth |
| Location-Based Search & Distance | `SearchScreen`, `utils/distance.ts` | Done |
| Smart Filter & Recommendation | `FilterScreen`, `utils/scoring.ts` | Done |
| Price & Amenity Comparison | `CompareScreen`, [`src/context/CompareContext.tsx`](../../src/context/CompareContext.tsx) | Done — side-by-side table, 2–3 listings |
| Map-Based Navigation Guide | `NavigationScreen`, [`src/components/LeafletMap.tsx`](../../src/components/LeafletMap.tsx) | Done |
| Ratings & Reviews Aggregation | `ReviewsScreen`, `components/StarRating.tsx` | Done |
| Save to Favorites with Match Alerts | `FavoritesScreen`, [`src/utils/matchAlerts.ts`](../../src/utils/matchAlerts.ts) | Done — saved filters trigger a local notification on match |
| Notifications / History | `NotificationsScreen` | Done |
| Admin Management | `AdminScreen`, `AddListingScreen` | Partial — see gap 2 |

---

## 3. Expected Application Screens

All thirteen exist, plus three the proposal did not name.

| Proposal screen | File |
|---|---|
| Login / Registration | `LoginScreen.tsx`, `RegisterScreen.tsx` |
| Home / Location-Based Search | `HomeScreen.tsx`, `SearchScreen.tsx` |
| Map View | `MapScreen.tsx` |
| Boarding House Details | `DetailsScreen.tsx` |
| Filter & Recommendation | `FilterScreen.tsx` |
| Comparison | `CompareScreen.tsx` |
| Navigation / Route Guide | `NavigationScreen.tsx` |
| Ratings & Reviews | `ReviewsScreen.tsx` |
| Favorites | `FavoritesScreen.tsx` |
| Notifications | `NotificationsScreen.tsx` |
| User Profile / Settings | `ProfileScreen.tsx` |
| Owner Listing Submission | `AddListingScreen.tsx` |
| Admin Verification Dashboard | `AdminScreen.tsx` |

Extras: `LandingScreen.tsx` (pre-login intro), plus the tab shell in
`navigation/MainTabs.tsx` and the auth gate in `navigation/RootNavigator.tsx`.

---

## 4. Special Mobile Features / APIs

| Proposal API | Package | Status |
|---|---|---|
| GPS / Location | `expo-location` | Used in 6 files |
| Maps & routing | `react-native-webview` + Leaflet, OSRM `router.project-osrm.org` | Working |
| Push / Local Notifications | `expo-notifications` | Used in `utils/matchAlerts.ts` |
| Device / Local Storage | `@react-native-async-storage/async-storage` | Working — alert history, plus cached favorites and recently-viewed listings ([`utils/offlineCache.ts`](../../src/utils/offlineCache.ts)) |
| Authentication | Firebase Auth | Working |
| Internet / API communication | Firebase Firestore | Working |

---

## 5. Gaps — know these before the panel finds them

Two are open (QR scanning, the owner role) and one is closed. The team's
decision on 22 September 2026 was to close the offline-caching gap in code and
to declare the other two descoped in the paper.

### Gap 1 — QR scanning is not built

The proposal commits to it twice:

> §7 User permissions: *"...get navigation directions, **scan QR codes**, submit ratings and reviews."*
> §10 Scope: *"...map-based navigation guidance, ratings and reviews, and **QR-based listing lookup**."*

There is no QR code in the project, and no scanner package is installed —
`expo-camera` and `expo-barcode-scanner` are both absent from `package.json`.

**Options:** build it (one screen: scan a code containing a listing ID, then
`navigation.navigate('Details', { propertyId })` — roughly half a day), or
state plainly in the paper that it was descoped and why.

### Gap 2 — there is no Owner role

The proposal defines three roles:

> *User (Tenant-Seeker) · Owner · Administrator*

The code defines two — [`src/types.ts:59`](../../src/types.ts):

```ts
export type UserRole = 'tenant' | 'admin';
```

`AddListingScreen` is the proposal's "Owner Listing Submission", but the only
route to it is the **Add New Listing** button inside `AdminScreen`. In practice
an admin submits listings; an owner cannot sign up and post their own.

**Options:** add `'owner'` to `UserRole` and let owners reach `AddListing`
directly, or narrow the proposal's role list to two.

### ~~Gap 3 — offline caching is narrower than described~~ — **closed**

> §9: *"Device/Local Storage — for caching **favorites and recently viewed listings** for offline access."*

Both halves are now built, in
[`src/utils/offlineCache.ts`](../../src/utils/offlineCache.ts):

- **Favorites.** Every successful load on `FavoritesScreen` writes a copy to
  `AsyncStorage`. If Firestore cannot be reached the screen shows that copy
  behind an *"You're offline — showing your saved copy"* banner instead of an
  empty list. Unfavoriting is disabled while offline, since it is a write.
- **Recently viewed.** Opening a listing records it on the phone;
  `HomeScreen` shows the five most recent under **Recently Viewed**. That list
  lives only on the device, so it fills in with or without a connection.

The cache is cleared on logout so two accounts sharing a phone never see each
other's listings. Every function swallows its own errors — a cache that fails
should be invisible, never a crash.

### Minor — unused dependency

`expo-secure-store` is installed and registered as a plugin in `app.json`, but
never imported. Remove it, or use it to persist the login session (which would
also fix the "logged out on restart" note in `src/firebaseConfig.ts`).

---

## 6. Explicitly out of scope — do not demo these

The proposal rules these out. The Laravel web version of BoardEase has them;
this app must not, or the demo contradicts the approved document.

- Reservation / booking system
- Tenant–owner in-app messaging (chat)
- Maintenance request tracking
- Online payment processing
- Lease / contract management

> There is a second React Native project at `Desktop\BoardEase-Mobile` that
> **does** have Bookings and Chat tabs. It is off-spec for CCE106. Demo this
> project instead.
