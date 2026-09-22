# BoardEase

**A Mobile Application Guide for Finding, Comparing, and Navigating to Boarding Houses**

CCE106/L project · University of Mindanao Tagum, BSIT · September 2026

Martin, Jetroy S. · Lulu, John Rex P. · Galagar, Ailyn May V. · Lisbo, Vince Josua C.
Submitted to: Princess Anne Dadul

---

A location-based guide for students and young professionals looking for a
boarding house near their school or workplace. It finds nearby listings,
ranks them by how well they fit a budget and amenity list, puts two or three
side by side, and walks the user to the door.

It is a **discovery and navigation guide**. By design it does not handle
booking, payments, or messaging — see the scope section of the proposal.

Built with React Native and Expo, so one codebase runs on both Android and
iOS. Firebase provides authentication, the database, and photo storage.

---

## Running it

```bash
npm install
npm start
```

Scan the QR code with **Expo Go**. Full instructions, the pre-demo checklist,
and troubleshooting are in [docs/report/04-setup.md](docs/report/04-setup.md).

> If the QR opens a *Student Registration* app instead of BoardEase, check
> [`App.tsx`](App.tsx) — this project can also run the school lab in `src/lab`,
> and the switch is a pair of comments at the top of that file.

---

## What it does

| Feature | Screen |
|---|---|
| Find listings near the user's GPS position, sorted by distance | Search |
| Rank listings by budget fit, distance, and amenities | Search (*Recommended*) |
| Narrow by price, room type, and amenities | Filter |
| Put 2–3 listings side by side | Compare |
| Walking directions along real roads, turn by turn | Route Guide |
| Average star rating per listing, with reviews | Reviews |
| Save listings, and get notified when a new one matches saved filters | Favorites, Alerts |
| Read favorites and recently-viewed listings with no connection | Favorites, Home |
| Approve or reject submitted listings | Admin |

---

## Documentation

Everything for the written report and the defense is in
**[docs/](docs/)** — kept out of the source tree so it can be submitted on its own.

| | |
|---|---|
| [Features vs. proposal](docs/report/01-features-vs-proposal.md) | Every commitment traced to the code, **including the gaps** |
| [Screens](docs/report/02-screens.md) | All 16 screens and how they connect |
| [Demo script](docs/report/03-demo-script.md) | Click-by-click walkthrough for defense day |
| [Setup](docs/report/04-setup.md) | Running it, seeding data, troubleshooting |
| [diagrams/](docs/diagrams/) | The six required system diagrams (`.drawio`) |
| [ui-mockups/](docs/ui-mockups/) | Screen mockups (`.svg`, `.png`, `prototype.html`) |

**Read the gaps section before the defense.** Two things in the proposal are
not in the build — QR scanning and the owner role — and are declared descoped.
The third, offline caching, was closed in code on 22 September 2026.

---

## Layout

```
src/
├── screens/       the 16 screens
├── components/    LeafletMap, CompareBar, StarRating
├── context/       AuthContext, CompareContext
├── navigation/    RootNavigator (auth gate + stack), MainTabs
├── utils/         distance (Haversine), scoring, routing (OSRM), matchAlerts, offlineCache
├── lab/           school lab — not part of BoardEase
├── theme.ts       colours, spacing, radii, shadows
└── firebaseConfig.ts
scripts/           seedData, fixSampleData, makeAdmin
docs/              diagrams, mockups, report
```

## Stack

React Native 0.86 · Expo ~57 · TypeScript · React Navigation 7 ·
Firebase 12 (Auth, Firestore, Storage) · Leaflet in a WebView ·
OSRM for walking routes
