# Screens

Sixteen screens. What each one does, and how they connect.

Navigation is defined in two files:
[`src/navigation/RootNavigator.tsx`](../../src/navigation/RootNavigator.tsx)
(the auth gate and every full-screen view) and
[`src/navigation/MainTabs.tsx`](../../src/navigation/MainTabs.tsx) (the five tabs).

---

## Navigation map

```
NOT LOGGED IN
  Landing ──► Register ──┐
     └──────► Login ─────┴──► (AuthContext sees the user, the app switches over)

LOGGED IN — bottom tabs
  ┌─ Home ─────────┐
  ├─ Search ───────┤
  ├─ Favorites ────┼──► these five are always reachable from the tab bar
  ├─ Notifications ┤
  └─ Profile ──────┘

OPENS ON TOP OF THE TABS (no tab bar while open)
  Search / Favorites / Home ──► Details ──► Navigation  (route guide)
                                    │
                                    ├──► Reviews
                                    └──► Compare
  Search ──► Filter   (slides up as a modal)
  Search ──► Map      ──► Details
  Profile ──► Admin   ──► AddListing
```

Why the second group sits outside the tabs: they are full-screen views where
the tab bar would be in the way. React Navigation lets a screen inside a tab
navigate to any screen its parent stack defines, so `Search` can still open
`Details` directly.

---

## The screens

### Before login

| Screen | File | What it does |
|---|---|---|
| Landing | `LandingScreen.tsx` | Brand intro and a three-step "how it works". Buttons to Register or Login. |
| Login | `LoginScreen.tsx` | Email + password against Firebase Auth. No manual navigation on success — `AuthContext` updates and `RootNavigator` swaps the whole tree. |
| Register | `RegisterScreen.tsx` | Creates the account. Checks the two passwords match and enforces a 6-character minimum before calling Firebase. |

### The five tabs

| Screen | File | What it does |
|---|---|---|
| Home | `HomeScreen.tsx` | Dashboard. Shows a tenant a search shortcut, quick links, and the five listings they viewed most recently (read from the device, so it works offline); shows an **admin** a preview of listings awaiting approval instead. Also fires the saved-filter alert check on open. |
| Search | `SearchScreen.tsx` | The core screen. Reads GPS, loads approved listings from Firestore, computes distance for each, sorts, applies filters, and ranks by match score. Toggles between *Recommended* and *Nearest*. |
| Favorites | `FavoritesScreen.tsx` | Everything the user saved. The `favorites` collection stores only `{userId, propertyId}`, so each record is joined to its property in plain JavaScript. Each successful load is cached on the device; with no connection the cached copy is shown behind an offline banner. |
| Notifications | `NotificationsScreen.tsx` | Match alerts — new listings that fit the user's saved filters. Stored on the phone, not in Firestore. |
| Profile | `ProfileScreen.tsx` | Account details and logout. Shows an Admin Panel button only when the role is `admin`. |

### Opened on top

| Screen | File | What it does |
|---|---|---|
| Details | `DetailsScreen.tsx` | One listing in full: photo, price, description, amenities, three newest reviews. Favorite / Compare / Navigate buttons. |
| Filter | `FilterScreen.tsx` | Max price, room type, amenities. Hands the choices back to Search through an `onApply` callback. The alerts switch saves the filters to the user's Firestore document. |
| Map | `MapScreen.tsx` | Search results as pins on a Leaflet map. Tapping a pin opens that listing. |
| Compare | `CompareScreen.tsx` | Two or three listings side by side — price, room type, distance, rating, and a check or cross per amenity. |
| Navigation | `NavigationScreen.tsx` | Walking route from the user's position, following real roads via OSRM, with turn-by-turn steps under the map. |
| Reviews | `ReviewsScreen.tsx` | Full review list plus the write-a-review form. One review per user per listing. |
| Admin | `AdminScreen.tsx` | Two tabs: approve or reject pending listings, and moderate reviews. |
| AddListing | `AddListingScreen.tsx` | The listing submission form — details, amenities, coordinates (typed or from GPS), and a photo from camera or gallery. |

---

## Shared pieces

| File | Used by |
|---|---|
| `components/LeafletMap.tsx` | Map, Navigation — a Leaflet map inside a WebView, because Expo Go has no native map module |
| `components/CompareBar.tsx` | Search, Favorites — the bar that appears once 2+ listings are picked |
| `components/StarRating.tsx` | Details, Reviews, Admin |
| `context/AuthContext.tsx` | Everything behind the login gate |
| `context/CompareContext.tsx` | Search, Favorites, Details, Compare |
| `utils/distance.ts` | Haversine distance |
| `utils/scoring.ts` | The match-score ranking |
| `utils/routing.ts` | OSRM walking directions |
| `utils/matchAlerts.ts` | Saved-filter checks and local notifications |
| `utils/offlineCache.ts` | Home, Favorites, Details — caches favorites and recently-viewed listings on the device |
| `theme.ts` | Colours, spacing, radii, card shadow |

---

## Note for the paper

`docs/ui-mockups/` holds six mockups: onboarding, search results, filter,
listing detail, route guide, compare. They cover the main flow but not all
sixteen screens, and they predate the current build. Either take fresh
screenshots from the running app, or say in the caption that they are design
mockups rather than screenshots.
