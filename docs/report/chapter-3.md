# CHAPTER 3

## Testing

### Testing Strategy

BoardEase has **no automated test suite**. That is stated plainly because the
repository will show it. Within the project's timeframe the team judged that
effort was better spent on the application itself, and testing was carried out
by three other means, each of which catches a different class of fault.

**1. Static type checking.** TypeScript runs in strict mode, and
`npx tsc --noEmit` is run before every commit. This is the cheapest test in the
project and catches an entire category of defect before the application is even
started — a misspelled property, a value that might be `null`, a function
called with the wrong arguments, a navigation target that does not exist. When
the Map screen was moved from the navigation stack into the bottom tab bar, it
was the type checker that reported every call site still passing the old
parameters.

**2. Bundle verification.** After each significant change the Metro bundler is
asked to build the complete JavaScript bundle. A successful build proves every
import in the project resolves. This catches what the type checker cannot: a
file that was deleted but still imported, a package that was never installed, a
Babel configuration that silently breaks. The current bundle is approximately
11.8 MB across 1,560 modules.

**3. Manual testing on a physical device.** The application is run through
Expo Go on a real Android handset and exercised screen by screen. This is the
only method that tests what the project actually depends on: a real GPS fix, a
real network, a real camera, and a real finger on a 44-point touch target. An
emulator would have to fake the location, which is the centre of this
application.

**What each method can and cannot find**

| Method | Finds | Misses |
|---|---|---|
| Type checking | Wrong types, missing properties, bad navigation targets | Anything about behaviour or appearance |
| Bundle build | Unresolved imports, missing packages, build configuration faults | Anything that compiles but behaves wrongly |
| Manual on device | Visual faults, wrong behaviour, permission handling, real GPS | Anything not exercised; regressions in untouched screens |
| Structured review | Silent faults — leaked subscriptions, unhandled rejections, duplicated logic | Faults that only appear under real use |

**The honest limitation.** Manual testing does not scale and does not repeat.
A change to the design system touches all sixteen screens, but only the screens
someone thinks to open get retested. This is the strongest argument for
automated tests in any future version, and it is recorded here rather than
glossed over.

### Test Cases

The cases below were exercised on a physical device through Expo Go. They are
the cases that matter: the main path through the application, and the failure
paths that are easy to get wrong.

**Authentication**

| # | Test | Expected | Result |
|---|---|---|---|
| T-01 | Register with a valid email and a 6-character password | Account created; application opens on Home | Pass |
| T-02 | Register with a password under 6 characters | Inline message "Use at least 6 characters"; no submission | Pass |
| T-03 | Register with mismatched confirmation | Inline message "The two passwords do not match" | Pass |
| T-04 | Log in with a wrong password | "Email or password is incorrect. Check them and try again." | Pass |
| T-05 | Log in with no internet | "Could not reach the server. Check your internet connection." | Pass |
| T-06 | Tap the eye icon on the password field | Password becomes readable | Pass |

**Search and ranking**

| # | Test | Expected | Result |
|---|---|---|---|
| T-07 | Open Search with location granted | Listings appear, nearest first, each showing a distance | Pass |
| T-08 | Open Search with location denied | Listings still appear; banner reads "Browsing without distance"; no distances shown | Pass |
| T-09 | Switch to *Recommended* | Order changes; each card shows a match percentage | Pass |
| T-10 | Apply a maximum price filter | Only listings at or under that price remain; a removable chip appears | Pass |
| T-11 | Apply filters that match nothing | "No matches" with the applied filter count and a "Clear filters" action | Pass |
| T-12 | Pull to refresh | Spinner appears; list reloads | Pass |

**Saving and comparing**

| # | Test | Expected | Result |
|---|---|---|---|
| T-13 | Tap the heart on a listing card | Heart fills; the listing appears under Saved | Pass |
| T-14 | Tap the heart twice quickly | Exactly one favourite row is created | Pass |
| T-15 | Tap the heart with no internet | Heart reverts and "Could not save" is shown | Pass |
| T-16 | Add two listings to compare | Compare bar appears showing the count | Pass |
| T-17 | Open Compare | Both listings shown side by side across price, room type, distance, rating and each amenity | Pass |
| T-18 | Tap a column heading in Compare | That listing's detail screen opens | Pass |

**Map and navigation**

| # | Test | Expected | Result |
|---|---|---|---|
| T-19 | Open the Map tab | Map loads with a price marker per listing | Pass |
| T-20 | Tap a marker | The carousel scrolls to the matching card | Pass |
| T-21 | Swipe the carousel | The map pans and the matching marker highlights | Pass |
| T-22 | Tap "Get directions" | A route is drawn along roads with turn-by-turn steps listed | Pass |
| T-23 | Walk while the Route Guide is open | The position marker follows; remaining distance counts down | Pass |
| T-24 | Leave the Route Guide screen | GPS tracking stops | Pass — after the fix in BUG-07 |

**Reviews and administration**

| # | Test | Expected | Result |
|---|---|---|---|
| T-25 | Submit a review with a rating and text | Review appears in the list; the average updates | Pass |
| T-26 | Attempt a second review on the same listing | Blocked, with the reason given | Pass |
| T-27 | Submit an empty review | Inline message; no submission | Pass |
| T-28 | Open the Admin panel as a tenant | Refused with "Administrators only" | Pass |
| T-29 | Approve a pending listing as an administrator | Listing leaves the queue and appears in search | Pass |
| T-30 | Reject a listing | Confirmation names the listing; deleted only on confirm | Pass |

**Interface and theme**

| # | Test | Expected | Result |
|---|---|---|---|
| T-31 | Switch to dark mode | Every screen changes, including the map | Pass — after the fix in BUG-03 |
| T-32 | Close and reopen the application | The theme choice is remembered | Pass |
| T-33 | Open Saved with no internet | Cached listings shown behind an offline banner | Pass |
| T-34 | Log out, then log in as another account | The first account's cached data is gone | Pass |

### Bug Tracking

**No formal bug tracking system was used.** No Jira, no GitHub Issues, no
spreadsheet. Defects were found during development and during the structured
review described in Chapter 2, and were fixed immediately. The record of them
is the Git commit history: each fix states the defect and its cause.

This is a genuine weakness of the process. With four people and no shared list,
a defect noticed by one member and not fixed at once could be forgotten. It did
not cause a problem at this scale, but it would not survive a larger team.

**Defects found and fixed.** The following were significant enough to record.
Each is traceable to a commit.

| ID | Defect | Cause | Resolution |
|---|---|---|---|
| BUG-01 | Saving a listing from Search did nothing; the shortlist stayed empty | The favourite logic existed only inside the Details screen. The `+` on a listing card added to the comparison tray instead, so there was no way to save from Search at all. | Extracted to `utils/favorites.ts`, used by Search, Details and Favorites. The `+` became a compare icon so the two actions are no longer confusable. |
| BUG-02 | The Compare screen was a dead end | Comparing is how a decision is made, but no column linked anywhere, so the chosen listing had to be found again by hand. | Column headings open the listing. |
| BUG-03 | The map ignored dark mode | The map is a WebView with its own CSS, which was not part of the theme. | The page is rebuilt when the theme changes, and the tile layer is inverted in CSS for dark mode. |
| BUG-04 | "API KEY REQUIRED" printed across the map | CARTO tiles were adopted for their dark variant. They now require a key, and refuse by returning HTTP 200 with a valid PNG that has the warning printed into the image. A status-code check passed. | Reverted to OpenStreetMap. Dark mode is produced by CSS inversion. |
| BUG-05 | Listing photographs were unrelated images | The seeded listings pointed at `picsum.photos`, which returns a random photograph per seed string. One listing showed a mountain, another a cup of coffee. | `scripts/addPhotos.mjs` updates each listing with a photograph matched to its price and room type. |
| BUG-06 | The Notifications screen showed two stacked headers | The screen was moved into the navigation stack, which supplies a header, but it kept drawing its own. | Removed the second header. The clear-all action moved into the status row, which also restored a function that had become unreachable. |
| BUG-07 | GPS kept running after leaving the Route Guide | The location subscription is created after an `await`. If the screen was left during that wait, the cleanup had already run and nothing ever stopped the watcher. | The cancellation flag is re-checked after the await, and the subscription is removed if the screen is gone. |
| BUG-08 | The Map screen never showed loading or error | Both states were computed and never rendered, so a failed fetch looked identical to an empty catalogue, with no retry. | Both are rendered, with a retry action. |
| BUG-09 | "Nearest" appeared to do nothing without GPS | The control reloaded but never changed the sort mode, so it never looked selected. | The mode is always set; a reload is additional. |
| BUG-10 | Filtering was impossible offline with alerts enabled | A failed save of the alert copy aborted the whole apply, so the visible list never changed. | The filters are applied regardless; only the alert copy reports a failure. |
| BUG-11 | A favourite that failed to save reverted silently | The interface undid the change without saying why, so the user believed the listing was saved when it was not. | Both Search and Details now report the failure. |
| BUG-12 | Every card collapsed to the width of its own text in the Figma prototype | Children were added to the layout without being told to fill the available width. | Children stretch to the gutter width. |

**Where the review found what running the application could not.** BUG-07,
BUG-08, BUG-09, BUG-10 and BUG-11 are all invisible in normal use. A leaked GPS
subscription shows no symptom on screen; a silent revert looks like a missed
tap. These were found by reading the code against a checklist, which is the
argument for doing that at least once before submission.

---

## Deployment

### Deployment Process

BoardEase is distributed through **Expo Go** rather than an app store. The
application is not compiled into a native binary; the JavaScript bundle is
served from a development machine and loaded by the Expo Go client on the
handset.

This is appropriate for a course project — it needs no developer account, no
signing certificates and no store review — and it is stated here as the
deployment method rather than implied to be a store release.

**Steps to deploy for a demonstration:**

1. **Install dependencies** — `npm install` in the project root. Required once,
   and again after any change to `package.json`.
2. **Seed the database**, if it is empty — `node scripts/seedData.mjs`. This
   creates the four sample listings around the campus. It must be run **once**:
   it only adds, so a second run produces eight listings.
3. **Attach photographs** — `node scripts/addPhotos.mjs`. This updates existing
   listings in place, matching on title, and is safe to run more than once.
4. **Create an administrator** — register the account inside the application,
   then `node scripts/makeAdmin.mjs <email>`. Log out and back in so the role
   is re-read.
5. **Start the development server** — `npm start`.
6. **Connect the handset** — scan the QR code with Expo Go. The phone and the
   computer must be on the same network.

**Pre-demonstration checklist**

| Check | Why |
|---|---|
| Listings exist and are approved | Only `isApproved == true` appears in search |
| Photographs attached | Otherwise every card shows a placeholder |
| An administrator account exists | Needed to show approval and moderation |
| A second ordinary account exists | Needed to show the tenant view |
| Location permission granted | Without it there are no distances and no match scores |
| A route draws | Confirms OSRM is reachable on the network in use |
| The offline cache is warm | Open Saved once while online, then test in aeroplane mode |
| Network is not a captive portal | Map tiles and routing fail behind a login page |

### Environment Setup

The project has **two environments**, which share a single Firebase project.

**Development.** Metro serves the bundle over the local network; the
application runs inside Expo Go. `__DEV__` is true, so React Native's
development warnings and the shake-to-open developer menu are available. Source
maps are included, and the bundle is not minified.

**Production.** Not exercised in this project. A production build would mean
`eas build` producing an `.apk` or `.ipa`, with the bundle minified and
embedded in the binary rather than served. The application would then run
without a development server. This is recorded as what production *would*
require, not as something that was done.

**Configuration.** Firebase settings live in `src/firebaseConfig.ts` and point
at the project `boardease-aefc2`. The values are not secret — Firebase web
configuration is designed to be public, and security comes from the server-side
rules in `firestore.rules`, not from hiding the configuration. Anyone
reproducing this project would create their own Firebase project, enable
Email/Password authentication, Firestore and Storage, and paste their own
configuration into that file.

**Prerequisites:** Node.js 18 or newer; the Expo Go application on an Android
or iOS handset; both devices on the same network.

### Rollback Procedures

Because deployment is a development server rather than a published binary,
rollback is a Git operation.

**To return to a previous version:**

```bash
git log --oneline          # find the commit to return to
git checkout <commit>      # inspect that version
git checkout main          # return
```

To undo a change that has been pushed, `git revert <commit>` is preferred over
`git reset`: it creates a new commit undoing the change and leaves the history
intact, so nobody else's copy of the repository breaks.

**Data cannot be rolled back this way.** Firestore has no version history on
the free plan. A deleted listing or review is gone. This is why every
destructive action in the application confirms first and names what it will
delete, and why rejection is the only operation that removes a listing
permanently.

**If a dependency change breaks the build**, delete `node_modules` and
`package-lock.json`, then `npm install` from the restored `package.json`.
`npx expo start -c` clears the Metro cache, which is the usual cause of a
failure that survives a restart.

### User Acceptance

The template requires evidence that the application was accepted by the people
it was built for.

**The accepting party is the tenant-seeker, not the boarding house owner.**
Chapter 1 names tenant-seekers — students and young professionals searching for
accommodation — as the primary end users, and records boarding house owners as
indirect beneficiaries who hold no account in this version. Acceptance is
therefore evidenced by the people who actually operate the application.

**The listings are demonstration data, not real properties.** The four seeded
listings carry invented names, barangay-level addresses and approximate
coordinates within the study area. No real owner's property, contact details or
personal information appears in the system, and the data model has no field for
an owner's contact number. Acceptance testing accordingly does not require any
owner's participation or consent.

**Method.** Acceptance is established by a session with student participants
drawn from the intended user group. Each participant completes the same four
tasks unaided, since these are the journeys the application exists to support:

| Task | What the participant is asked to do |
|---|---|
| A | Find the boarding houses nearest to campus within a stated budget |
| B | Put two listings side by side and choose between them |
| C | Get walking directions to the chosen listing and follow them on the map |
| D | Read the reviews for a listing and leave one |

A participant who completes all four without being shown how is recorded as
accepting the application. Each signs a short acceptance form stating which
tasks they completed and any difficulty encountered. The signed forms are
attached as an appendix.

**Status: the session has not yet been conducted at the time of writing.** It
is recorded as outstanding rather than presented as complete.

---

## Maintenance

### Maintenance Plan

**Responsibility.** For the duration of the course, the four developers named in
Chapter 1. After submission there is no funded maintenance arrangement, and
that is stated rather than implied.

**Routine tasks**

| Task | When | Why |
|---|---|---|
| Review pending listings | Weekly, if the application is in use | Submissions sit invisible until approved |
| Moderate reviews | Weekly | Spam and offensive text are removed by hand |
| Verify listing accuracy | Each term | Rents change; a listing can close |
| Check external services | Before any demonstration | OSRM and OpenStreetMap are free services with no uptime guarantee |
| Update dependencies | Each Expo SDK release | Expo supports a limited number of past versions |

**Known risks to plan for**

1. **Expo SDK ageing.** Expo Go supports only recent SDK versions. When Expo
   moves past SDK 57, this application will need updating before it will run in
   a current Expo Go.
2. **Free-tier limits.** The Firebase Spark plan has daily read and write
   quotas. Sustained real use would exceed them.
3. **OSRM has no uptime guarantee.** The public demonstration server may be
   slow or unavailable. Directions fail cleanly when it is, but they do fail.
4. **No automated tests.** Any future change must be verified by hand across
   all sixteen screens.

**Improvements worth making first**

| Priority | Item | Reason |
|---|---|---|
| High | Automated tests for scoring, distance and filtering | Pure functions, easily tested, and the ranking is the core of the application |
| High | Owner role | Listings currently reach the system only through an administrator |
| Medium | Real local notifications | `expo-notifications` is installed but never imported; alerts appear only inside the application |
| Medium | Session persistence | The login is not remembered across a full restart |
| Low | QR listing lookup | Named in the proposal, not built |

### Documentation Updates

The documentation is version-controlled alongside the code in `docs/`, so a
change to the application and the change to its description can arrive in the
same commit.

| Document | Contents | Update when |
|---|---|---|
| `chapter-1.md` | Requirements | A requirement changes |
| `chapter-2.md` | Architecture and design | The structure or data model changes |
| `chapter-3.md` | Testing, deployment, maintenance | A process changes |
| `01-features-vs-proposal.md` | Traces each proposal item to code | A proposal commitment is built or descoped |
| `02-screens.md` | Every screen and its connections | A screen is added or its navigation changes |
| `04-setup.md` | How to run it | A setup step changes |
| `diagrams/*.drawio` | The six system diagrams | Architecture or the data model changes |

**One rule learned the hard way.** The diagrams and the written chapters must
be checked against each other, not only against the code. During the writing of
Chapter 2 the entity relationship diagram was found to be missing the
`alertsEnabled` field that the chapter described and the code used. The diagram
was corrected. Two documents describing one system will drift unless something
compares them.

The same problem produced BUG-04 and BUG-05: a value that looked correct was
never actually examined. The habit that prevents it is to verify the artefact
itself, not the status of the request that produced it.

### User Support

**Channels.** For the course, the four developers. There is no help desk and no
support email, and inventing one would be dishonest.

**Self-service help inside the application.** Several common problems are
answered where they occur rather than in a manual:

- Location refused → the Search banner explains the consequence and offers a
  route to the phone's settings
- No connection → Saved shows cached listings behind a banner saying so
- No matches → the empty state gives the applied filter count and a clear action
- No route → the Route Guide states that directions could not be generated
- Not an administrator → the Admin screen refuses with a plain explanation

**Troubleshooting reference.** `docs/report/04-setup.md` covers the faults seen
during development: the QR opening the wrong project, an empty search, the
missing admin button, the location prompt not appearing, a blank map, and a
stale Metro cache.

**Reporting a fault.** With no tracker in place, faults should be raised as
GitHub Issues on the repository. This is the recommended improvement over the
informal process actually used, described earlier in this chapter.

---

## Conclusion

### Summary

BoardEase is a mobile application that helps students and young professionals
find, compare and navigate to boarding houses near University of Mindanao Tagum
College. It is built with React Native and Expo from one codebase for Android
and iOS, backed by Firebase, with mapping from OpenStreetMap and routing from
OSRM.

The five objectives set out in Chapter 1 were met. Location-based search
returns listings ordered by distance computed with the Haversine formula.
Ranking scores each listing out of 100 on proximity, budget fit and amenity
coverage. Comparison places two or three listings side by side. Navigation
draws a route along real roads and follows the user as they walk. Ratings are
aggregated per listing and displayed wherever that listing appears.

Two commitments in the proposal were **not** delivered: a separate owner role,
and QR-based listing lookup. Both are declared in Chapter 1 under *Out of
scope*, with the reasons.

What the project demonstrates beyond the feature list: a serverless
architecture using managed services in place of a custom backend; an interface
built on a single design system rather than per-screen values; and a working
account of its own defects, including several that were only found by reading
the code rather than running it.

### Future Work

**Near term**

1. **Automated tests**, beginning with scoring, distance and filtering. They are
   pure functions, the easiest thing in the project to test, and they are the
   part a change is most likely to break unnoticed.
2. **The owner role**, so owners can submit and manage their own listings
   instead of going through an administrator.
3. **Real local notifications.** `expo-notifications` is installed but never
   imported; alerts currently appear only when the application is opened.
4. **Session persistence**, so a full restart does not require signing in
   again.

**Longer term**

5. **QR-based listing lookup**, completing the proposal.
6. **Server-side filtering**, needed if the catalogue ever reaches a scale where
   fetching everything and filtering on the device stops being sensible.
7. **Listing verification** — a process for confirming that a property exists
   and that its stated rent is current, which the system does not attempt.
8. **Wider coverage**, beyond Tagum City. Nothing in the design is specific to
   the area; only the data is.

**Explicitly not planned.** Booking, payment and messaging remain out of scope.
BoardEase is a guide to which boarding houses are worth visiting and how to
reach them. Adding transactions would make it a different product with
different obligations to its users.
