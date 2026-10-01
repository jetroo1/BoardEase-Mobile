# CHAPTER 1

**BoardEase — A Mobile Application Guide for Finding, Comparing, and
Navigating to Boarding Houses**

CCE106/L · Bachelor of Science in Information Technology
University of Mindanao Tagum College

Martin, Jetroy S. · Lulu, John Rex P. · Galagar, Ailyn May V. · Lisbo, Vince Josua C.

Submitted to: Princess Anne Dadul

---

## Introduction

### Purpose of the Document

This document is the technical documentation for BoardEase. It records what
the application does, how it is built, how it was tested, and how it is
deployed and maintained, so that the system can be understood, evaluated, and
continued by someone who did not write it.

It covers the mobile application in full: the screens a user sees, the data
stored behind them, the services the application depends on, and the decisions
taken during development along with the reasons for them. Where a feature named
in the original project proposal was not built, this document says so and
explains why, rather than leaving the reader to discover the gap.

It does **not** cover the separate Laravel web application from which this
project was split, the administration of the Firebase project beyond what the
application requires, or any commercial arrangement between a tenant and a
boarding house owner. Those are outside the system's boundary.

### Audience

| Reader | What they need from this document |
|---|---|
| **Course adviser and panel** | Evidence that the application meets the objectives set out in the proposal, and an honest account of what was and was not delivered |
| **Developers** | Enough architectural and data detail to modify or extend the application without reading every file first |
| **Future student groups** | A working reference for a React Native and Firebase application, including the parts that proved difficult |
| **Administrators of the system** | How listings are approved, how reviews are moderated, and what happens to user data |

The document assumes the reader is familiar with general programming concepts
but not with React Native, Expo, or Firebase specifically. Technologies are
named and explained where first used.

### Overview of the Application

BoardEase is a mobile application that helps students and young professionals
find a boarding house near their school or workplace. It was developed for the
area around University of Mindanao Tagum College, where students arriving from
outside Tagum City must arrange accommodation with little reliable information
about what is available, what it costs, or how far it is from campus.

The application addresses this in four steps:

1. **Find.** It reads the device's GPS position and lists approved boarding
   houses ordered by how far they are from the user.
2. **Rank.** Each listing is scored out of 100 against the user's stated budget
   and required amenities, so results are ranked by suitability rather than
   merely filtered.
3. **Compare.** Two or three listings can be placed side by side across price,
   room type, distance, average rating, and amenities.
4. **Navigate.** A walking route is drawn along real roads from the user's
   position to the chosen listing, with turn-by-turn directions and live
   position tracking as the user walks.

**Goals**

- Reduce the time and transport cost spent visiting unsuitable boarding houses
- Make options visible that a student would not otherwise hear about
- Allow a genuine comparison from information gathered in one place
- Get the user physically to the door of the place they choose

**Objectives**

- Implement location-based search using the device GPS
- Implement automatic ranking by price, distance, and amenities
- Implement side-by-side comparison of selected listings
- Implement map-based navigation with turn-by-turn walking directions
- Implement rating and review aggregation per listing
- Provide administrative approval of listings and moderation of reviews

BoardEase is deliberately a **discovery and navigation guide**. It does not
process reservations or payments and provides no messaging between tenants and
owners. Those arrangements are made directly with the owner, as they are today.
This boundary is stated in the Requirements section below and is not an
oversight.

---

## Project Overview

### Project Name

**BoardEase** — internal package name `mobile`, Expo slug `mobile`, bundled
display name *BoardEase*.

### Version

**1.0.0**, as declared in both `package.json` and `app.json`.

The project uses a single version number for the application as a whole. There
is no separate build number, because the application is distributed through
Expo Go for the purposes of this course rather than through an app store.

### Release Date

**September 2026** — the date of academic submission and defence.

This is the date on which the application is delivered and demonstrated for
CCE106/L. It is not a public app store release; BoardEase is run through Expo
Go on a development server and has not been submitted to Google Play or the
Apple App Store.

### Stakeholders

| Stakeholder | Role and interest |
|---|---|
| **Martin, Jetroy S.** | Developer. Repository owner. |
| **Lulu, John Rex P.** | Developer. |
| **Galagar, Ailyn May V.** | Developer. |
| **Lisbo, Vince Josua C.** | Developer. |
| **Princess Anne Dadul** | Course adviser. Evaluates the application against the proposal and approves the documentation. |
| **CCE106/L panel** | Examines the system at defence. |
| **University of Mindanao Tagum College** | Institutional context. Incoming students are the intended users, and the campus is the centre of the study area. |
| **Tenant-seekers** | Primary end users: students and young professionals searching for accommodation. |
| **Boarding house owners** | Indirect beneficiaries. Their properties are listed, though in this version they do not hold accounts (see Requirements). |
| **System administrator** | Reviews and approves submitted listings, removes inappropriate reviews, and publishes listings on behalf of owners. |

---

## Requirements

### Functional Requirements

Requirements are grouped by the user role that exercises them. Each is written
as a capability the system must provide, and the screen that provides it is
named so the requirement can be traced to the build.

#### FR-1 — Account management

| ID | Requirement | Where |
|---|---|---|
| FR-1.1 | A visitor can create an account with an email address and password. | `RegisterScreen` |
| FR-1.2 | A registered user can log in with those credentials. | `LoginScreen` |
| FR-1.3 | A user can request a password reset link by email. | `ProfileScreen` |
| FR-1.4 | A user can log out, which clears any cached data held on the device. | `ProfileScreen` |
| FR-1.5 | Each account carries a role of either *tenant* or *administrator*, which determines what is shown. | `AuthContext` |

Validation is applied in the interface before submission and reported next to
the field concerned. Authentication failures are translated into wording the
user can act on rather than shown as raw error codes.

#### FR-2 — Location-based search

| ID | Requirement | Where |
|---|---|---|
| FR-2.1 | The system requests permission to read the device's location. | `SearchScreen` |
| FR-2.2 | The system retrieves all listings marked approved. | `SearchScreen` |
| FR-2.3 | The system computes the distance from the user to each listing using the Haversine formula. | `utils/distance.ts` |
| FR-2.4 | Results are ordered nearest first. | `SearchScreen` |
| FR-2.5 | If location is unavailable or refused, the full catalogue is still browsable, with distance-dependent features disabled and the reason stated. | `SearchScreen` |

#### FR-3 — Filtering and ranking

| ID | Requirement | Where |
|---|---|---|
| FR-3.1 | A user can set a maximum monthly rent. | `FilterScreen` |
| FR-3.2 | A user can restrict results to a room type: Single, Shared, or Studio. | `FilterScreen` |
| FR-3.3 | A user can require one or more amenities; a listing must provide all of them to qualify. | `FilterScreen` |
| FR-3.4 | Each listing receives a match score out of 100: proximity up to 40 points, budget fit 30 points, amenity coverage up to 30 points. | `utils/scoring.ts` |
| FR-3.5 | Results can be ordered by match score (*Recommended*) or by distance (*Nearest*). | `SearchScreen` |
| FR-3.6 | Applied filters are shown as removable chips so the user can see why results were excluded. | `SearchScreen` |

Proximity scores linearly from 40 points at zero distance to 0 points at a
three-kilometre cut-off. The cut-off reflects the walking radius of the study
area; a larger one would score a 300-metre listing and a 1.5-kilometre listing
almost identically, which would defeat the purpose of ranking by distance.

#### FR-4 — Comparison

| ID | Requirement | Where |
|---|---|---|
| FR-4.1 | A user can add a listing to a comparison set from a listing card or its detail page. | `SearchScreen`, `DetailsScreen` |
| FR-4.2 | The comparison set holds between two and three listings. | `CompareContext` |
| FR-4.3 | Selected listings are displayed side by side across price, room type, distance, average rating, and each amenity. | `CompareScreen` |
| FR-4.4 | An amenity is shown as present or absent for every listing, never as a blank cell. | `CompareScreen` |
| FR-4.5 | A listing can be opened from the comparison, and the whole set can be cleared with confirmation. | `CompareScreen` |

#### FR-5 — Map and navigation

| ID | Requirement | Where |
|---|---|---|
| FR-5.1 | Listings are displayed as markers on a map, each labelled with its monthly rent. | `MapScreen`, `LeafletMap` |
| FR-5.2 | Selecting a marker shows that listing's summary card, and selecting a card highlights its marker. | `MapScreen` |
| FR-5.3 | The map can be searched and re-centred on the user's position. | `MapScreen` |
| FR-5.4 | A walking route is generated along real roads from the user to a chosen listing. | `utils/routing.ts` |
| FR-5.5 | Turn-by-turn instructions are listed beneath the route. | `NavigationScreen` |
| FR-5.6 | The user's position updates as they move, remaining distance counts down, and the route is recalculated if they leave it by more than 45 metres. | `NavigationScreen` |
| FR-5.7 | Arrival is declared within 25 metres of the destination. | `NavigationScreen` |

#### FR-6 — Ratings and reviews

| ID | Requirement | Where |
|---|---|---|
| FR-6.1 | A tenant can submit a star rating from one to five with written feedback. | `ReviewsScreen` |
| FR-6.2 | A user may submit at most one review per listing. | `ReviewsScreen` |
| FR-6.3 | The average rating and review count are displayed on the listing. | `DetailsScreen`, `PropertyCard` |
| FR-6.4 | Averages are displayed to one decimal place, with half stars where the fraction warrants. | `Rating` |

#### FR-7 — Saved listings and alerts

| ID | Requirement | Where |
|---|---|---|
| FR-7.1 | A user can save a listing to a shortlist from a card or its detail page. | `SearchScreen`, `DetailsScreen` |
| FR-7.2 | Saved listings are listed on a dedicated screen. | `FavoritesScreen` |
| FR-7.3 | A user can save a set of filters and be alerted when a newly approved listing matches them. | `FilterScreen`, `utils/matchAlerts.ts` |
| FR-7.4 | Alerts are listed, marked read when opened, and can be cleared. | `NotificationsScreen` |

#### FR-8 — Offline access

| ID | Requirement | Where |
|---|---|---|
| FR-8.1 | Saved listings are cached on the device and remain readable without a connection. | `utils/offlineCache.ts` |
| FR-8.2 | Recently viewed listings are recorded on the device and shown on the home screen. | `utils/offlineCache.ts` |
| FR-8.3 | When cached data is shown instead of live data, the interface says so. | `FavoritesScreen` |
| FR-8.4 | The cache is cleared on logout so two accounts sharing a device cannot see each other's data. | `AuthContext` |

#### FR-9 — Administration

| ID | Requirement | Where |
|---|---|---|
| FR-9.1 | An administrator sees a queue of listings awaiting approval. | `AdminScreen` |
| FR-9.2 | An administrator can approve a listing, publishing it to search results. | `AdminScreen` |
| FR-9.3 | An administrator can reject a listing, which deletes it after confirmation naming the listing. | `AdminScreen` |
| FR-9.4 | An administrator can remove any review. | `AdminScreen` |
| FR-9.5 | An administrator can create a listing, including attaching a photograph from the camera or gallery and pinning its coordinates by GPS or by hand. | `AddListingScreen` |
| FR-9.6 | Administrative screens refuse access to non-administrator accounts. | `AdminScreen`, `AddListingScreen` |

#### Out of scope

The following were named in the project proposal and are **not** implemented in
version 1.0.0. They are recorded here so the boundary is explicit.

| Item | Status and reason |
|---|---|
| **Owner role** | The proposal defined three roles — tenant, owner, administrator. Two are implemented. Listings are submitted through the administrator account rather than by owners registering independently, keeping verification under a single moderated account within the project timeframe. |
| **QR-based listing lookup** | Retrieving a listing by scanning a QR code at a property is not built. No scanner dependency is installed. |
| **Booking, reservation, payment** | Never in scope. The application is a guide, not a booking platform. |
| **Messaging** | Never in scope. No chat between tenants and owners. |
| **Verification of listing accuracy** | The system relies on administrator review. It does not independently confirm that a property exists or that its stated price is current. |

### Non-Functional Requirements

#### NFR-1 — Performance

| ID | Requirement | Measure |
|---|---|---|
| NFR-1.1 | Filtering and ranking are performed in memory on the retrieved set, not by repeated queries. | No Firestore composite index is required. |
| NFR-1.2 | Each screen shows a loading state within 100 ms of a fetch beginning. | Skeleton placeholders shaped like the content that follows. |
| NFR-1.3 | Route recalculation is suppressed while a request is already in flight. | At most one outstanding request to the routing service. |
| NFR-1.4 | Location tracking updates at roughly five-metre intervals during navigation. | `Accuracy.High`, `distanceInterval` 5 m — chosen over continuous tracking to limit battery drain. |
| NFR-1.5 | Location tracking stops when the navigation screen is left. | Subscription removed on unmount. |

#### NFR-2 — Security

| ID | Requirement | Measure |
|---|---|---|
| NFR-2.1 | Authentication is handled by Firebase Authentication; the application never stores a password. | Email and password provider. |
| NFR-2.2 | Access to stored data is governed by server-side rules, not by the client. | `firestore.rules` covers `properties`, `reviews`, `favorites`, `users`. |
| NFR-2.3 | Only administrators may approve listings or delete reviews. | Role checked in the rules and again in the interface. |
| NFR-2.4 | Failed sign-in does not reveal whether the email exists. | A single message covers wrong email and wrong password. |
| NFR-2.5 | Listing text supplied by users is escaped before being placed in the map's HTML. | Prevents a crafted listing title from injecting script into the map view. |
| NFR-2.6 | No payment or financial data is collected or stored. | Out of scope by design. |

#### NFR-3 — Usability

| ID | Requirement | Measure |
|---|---|---|
| NFR-3.1 | Every screen that loads data provides four states: content, loading, empty, and error. | Empty states distinguish "nothing exists yet" from "nothing matched". |
| NFR-3.2 | Every interactive element responds visibly to being pressed. | Press animation and disabled state on every control. |
| NFR-3.3 | Destructive actions confirm and name what will be destroyed. | "Reject this listing? *Sunrise Boarding House* will be permanently deleted." |
| NFR-3.4 | Form errors appear beside the field concerned and state how to correct it. | Validation on blur; all problems reported at once on submit. |
| NFR-3.5 | Touch targets are at least 44 points. | Enforced through the shared component kit. |
| NFR-3.6 | Meaning is never carried by colour alone. | Status uses an icon or text alongside colour. |
| NFR-3.7 | Every icon-only control carries an accessible name. | For screen reader users. |
| NFR-3.8 | The interface is available in light and dark themes, following the device setting or a manual choice. | Persisted between sessions. |

#### NFR-4 — Reliability

| ID | Requirement | Measure |
|---|---|---|
| NFR-4.1 | Loss of connectivity degrades the application rather than breaking it. | Saved and recently viewed listings remain readable. |
| NFR-4.2 | Every network operation handles its own failure and offers a retry. | No unhandled promise rejections. |
| NFR-4.3 | A failed write is reverted in the interface and reported. | A save that fails silently would leave the user believing it succeeded. |
| NFR-4.4 | Repeated activation of a control cannot create duplicate records. | Guarded on favourites, reviews, and listing approval. |
| NFR-4.5 | Unavailable GPS does not prevent use of the application. | The catalogue remains browsable without distance. |

#### NFR-5 — Portability and maintainability

| ID | Requirement | Measure |
|---|---|---|
| NFR-5.1 | One codebase runs on both Android and iOS. | React Native 0.86 with Expo SDK 57. |
| NFR-5.2 | The application runs without a native build. | Distributed through Expo Go for this course. |
| NFR-5.3 | Every colour, size, spacing value, and radius comes from one definition. | `src/theme.ts`; no raw font size or weight remains in application code. |
| NFR-5.4 | The codebase is statically type-checked. | TypeScript in strict mode; `tsc --noEmit` passes with no errors. |
| NFR-5.5 | Shared behaviour lives in one place rather than being repeated per screen. | Saving a listing, for example, is defined once and used by three screens. |

#### NFR-6 — External dependencies

The application depends on services outside its control. Each is listed with
the consequence of its being unavailable.

| Dependency | Used for | If unavailable |
|---|---|---|
| Firebase Authentication | Sign-in and registration | No new sessions; existing session continues until closed |
| Cloud Firestore | Listings, reviews, favourites, user records | Cached saved and recently viewed listings remain readable |
| Firebase Storage | Listing photographs | Listings display a placeholder rather than an image |
| OpenStreetMap tiles | Map background | The map shows no imagery; markers and route still compute |
| OSRM routing service | Walking routes | Directions cannot be generated; the listing remains viewable |
| Expo Go | Running the application | The application cannot be started on the device |

---

*Chapter 2 covers architecture, design, and the development process.
Chapter 3 covers testing, deployment, and maintenance.*
