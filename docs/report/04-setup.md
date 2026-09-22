# Setup

How to run BoardEase on a phone, and what to do when it will not start.

---

## Requirements

- Node.js 18 or newer
- The **Expo Go** app on an Android or iOS phone
- Phone and computer on the **same Wi-Fi network**

---

## Running it

```bash
cd C:\New_BoardEase\mobile
npm install          # first time only
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

`npm run android` / `npm run ios` open an emulator instead. `npm run web`
opens a browser — handy for checking layout, but the GPS and map behave
differently there, so never demo from it.

---

## Before a demo — checklist

| ✔ | Step | Command |
|---|---|---|
| ☐ | Listings exist in Firestore | `node scripts/seedData.mjs` |
| ☐ | Listing dates and photos are valid | `node scripts/fixSampleData.mjs` |
| ☐ | An admin account exists | register in the app first, then `node scripts/makeAdmin.mjs you@example.com` |
| ☐ | A second normal account exists | register it in the app |
| ☐ | Location permission works | open Search, accept the prompt |
| ☐ | A route draws | open any listing → Navigate |
| ☐ | The offline cache is warm | favorite a listing and open **Favorites** once while online, then check it still lists in airplane mode |
| ☐ | Phone is charged and on the room's network | — |

Run the seed scripts **once**. Running `seedData.mjs` twice duplicates every
listing.

---

## Troubleshooting

### The QR opens "Student Registration" instead of BoardEase

Two causes.

**1. You are in the wrong folder.** `C:\New_BoardEase\StudentRegistrationApp`
is the standalone lab copy and its QR will always open the lab. Run from
`C:\New_BoardEase\mobile`.

**2. `App.tsx` is pointing at the lab.** This project can run either BoardEase
or the school lab in `src/lab`, switched by commenting. Open
[`App.tsx`](../../App.tsx) — the top should read:

```tsx
import BoardEaseApp from './src/BoardEaseApp';

export default function App() {
  return <BoardEaseApp />;
}
```

If `LabNavigator` is imported instead, follow the instructions in that file's
header comment to swap back, then restart Metro.

It is done with comments rather than an `if` because Metro bundles every
imported file even when the branch is never reached — one broken import on
either side would stop the other from loading.

### "No boarding houses match your search yet"

Either nothing is seeded (`node scripts/seedData.mjs`) or the filters are too
narrow (Filter → **Reset**). Remember search only shows listings where
`isApproved` is true — approve them in the Admin panel, or seed data that is
already approved.

### The Admin Panel button is missing on Profile

That button only renders when the account's role is `admin`. Register the
account in the app first, then:

```bash
node scripts/makeAdmin.mjs your-email@example.com
```

Log out and back in so the role is re-read.

### Location permission never prompts

It was already answered once. On Android: Settings → Apps → Expo Go →
Permissions → Location. On iOS: Settings → Expo Go → Location.

### The map is blank / the route never loads

The map is Leaflet inside a WebView and needs internet for tiles; the route
comes from the public OSRM endpoint `router.project-osrm.org`. Both fail on a
captive-portal network — the kind that shows a login page. Tether to a phone
hotspot instead.

### "Project is incompatible with this version of Expo Go"

The installed Expo Go is newer or older than the SDK in `package.json`
(currently Expo ~57). Install the matching Expo Go build, or run
`npx expo install --fix`.

### Metro caches a stale bundle

```bash
npx expo start -c
```

### Type errors

```bash
npx tsc --noEmit
```

Passes clean as of 22 September 2026.

---

## Firebase

Config lives in [`src/firebaseConfig.ts`](../../src/firebaseConfig.ts) and is
already filled in for project `boardease-aefc2`. Three services are used:
Auth (email/password), Firestore (listings, reviews, favorites), and Storage
(listing photos).

Collections: `properties`, `reviews`, `favorites`, `users`.

Security rules are in [`firestore.rules`](../../firestore.rules). Check what is
deployed in the console matches that file before the demo — a rule change made
in the browser will not be reflected here.

> **Known limitation, already documented in `firebaseConfig.ts`:** a login is
> remembered only while the app is open. Fully closing it requires logging in
> again. Fixing it needs Firebase Auth persistence wired to AsyncStorage; it is
> not required for the project.

---

## Project layout

```
mobile/
├── App.tsx              entry point — BoardEase / school lab switch
├── src/
│   ├── screens/         the 16 screens
│   ├── components/      LeafletMap, CompareBar, StarRating
│   ├── context/         AuthContext, CompareContext
│   ├── navigation/      RootNavigator, MainTabs
│   ├── utils/           distance, scoring, routing, matchAlerts, offlineCache
│   ├── lab/             the school lab (not part of BoardEase)
│   ├── theme.ts         colours, spacing, radii
│   └── firebaseConfig.ts
├── scripts/             seed / fix / makeAdmin
└── docs/                diagrams, mockups, and this report
```
