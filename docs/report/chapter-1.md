# Chapter 1

## THE PROBLEM AND ITS SETTING

**BoardEase: A Mobile Application Guide for Finding, Comparing, and Navigating
to Boarding Houses**

CCE106/L · Bachelor of Science in Information Technology
University of Mindanao Tagum College

Martin, Jetroy S. · Lulu, John Rex P. · Galagar, Ailyn May V. · Lisbo, Vince Josua C.

Submitted to: Princess Anne Dadul

---

> **Before you submit this:** every place marked **`[CITE]`** needs a real
> source — a journal article, a government statistic, or your own survey data.
> Do not leave them in, and do not invent references to fill them. Your adviser
> will check. See the note at the end of this file for what each one needs.

---

## Introduction

Every academic year, students who enrol at institutions away from their home
municipality face the same problem before classes even begin: they need
somewhere to live, and they need it close enough to campus to reach on foot or
by a single tricycle ride. In Tagum City, students attending University of
Mindanao Tagum College come from across Davao del Norte and the surrounding
provinces, and most of them arrive knowing very little about the boarding
houses available around the campus. **`[CITE — enrolment figures for UM Tagum,
or DavNor student migration data]`**

The way these students currently find accommodation is informal. Listings are
passed on by word of mouth, posted on tarpaulins nailed to fences along the
road, or shared in unmoderated social media groups where posts are rarely
removed once a room is taken. A prospective tenant has no reliable way to know
what a boarding house costs, what it offers, or how far it actually is from
campus without physically travelling to it. Comparing three options means
three separate trips, three separate conversations, and holding the details of
each one in memory.

This informal system has three consequences. First, it wastes time and
transport money on visits to places that turn out to be unsuitable — too
expensive, too far, or missing an amenity the student needs. Second, it hides
options: a student only learns about the boarding houses someone happened to
tell them about, so genuinely suitable places a few streets away go
undiscovered. Third, it makes comparison almost impossible, because the
information needed to compare — price, distance, amenities, and the experience
of previous tenants — is never gathered in one place.

Mobile technology is well suited to closing this gap. Smartphone ownership
among Filipino students is high **`[CITE — smartphone penetration statistic,
e.g. DICT or Statista Philippines]`**, and the Global Positioning System (GPS)
built into every modern handset can establish a user's position precisely
enough to calculate walking distance to a destination. Mapping and routing
services can then draw a route along real roads rather than a straight line.
What has been missing is an application that applies these capabilities
specifically to the boarding house search in a local setting.

**BoardEase** is proposed as that application. It is a mobile guide that lets a
student find boarding houses near their current location, rank them by how well
each one fits a stated budget and list of required amenities, place two or
three side by side for direct comparison, read ratings left by previous
tenants, and follow turn-by-turn walking directions to the door. It is
deliberately a *discovery and navigation* tool: it helps a student decide which
boarding houses are worth visiting and gets them there, after which the
arrangement is made directly with the owner as it always has been.

---

## Statement of the Problem

This study seeks to develop a mobile application that assists students and
young professionals in locating, comparing, and navigating to boarding houses
within the vicinity of University of Mindanao Tagum College.

Specifically, it seeks to answer the following questions:

1. **What difficulties do students encounter** when searching for boarding
   house accommodation near the campus under the current informal system?
   **`[CITE — support this with your own survey, or cite a comparable study]`**

2. **How may a mobile application be designed and developed** that allows a
   user to:
   1. locate boarding houses near their current position using the device's
      GPS;
   2. rank the results according to price, distance, and available amenities;
   3. compare two or three listings side by side;
   4. view aggregated ratings and reviews submitted by previous tenants; and
   5. receive map-based walking directions to a selected boarding house?

3. **What is the level of acceptability** of the developed application in terms
   of functionality, usability, reliability, and efficiency, as evaluated by
   its intended users? **`[CITE — name the evaluation instrument you will use,
   e.g. ISO/IEC 25010 or a Likert-scale instrument adapted from a named study]`**

---

## Objectives of the Study

### General Objective

To design and develop **BoardEase**, a mobile application that serves as a
guide for finding, comparing, and navigating to boarding houses in the vicinity
of University of Mindanao Tagum College.

### Specific Objectives

1. **To develop a location-based search function** that uses the device's GPS
   to determine the user's current position and returns boarding house listings
   ordered by their distance from that position.

2. **To develop a comparison and recommendation feature** that automatically
   ranks listings according to price, distance, and amenities, and allows the
   user to place selected listings side by side for direct comparison.

3. **To integrate map-based navigation guidance** that displays the route from
   the user's current location to a selected boarding house along actual roads,
   with turn-by-turn walking directions.

4. **To implement a rating and review aggregation system** that allows tenants
   to submit ratings and written feedback, and displays the resulting average
   rating for each listing.

5. **To evaluate the acceptability of the developed application** using a
   standardised evaluation instrument administered to the intended users.
   **`[CITE — the instrument]`**

---

## Conceptual Framework

The study follows the **Input–Process–Output (IPO)** model, in which the data
supplied to the system is transformed through defined processes into the
outputs presented to the user.

```
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│         INPUT           │   │        PROCESS          │   │        OUTPUT           │
├─────────────────────────┤   ├─────────────────────────┤   ├─────────────────────────┤
│ • User's GPS coordinates│   │ • Distance computation  │   │ • Ranked list of nearby │
│ • Boarding house records│──▶│   (Haversine formula)   │──▶│   boarding houses       │
│   (name, address, price,│   │ • Match scoring:        │   │ • Side-by-side          │
│   room type, amenities, │   │   distance 40 pts,      │   │   comparison table      │
│   coordinates, photo)   │   │   budget fit 30 pts,    │   │ • Average rating per    │
│ • User's filter criteria│   │   amenities 30 pts      │   │   listing               │
│   (budget, room type,   │   │ • Filtering by criteria │   │ • Walking route drawn   │
│   required amenities)   │   │ • Route generation via  │   │   on a map, with        │
│ • Tenant ratings and    │   │   road-following        │   │   turn-by-turn steps    │
│   written reviews       │   │   routing service       │   │ • Notifications of new  │
│                         │   │ • Rating aggregation    │   │   matching listings     │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │   FEEDBACK    │
                                  │ User testing  │
                                  │ and evaluation│
                                  │ refine the    │
                                  │ system        │
                                  └───────────────┘
```

The **match score** referred to in the Process stage is computed out of 100
points and is the mechanism by which the system ranks rather than merely
filters. Proximity contributes up to 40 points and decreases linearly to zero
at a cut-off of three kilometres, which reflects the walking radius of the
study area. Budget fit contributes 30 points when a listing falls at or below
the user's stated maximum. Amenity match contributes up to 30 points in
proportion to how many of the user's required amenities a listing provides.

---

## Scope and Delimitation

### Scope

The study covers the design, development, and evaluation of a mobile
application with the following capabilities:

- **Account management.** Registration and login using an email address and
  password, with two levels of access: tenant-seeker and administrator.
- **Location-based search.** Retrieval of approved listings and ordering by
  distance computed from the device's GPS position.
- **Filtering and ranking.** Narrowing results by maximum price, room type, and
  required amenities, with automatic ranking by match score.
- **Comparison.** Displaying two to three selected listings side by side across
  price, room type, distance, average rating, and amenities.
- **Map-based navigation.** Displaying a walking route along real roads from
  the user's position to a selected listing, with turn-by-turn instructions and
  live position tracking as the user moves.
- **Ratings and reviews.** Submission of a star rating and written review by a
  tenant, limited to one review per user per listing, with the average rating
  displayed on the listing.
- **Saved listings and match alerts.** Saving listings to a shortlist, and
  notifying the user when a newly approved listing matches their saved filters.
- **Offline access.** Saved listings and recently viewed listings remain
  readable on the device without an internet connection.
- **Administration.** Review, approval, or rejection of submitted listings, and
  removal of inappropriate reviews.

The application is developed for Android and iOS devices using a single
cross-platform codebase, and the study area is the vicinity of University of
Mindanao Tagum College, Tagum City, Davao del Norte.

### Delimitation

The study does **not** cover the following, and these are stated here so that
the boundaries of the system are unambiguous:

1. **Booking, reservation, and payment.** The application does not process
   reservations or handle any financial transaction. Arrangements and payment
   are made directly between the tenant and the owner. The application is a
   guide to which boarding houses are worth visiting, not a booking platform.

2. **In-application messaging.** There is no chat or messaging feature between
   tenants and owners.

3. **A separate owner role.** The original proposal described three user roles
   — tenant-seeker, owner, and administrator. The developed system implements
   two: tenant-seeker and administrator. Listings are submitted and published
   through the administrator account rather than by owners registering
   independently. This was descoped to keep the verification of listings under
   a single moderated account within the project timeframe.

4. **QR-based listing lookup.** The proposal included retrieval of a listing by
   scanning a QR code displayed at a property. This feature was not implemented
   and is declared descoped.

5. **Verification of listing accuracy.** The system relies on the
   administrator's review of submitted information. It does not independently
   verify that a boarding house exists, that its stated price is current, or
   that its amenities are as described.

6. **Geographic coverage.** Listings are limited to the Tagum City area. The
   application will function elsewhere, but no listings exist outside the study
   area.

7. **Internet dependency.** Searching, routing, and map tiles require an
   internet connection. Only saved and recently viewed listings are available
   offline.

---

## Significance of the Study

**To students and young professionals.** The primary beneficiaries. The
application reduces the time, transport cost, and uncertainty involved in
finding accommodation near the campus, and allows a decision to be made from
information gathered in one place rather than from several separate visits.

**To boarding house owners.** Listings reach an audience beyond those who
happen to pass a tarpaulin or belong to a particular social media group, at no
cost to the owner.

**To the University of Mindanao Tagum College community.** Incoming students,
particularly those from outside Tagum City, are given a clearer picture of the
accommodation available near the campus before they arrive.

**To future researchers and developers.** The study documents a working
application of GPS-based proximity search, weighted multi-criteria ranking, and
road-following route generation applied to a local accommodation problem. The
scoring model and its rationale are documented and may be adapted, extended, or
challenged by later work.

**To the researchers.** The study applies the mobile development, database
design, and user interface principles taught in the programme to a problem the
researchers have personally encountered as students.

---

## Definition of Terms

The following terms are defined as they are used operationally in this study.

**Amenity.** A facility or service provided by a boarding house, such as
internet access, air conditioning, a private comfort room, kitchen access,
laundry facilities, parking, or a study area.

**Boarding house.** A residential property offering rooms for rent to
individuals, typically on a monthly basis, commonly occupied by students and
young workers living away from their family home.

**Haversine formula.** A mathematical formula that calculates the
great-circle distance between two points on a sphere given their latitude and
longitude. In this study it is used to compute the distance between the user's
position and a boarding house.

**Location-based service.** A software capability that uses the geographic
position of a device to provide information relevant to that position. In this
study, it is the basis of the proximity search.

**Match score.** A value out of 100 computed by the system for each listing,
combining proximity to the user (40 points), fit with the user's stated budget
(30 points), and the proportion of required amenities present (30 points). It
is the basis on which listings are ranked.

**Room type.** The classification of accommodation offered, defined in this
study as *Single* (occupied by one tenant), *Shared* (occupied by more than one
tenant), or *Studio* (a self-contained unit).

**Tenant-seeker.** A registered user searching for accommodation. The primary
user role of the application.

**Turn-by-turn directions.** A sequence of written navigation instructions
generated for a route, each describing a single manoeuvre, such as a turn onto
a named road.

---

## What the `[CITE]` markers need

Nothing in this chapter is invented as a fact, but five statements need
external support before submission. Each one is a real claim that a reader may
reasonably ask you to prove:

| Location | What it needs |
|---|---|
| Introduction, ¶1 | Enrolment figures for UM Tagum College, or data on student migration within Davao del Norte. The Registrar's Office is the most direct source. |
| Introduction, ¶4 | A statistic on smartphone ownership among Filipino students or young adults. DICT, PSA, or a published survey. |
| Statement of the Problem, Q1 | Evidence that the difficulty is real. **Your own survey of UM Tagum students is the strongest option here** and is worth conducting — the chapter is considerably weaker without it. |
| Statement of the Problem, Q3 | The name of the evaluation instrument you will use. |
| Specific Objective 5 | The same instrument, cited consistently. |

If your adviser requires a Review of Related Literature, that belongs in
Chapter 2 and is not included here.
