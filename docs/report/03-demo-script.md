# Demo Script

The order to click through on defense day. Each section proves one of the four
specific objectives from the proposal, so say the objective out loud as you
start it — panels mark what they hear, not what they guess.

**Before you stand up, run the checklist in [04-setup.md](04-setup.md).**
Especially: listings seeded, one admin account ready, phone off Wi-Fi-only and
on a network that works in the room.

Budget: about 7 minutes.

---

## 0. Opening (30 seconds)

> "BoardEase is a location-based guide for finding, comparing, and navigating to
> boarding houses. It is a discovery tool — it deliberately does not handle
> booking, payments, or messaging, as stated in our scope."

Say that last part early. It stops a panelist from asking "where is the booking
feature?" later, and shows the scope was a decision rather than an omission.

Open the app on **Landing**, logged out.

---

## 1. Account — registration and login (45 seconds)

1. Tap **Get Started** → Register.
2. Register a fresh account live if the network is reliable. If it isn't, tap
   *Already have an account* and log in with the prepared account.
3. Land on **Home**.

> "Authentication is Firebase Auth. The app never navigates manually after
> login — an auth listener updates the shared context and the whole navigator
> swaps over."

---

## 2. Objective 1 — location-based search (90 seconds)

> "Objective one: search based on the user's current location."

1. Tap **Find Nearby Boarding Houses** → Search.
2. Let the location permission prompt appear and **accept it in front of them**.
   The permission dialog is proof the GPS is real.
3. Point at the distance on each card — "450 m away", "1.2 km away".

> "Distance is computed on the device with the Haversine formula in
> `utils/distance.ts`, from the phone's GPS to each listing's stored
> coordinates. The list is sorted nearest-first before any filter runs."

---

## 3. Objective 2 — smart filter and comparison (2 minutes)

> "Objective two: compare listings by price, distance, and amenities."

**The ranking:**

1. Point at the **% match** badge on each card.
2. Tap **Sort: Recommended** to flip it to **Nearest**, then back.

> "Recommended is not just distance. `utils/scoring.ts` scores every listing on
> budget fit, distance, and how many of the chosen amenities it has."

**The filter:**

3. Tap **Filter**. Set a max price, pick a room type, tick two amenities.
4. Tap **Apply Filters** → watch the result list shrink.

**The comparison:**

5. Tap **Compare** on two cards. The compare bar slides up.
6. Tap it → **Compare** screen.
7. Walk the rows: price, room type, distance, rating, then the amenity ticks
   and crosses.

> "This is the side-by-side comparison tool from the proposal. Ratings here are
> averaged from the reviews collection at load time."

---

## 4. Objective 3 — map-based navigation (90 seconds)

> "Objective three: guide the user to a boarding house."

1. Go back to Search, open any listing → **Details**.
2. Show the photo, price, amenities, and the three most recent reviews.
3. Tap **Navigate** → **Route Guide**.
4. Wait for the route to draw, then point at the banner: distance and walking
   time.
5. Scroll the turn-by-turn steps below the map.

> "The route follows real roads. We call OSRM, a free public routing service,
> for a walking route — `utils/routing.ts` — and draw it on a Leaflet map. The
> map runs inside a WebView because Expo Go has no native maps module."

If the network is slow, this is the step that will stall. Have a screenshot
ready on a second phone.

---

## 5. Objective 4 — ratings and reviews (45 seconds)

> "Objective four: improve listing reliability through ratings."

1. From Details, tap **See all** → **Reviews**.
2. Show the list, then the write-a-review form — set stars, type a line,
   **Submit Review**.
3. Go back to Details and show the new review at the top.

---

## 6. Favorites and match alerts (45 seconds)

1. On Details, tap **Favorite**.
2. Open the **Favorites** tab — it is there.
3. Open **Filter**, switch on **Save these filters and alert me**.
4. Open the **Alerts** tab and explain what lands there.

> "Saved filters are checked whenever the app opens. A new listing that matches
> becomes a phone notification and an entry on this tab."

**The offline cache** — worth 20 seconds, it is easy to show and hard to fake:

5. Turn on **airplane mode** in front of the panel.
6. Open **Favorites** — the listings are still there, with an *"You're offline"*
   banner above them.
7. Open **Home** — **Recently Viewed** is still populated.
8. Turn airplane mode back off.

> "Favorites and recently-viewed listings are cached on the device with
> AsyncStorage, so they stay readable without a connection — that is the
> device-storage requirement in our proposal."

---

## 7. Admin — verification (45 seconds)

1. **Profile** tab → **Admin Panel** (visible only for an admin account).
2. Show a pending listing with **Approve** and **Reject**.
3. Approve one.
4. Optional, if time: **Add New Listing** to show the submission form.

> "Admin verification is what keeps the listings trustworthy — nothing appears
> in search until it is approved."

---

## 8. Closing (20 seconds)

> "That covers all four objectives: location-based search, smart filtering and
> comparison, map navigation, and ratings. Built with React Native and Expo, so
> the same codebase runs on Android and iOS, with Firebase as the backend."

---

## Questions you should expect

| Question | Answer |
|---|---|
| "Why no booking?" | It is out of scope in the approved proposal — this is a discovery guide, not a rental platform. |
| "Where is the QR scanning you mentioned?" | Be honest: not implemented. See gap 1 in [01-features-vs-proposal.md](01-features-vs-proposal.md). Decide as a team beforehand whether you will build it or amend the paper. |
| "Can an owner post a listing?" | Currently listings are submitted through the admin panel; the owner role was not implemented. Gap 2 in the same file. |
| "Is Firestore a real database? It is NoSQL." | Yes — collections of documents rather than tables. The ERD shows the relationships we enforce in application code, since Firestore has no foreign keys. |
| "Does it work offline?" | Partly, by design. Favorites, recently-viewed listings, and saved alerts are cached on the phone and still open offline. Searching and opening a listing for the first time need a connection, because that data has to come from Firestore. |
| "Why Leaflet in a WebView and not Google Maps?" | Expo Go cannot load native map modules without a custom build. Leaflet with OpenStreetMap runs anywhere and costs nothing. |

---

## If something breaks mid-demo

- **Keep talking.** Narrate what should happen while it loads.
- **Location prompt does not appear** — it was already granted. Say so and move on.
- **Empty search results** — the filter is too narrow. Open Filter, **Reset**.
- **Route will not load** — OSRM is unreachable. Show the Map View instead and
  say the routing service is a public endpoint.
- **App shows Student Registration** — wrong entry point. See the first entry
  in [04-setup.md](04-setup.md) troubleshooting.
