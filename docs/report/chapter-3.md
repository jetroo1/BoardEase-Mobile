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
11.1 MB across 1,574 modules.

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
A change to the design system touches all nineteen screens, but only the
screens someone thinks to open get retested. This is the strongest argument for
automated tests in any future version, and it is recorded here rather than
glossed over.

Two defects recorded below make the point concretely. BUG-20 was introduced by
the fix for BUG-19 — the type checker reported nothing, the bundle built, and
the application failed on the device the moment the feature was opened, because
TypeScript cannot see the order in which React hooks are called. BUG-22 was
real on Android and invisible on the web build of the same screen. Neither
would have survived a test that ran on every change.

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
| T-16 | Tap Compare on the first listing | The listing is added and the Search screen opens, so the second can be chosen without going back | Pass |
| T-17 | Open Compare with two listings | Both shown side by side across price, room type, distance, rating and each amenity | Pass |
| T-18 | Tap a column heading in Compare | That listing's detail screen opens | Pass |
| T-19 | Add a third and fourth listing to the comparison | All four appear; the table shares out the width and scrolls only at four | Pass |
| T-20 | Attempt to add a fifth | Refused, naming the limit of four | Pass |
| T-21 | Read a row with different values | The best value is tinted and labelled — "Cheapest", "Nearest", "Top rated" | Pass |
| T-22 | Read a row where every value is equal | Nothing is marked, rather than one listing being singled out arbitrarily | Pass |
| T-23 | Tap "Clear comparison" | A confirmation names every listing about to be removed, and offers to keep them | Pass — after the fix in BUG-22 |
| T-24 | Remove a single listing from a column | Only that one goes; the remaining columns re-share the width | Pass |

**Map and navigation**

| # | Test | Expected | Result |
|---|---|---|---|
| T-25 | Open the Map tab | Map loads with a price marker per listing | Pass |
| T-26 | Tap a marker | The carousel scrolls to the matching card | Pass |
| T-27 | Swipe the carousel | The map pans and the matching marker highlights | Pass |
| T-28 | Tap "Get directions" | A route is drawn along roads with turn-by-turn steps listed | Pass |
| T-29 | Walk while the Route Guide is open | The position marker follows; remaining distance counts down | Pass |
| T-30 | Leave the Route Guide screen | GPS tracking stops | Pass — after the fix in BUG-07 |

**Reviews and administration**

| # | Test | Expected | Result |
|---|---|---|---|
| T-31 | Submit a review with a rating and text | Review appears in the list; the average updates | Pass |
| T-32 | Attempt a second review on the same listing | Blocked, with the reason given | Pass |
| T-33 | Submit an empty review | Inline message; no submission | Pass |
| T-34 | Open the Admin panel as a tenant | Refused with "Administrators only" | Pass |
| T-35 | Approve a pending listing as an administrator | Listing leaves the queue and appears in search | Pass |
| T-36 | Reject a listing | Confirmation names the listing; deleted only on confirm | Pass |

**Interface and theme**

| # | Test | Expected | Result |
|---|---|---|---|
| T-37 | Switch to dark mode | Every screen changes, including the map | Pass — after the fix in BUG-03 |
| T-38 | Close and reopen the application | The theme choice is remembered | Pass |
| T-39 | Open Saved with no internet | Cached listings shown behind an offline banner | Pass |
| T-40 | Log out, then log in as another account | The first account's cached data is gone | Pass |

**Profile picture**

| # | Test | Expected | Result |
|---|---|---|---|
| T-41 | Tap the avatar and photograph oneself | The picture is squared when it is taken, uploaded, and shown at once | Pass |
| T-42 | Choose a picture from the phone instead | Same result; the gallery permission is requested first | Pass |
| T-43 | Close and reopen the application | The picture is still there | Pass |
| T-44 | Remove the picture | The avatar returns to the initial of the account's email | Pass |
| T-45 | Save a picture before the security rules were published | "Could not save your picture" with the reason, rather than a silent failure | Pass |

**Guided tour**

| # | Test | Expected | Result |
|---|---|---|---|
| T-46 | Sign in on a new account and open Home | The tour starts and highlights the search field | Pass — after the fixes in BUG-19 and BUG-21 |
| T-47 | Step through to the end | Each highlight sits on the control being described | Pass — after the fix in BUG-21 |
| T-48 | Press Skip | The tour closes and does not return to that screen | Pass |
| T-49 | Press the Android back button mid-tour | The tour closes; the screen underneath is not left | Pass |
| T-50 | Reopen the same screen later | No tour; it has already been seen | Pass |
| T-51 | Use "Show the tour again" on Profile | Every screen introduces itself once more | Pass |
| T-52 | Sign in as a second account on the same handset | That account gets its own tour | Pass |

**Account recovery and verification**

| # | Test | Expected | Result |
|---|---|---|---|
| T-53 | Request a password reset from Profile | A reset link is sent and the screen says which address it went to | Pass |
| T-54 | Request a reset for an address with no account | The same confirmation is shown, revealing nothing about who holds an account | Pass |
| T-55 | Follow the reset link and set a new password | The old password is refused afterwards and the new one works | Pass |
| T-56 | Register and attempt to use the application before confirming the email | Held at the verification screen; listings are not readable | Pass |
| T-57 | Confirm the email, then return | The application opens normally | Pass |

**Photographs**

| # | Test | Expected | Result |
|---|---|---|---|
| T-58 | Add a listing photograph from the camera | Uploaded to Cloudinary; the returned URL is stored on the listing | Pass — after the fix in BUG-15 |
| T-59 | Add several photographs from the gallery at once | All are uploaded, in order, up to the limit of ten | Pass |
| T-60 | Lose the connection part-way through a multiple upload | Those already uploaded are kept; the failure names the one that did not | Pass |
| T-61 | Attempt an eleventh photograph | Refused, naming the limit | Pass |
| T-62 | Open a listing that has no photograph | A generated placeholder derived from the title, not a broken image | Pass |

**Offline behaviour**

| # | Test | Expected | Result |
|---|---|---|---|
| T-63 | Open Saved in aeroplane mode, having opened it once online | The cached listings appear behind an offline notice | Pass |
| T-64 | Open Saved offline on an account that has never been online | An empty state, not an error | Pass |
| T-65 | Open a listing offline | It is read from the cache where available; otherwise the failure is explained and retryable | Pass |
| T-66 | Restore the connection and reopen | Fresh data replaces the cached copy | Pass |

**Administration**

| # | Test | Expected | Result |
|---|---|---|---|
| T-67 | Add a listing as an administrator | Published immediately, without passing through the approval queue | Pass |
| T-68 | Edit an existing listing | The same form opens filled in; saving updates rather than duplicating | Pass |
| T-69 | Hide a listing | It leaves tenant search but remains in the administrator's list | Pass |
| T-70 | Delete a listing | Its reviews are deleted with it, so none is left pointing at nothing | Pass |
| T-71 | Search the administrator dashboard | Every listing is found, including unapproved ones | Pass |

**Privacy and role access**

| # | Test | Expected | Result |
|---|---|---|---|
| T-72 | Open the Admin panel as a tenant | Refused — the role is read from the server, not from the application | Pass |
| T-73 | Attempt to write a listing as a tenant, bypassing the interface | Refused by the security rules | Pass |
| T-74 | Read another account's favourites | Refused; the rules scope favourites to their owner | Pass |
| T-75 | View a review written by somebody else | Only the part of their email before the `@` is shown | Pass — after the fix in BUG-14 |
| T-76 | Register a new account and inspect the stored profile | A consent record is written with the account, carrying the version of the terms accepted and the time | Pass |
| T-77 | Attempt to change one's own role to administrator | Refused by the rules, which compare the submitted role against the stored one | Pass |
| T-78 | Save a profile picture | Stored as an https link; a non-https value is refused by the rules | Pass |

### Bug Tracking

**No formal bug tracking system was used.** No Jira, no GitHub Issues, no
spreadsheet. Defects were found during development and during the structured
review described in Chapter 2, and were fixed immediately. The record of them
is the Git commit history: each fix states the defect and its cause.

This is a genuine weakness of the process. With four people and no shared list,
a defect noticed by one member and not fixed at once could be forgotten. It did
not cause a problem at this scale, but it would not survive a larger team.

**Defects found and fixed.** The following were significant enough to record.
Each is traceable to a commit, and the date given is the date that commit
landed.

**Severity is judged by what the defect cost the person using the application,
not by how hard it was to fix.** *Critical* means the application would not
run; *High* means a feature silently did the wrong thing or could not be used
at all; *Medium* means a feature worked but misled or obstructed; *Low* means
the fault was cosmetic. Every defect listed is closed — anything still open is
in *Future Work* instead, because a bug table that quietly mixes the two is
how a known fault gets forgotten.

| ID | Date | Severity | Defect | Cause | Resolution | Status |
|---|---|---|---|---|---|---|
| BUG-01 | 22 Sep | High | Saving a listing from Search did nothing; the shortlist stayed empty | The favourite logic existed only inside the Details screen. The `+` on a listing card added to the comparison tray instead, so there was no way to save from Search at all. | Extracted to `utils/favorites.ts`, used by Search, Details and Favorites. The `+` became a compare icon so the two actions are no longer confusable. | Fixed |
| BUG-02 | 22 Sep | Medium | The Compare screen was a dead end | Comparing is how a decision is made, but no column linked anywhere, so the chosen listing had to be found again by hand. | Column headings open the listing. | Fixed |
| BUG-03 | 23 Sep | Medium | The map ignored dark mode | The map is a WebView with its own CSS, which was not part of the theme. | The page is rebuilt when the theme changes, and the tile layer is inverted in CSS for dark mode. | Fixed |
| BUG-04 | 23 Sep | High | "API KEY REQUIRED" printed across the map | CARTO tiles were adopted for their dark variant. They now require a key, and refuse by returning HTTP 200 with a valid PNG that has the warning printed into the image. A status-code check passed. | Reverted to OpenStreetMap. Dark mode is produced by CSS inversion. | Fixed |
| BUG-05 | 24 Sep | Low | Listing photographs were unrelated images | The seeded listings pointed at `picsum.photos`, which returns a random photograph per seed string. One listing showed a mountain, another a cup of coffee. | `scripts/addPhotos.mjs` updates each listing with a photograph matched to its price and room type. | Fixed |
| BUG-06 | 24 Sep | Low | The Notifications screen showed two stacked headers | The screen was moved into the navigation stack, which supplies a header, but it kept drawing its own. | Removed the second header. The clear-all action moved into the status row, which also restored a function that had become unreachable. | Fixed |
| BUG-07 | 25 Sep | High | GPS kept running after leaving the Route Guide | The location subscription is created after an `await`. If the screen was left during that wait, the cleanup had already run and nothing ever stopped the watcher. | The cancellation flag is re-checked after the await, and the subscription is removed if the screen is gone. | Fixed |
| BUG-08 | 25 Sep | Medium | The Map screen never showed loading or error | Both states were computed and never rendered, so a failed fetch looked identical to an empty catalogue, with no retry. | Both are rendered, with a retry action. | Fixed |
| BUG-09 | 25 Sep | Medium | "Nearest" appeared to do nothing without GPS | The control reloaded but never changed the sort mode, so it never looked selected. | The mode is always set; a reload is additional. | Fixed |
| BUG-10 | 25 Sep | Medium | Filtering was impossible offline with alerts enabled | A failed save of the alert copy aborted the whole apply, so the visible list never changed. | The filters are applied regardless; only the alert copy reports a failure. | Fixed |
| BUG-11 | 25 Sep | High | A favourite that failed to save reverted silently | The interface undid the change without saying why, so the user believed the listing was saved when it was not. | Both Search and Details now report the failure. | Fixed |
| BUG-12 | 26 Sep | Low | Every card collapsed to the width of its own text in the Figma prototype | Children were added to the layout without being told to fill the available width. | Children stretch to the gutter width. | Fixed |
| BUG-13 | 01 Oct | High | The heart reported "check your internet connection" on a listing that had never been saved | The rules allowed a read only where `resource.data.userId` matched the account. On a document that does not exist `resource` is null, so the comparison was an error rather than a false, and the lookup that precedes every save was denied. Saving a listing for the first time could therefore never work. | `get` and `list` were separated. A `get` is permitted when the document is absent, which gives nothing away: the identifier is the account's own uid, so a person can only ask about their own rows. | Fixed |
| BUG-14 | 01 Oct | High | Reviewers' email addresses were published under their reviews | The review stored and displayed whatever the account was registered with. | Masked to the part before the `@`, at the point of writing and at all three places that render a review. | Fixed |
| BUG-15 | 30 Sep | High | Photographs could not be uploaded from the handset | Two separate causes. React Native's `Blob` holds a reference to native data rather than the data itself, so the request body arrived empty; and as of React Native 0.86 the `{uri, name, type}` form of `FormData` is rejected outright. Firebase Storage also turned out to require a paid plan. | Photographs are sent as a base64 data URI in a form-encoded body, to Cloudinary, whose free tier needs no card. | Fixed |
| BUG-16 | 01 Oct | Medium | The application forgot the signed-in account on every launch | Firebase Auth defaults to in-memory persistence on React Native. | Initialised with AsyncStorage persistence, falling back to the default if that is unavailable. | Fixed |
| BUG-17 | 01 Oct | Medium | The administrator's pending queue was always empty | It queried for `isApproved == false`, but a listing added by an administrator is approved on creation, so nothing could ever match. | The tab lists every listing, unapproved first, with approve, edit, hide and delete. | Fixed |
| BUG-18 | 02 Oct | Low | A white flash on every navigation in dark mode | Android's window is white beneath React Native. Every screen is opaque, so it is invisible at rest, but the native stack shows it for a few frames during a push. | The window colour follows the theme at runtime. It could not be set in `app.json`, where the value is fixed at build time and this application has two themes. | Fixed |
| BUG-19 | 05 Oct | Medium | Every tour highlight sat one status bar above the control it described | The overlay was a `Modal` opened with `statusBarTranslucent`, which measures from the top of the screen, while `measureInWindow` — how each control reports its position — answers relative to the window, which starts below the status bar. | The overlay is drawn in the same tree as the screens, so the two origins are the same. It also measures its own position and subtracts it, so any remaining difference cancels rather than being corrected by a constant that would be wrong on the next handset. | Fixed |
| BUG-20 | 05 Oct | Critical | The tour crashed the application with "change in the order of Hooks" | The fix for BUG-19 moved a hook below an early `return null`, so it ran only while a tour was open and the hook count changed between renders. | The hook was moved above the return. Recorded because it shows what the type checker cannot see: `tsc` and the bundler both passed. | Fixed |
| BUG-21 | 06 Oct | Medium | Highlights enclosed the wrong area even after BUG-19 | Each control measured itself in `onLayout` and the result was cached. Inside a scroll view that fires before the content has settled, so the stored coordinates were from an intermediate layout and were never corrected. | Controls register themselves rather than their position, and the overlay measures them when the step opens, repeating briefly while a screen is still settling. | Fixed |
| BUG-22 | 06 Oct | Medium | "Clear comparison" did nothing in the browser | The confirmation used `Alert.alert`, which React Native Web does not implement. It worked on a handset and failed silently on the web build of the same screen. | The confirmation is part of the screen, names every listing it will remove, and points at the per-listing Remove as the alternative. | Fixed |
| BUG-23 | 06 Oct | Medium | A four-way comparison showed two columns | Columns were a fixed width chosen when the screen held two listings. | The width is shared out among however many are being compared, with a floor below which a column cannot be read. | Fixed |
| BUG-24 | 06 Oct | Medium | The home search box stayed on "Loading boarding houses" for the rest of the session | The flag was cleared inside a guard that also discarded stale results, so leaving the screen mid-request meant nothing ever turned it off. | Discarding a superseded result and recording that the request ended are now separate. | Fixed |
| BUG-25 | 06 Oct | Low | "Nothing viewed yet" appeared on a screen that had history | The empty state rendered before the phone had been asked. | The screen distinguishes "nothing to show" from "do not know yet". | Fixed |

**Where the review found what running the application could not.** BUG-07,
BUG-08, BUG-09, BUG-10 and BUG-11 are all invisible in normal use. A leaked GPS
subscription shows no symptom on screen; a silent revert looks like a missed
tap. These were found by reading the code against a checklist, which is the
argument for doing that at least once before submission.

---

## Deployment

### Deployment Process

**The deployment method is Expo Go, and that is a development deployment, not a
production one.** The distinction is drawn here rather than left to be inferred,
because the two are not the same thing and the difference accounts for the one
complaint participants made.

BoardEase is not compiled into a native binary. The JavaScript bundle is built
on a development machine by the Metro bundler and fetched over the network by
the Expo Go client on the handset, screen by screen, as the application runs.
Nothing is installed but Expo Go itself.

| | Development deployment (what was done) | Production deployment (what was not) |
|---|---|---|
| Built by | Metro, on a laptop, on demand | `eas build`, once, ahead of time |
| Delivered as | A bundle fetched over the network | An `.apk` or `.ipa` installed on the device |
| Needs | A laptop running `npm start` on the same network | Nothing after installation |
| Code | Unminified, with development warnings and the shake menu | Minified, embedded in the binary |
| Each screen opened | May fetch more code across the network | Already present on the device |
| Requires | Nothing — no account, no certificates, no review | A developer account, signing certificates, store review |

This is the right choice for a course project: it needs no paid developer
account, no signing certificates and no store review, and the application can
be demonstrated on any handset in a minute. **It is also the direct cause of the
slowness participants reported** — see User Acceptance below, where the
per-screen fetch is measured. A production build removes that cost entirely
without a line of code changing, which is why it appears in *Future Work*.

Production was not exercised in this project. It is described above as what
production *would* require, not as something that was done.

**Steps to deploy for a demonstration:**

1. **Install dependencies** — `npm install` in the project root. Required once,
   and again after any change to `package.json`.
2. **Create an administrator** — register the account inside the application,
   then `node scripts/makeAdmin.mjs <email>`. Log out and back in so the role
   is re-read. The listing scripts below sign in as this account, because the
   rules permit only an administrator to write a listing.
3. **Load the listings** — with `BOARDEASE_EMAIL` and `BOARDEASE_PASSWORD` set
   in the environment, `node scripts/addListings.mjs scripts/listings.json`.
   This reads the sixteen boarding houses in that file, with their photographs
   and coordinates, and is safe to run more than once: a listing whose title
   already exists is skipped, or updated in place with `--force`.
4. **Remove the old samples**, if the database still holds them —
   `node scripts/removeListings.mjs --dry-run` to see what would go, then the
   same command without the flag. This deletes the four invented listings that
   `seedData.mjs` wrote while the project was a prototype, and their reviews
   with them.
5. **Start the development server** — `npm start`. The address the handset is
   given is worked out at every start rather than remembered, because a
   remembered one is wrong the moment the laptop joins a different network.
6. **Connect the handset** — scan the QR code with Expo Go. The phone and the
   computer must be on the same network. Where that network blocks traffic
   between its own clients, which several of the networks used during
   development did, `npm run tunnel` routes through the internet instead.

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
Email/Password authentication and Firestore, and paste their own configuration
into that file.

**Photographs are not held in Firebase.** Enabling Cloud Storage now requires
the Blaze plan, which requires a card on file even where the usage itself would
cost nothing, and that is not a reasonable thing to ask of a student project.
Photographs go to Cloudinary instead, whose free tier needs none, through an
unsigned upload preset. The preset is not a secret and is designed to sit in
client applications; the alternative is signing each upload with an API secret,
which would then have to ship inside the application where anybody could read
it. The lesser exposure was chosen deliberately, and it can be revoked from the
Cloudinary console without touching the application.

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

**The listings are real boarding houses, and the paper should say so.** An
earlier draft of this section recorded them as invented demonstration data and
concluded that no owner's consent was therefore needed. That is no longer
true. The application now holds sixteen boarding houses that exist, each with
its real name, its coordinates taken from its own Google Maps pin and checked
against OpenStreetMap, photographs of the actual property, and — for ten of
them — the owner's telephone number.

Those numbers come from the owners' own public Google Maps business listings.
They are information the owners chose to publish about their businesses, which
is the basis on which this project reproduces them, and the application
presents them unchanged rather than deriving anything from them. No owner holds
an account, submits anything, or is contacted through BoardEase; the
application is a guide to what exists and how to get there, and it arranges
nothing. An owner who wants a listing corrected or removed can ask the
administrator, who is the only role able to change one.

What this does mean is that the privacy obligations in Chapter 2 apply to real
people's contact details, not to invented ones.

**Lawful basis, stated plainly.** Under the Data Privacy Act of 2012, personal
information already made public by the data subject for a stated purpose may be
processed for that same purpose. Each number reproduced here was published by
the owner on their own Google Maps business listing, so that people looking for
a boarding house could ring them. BoardEase shows it to people looking for a
boarding house. The purpose is unchanged, which is the whole of the argument —
and it is why the application neither derives anything from the number nor uses
it for anything else.

**What was and was not obtained.** No owner was approached for written consent.
That is recorded here rather than implied, because it is the honest position:
the project relies on the public nature of the information, not on permission
given to this team. Where an owner supplied details directly — a contact number
for a house whose Maps listing has none — that is the owner handing information
to the project for exactly this use.

| Data | Source | Basis |
|---|---|---|
| Boarding house name | Owner's public Google Maps business listing | Published by the owner |
| Coordinates | The pin on that same listing, verified against OpenStreetMap | Published by the owner |
| Contact number | That listing, or given directly by the owner | Published by the owner, or supplied for this use |
| Photographs | Taken by the team on site | The team's own work |
| Rent and amenities | Enquiry on site | Given for this use |

**What the application does with it.** The number is displayed on the listing
and dialled only when a person taps it. It is never collected from users, never
sent anywhere else, never used to contact anyone automatically, and never
exposed through any endpoint the security rules do not already cover.

**Correction and removal.** An owner who wants a listing changed or taken down
can ask the administrator, who is the only role able to edit or delete one. No
account, request form or waiting period stands in the way — which matters,
because a right to object that is hard to exercise is not much of a right.

**Method.** Each participant registered their own account, used the
application unaided on their own handset, and then completed a two-part paper
instrument.

The first part is a *Participation Agreement*, which each participant signed.
It records that participation is voluntary and may be discontinued at any time,
that responses are treated confidentially and used only for academic purposes,
and — clause 8 — that individual responses are reported only in aggregate
unless the participant gives separate permission. That clause is why no
participant is named anywhere in this report, and why the account list that
evidences the session is cited rather than reproduced.

The second part is a *User Testing Survey*: eighteen statements rated on a
five-point scale from Strongly Agree (5) to Strongly Disagree (1), grouped into
five criteria, followed by five open-ended questions.

| Criteria | Statements | What it asks about |
|---|---|---|
| A. Ease of Use | 1–4 | Learning the application, finding features, navigation |
| B. Functionality | 5–8 | Whether features work, whether results are accurate, task completion |
| C. User Interface | 9–11 | Clarity of the layout, of the controls, and visual appeal |
| D. Performance | 12–14 | Responsiveness, smoothness, freedom from errors |
| E. Overall Experience | 15–18 | Satisfaction, usefulness, willingness to reuse and to recommend |

**Participants: n = 10.** Nine tenant-seekers and the course instructor, between
2 and 6 October 2026.

The two groups are counted together as evaluators and reported separately as
evidence, because they answer different questions. The nine are the intended
users, and their responses are what establishes acceptance. The instructor's
response is an assessment of the work; folding it into the acceptance figure
would let the supervisor's own marks raise the score the supervisor is marking.

| Group | n | Dates | What it evidences |
|---|---|---|---|
| Tenant-seekers | 9 | 2–6 Oct 2026 | Acceptance by the intended users |
| Course instructor | 1 | 2 Oct 2026 | Independent assessment of the work |
| **Total** | **10** | | |

Each of the nine registered a real account, independently evidenced by the
account-creation record in Firebase Authentication for those dates.

**Appendices.** Three sets of documents support this section and are attached:

| Appendix | Contents |
|---|---|
| A | The blank instrument — the Participation Agreement and the eighteen-statement survey, as issued |
| B | The ten signed Participation Agreements |
| C | The ten completed surveys, with ratings and written answers |

Appendix B is the signed acceptance record: each participant's agreement to
take part and to have their responses used, with signature and date. It is
reproduced in full because the claim that acceptance was obtained is only worth
as much as the evidence behind it.

**The course instructor evaluated the application separately**, on the same
instrument, on 2 October 2026. She is counted apart from the nine participants
because she is not a tenant-seeker: her evaluation is an assessment of the work,
not evidence that the intended users accepted it, and merging the two would
overstate the second.

She rated **all eighteen statements 5 — Strongly Agree**, across every criterion
including Performance, and recorded no difficulties and no errors. Her written
answers were that "the application is convenient and serves its purpose", that
"no problem or difficulties were encountered while using the application", and
one suggestion: **"make it more simple and easy to use."**

That suggestion is worth separating from the ratings, because a top score on
every statement and a request for more simplicity are not in conflict. Nothing
was broken; there was more on screen than a first-time user needs. It is the
same observation a participant made as "navigating the function", reached
independently, and the guided tour described below is the response to both.

**Results — ratings.** Responses clustered at 4 and 5 across Ease of Use,
Functionality, User Interface and Overall Experience. **Section D, Performance,
drew the lowest scores of the five**, and it was the only section to attract
ratings of 3. That is not a stray result: it is exactly what the written
answers say as well, and the two agree on the cause.

**Results — what participants wrote.** The open-ended answers separate cleanly
into what the application does well and the single thing it does badly.

| Theme | Representative answers |
|---|---|
| Clarity and organisation | "Good UI"; "I like how organized the system… there's a guide if you get lost in the app"; "It's easy to use and understand" |
| The thing it is for | "I like how detailed the location tracker"; "the features are made for those people who don't want any hassle… since it's hard to find a place" |
| Shortlisting | "The filters and favorite feature, because I could easily filter my preference and saved it for later" |
| **Responsiveness** | "I found the loading experience quite long"; "Doesn't respond fast, slow"; "Only the application does not respond quickly because of the data"; "I think that was because of the network instability" |
| Coverage | "Put more boarding house, kay gamay ra akong nakita"; "more apartments to show" |
| Specific defects | "The compare function should be rebuilt"; "No errors, the layout lang sa profile pag na change into dark or light" |

Asked directly whether they encountered errors, participants answered "No" or
"None" almost without exception. The complaint is not that the application
breaks; it is that it waits.

**What the session changed.** Acceptance testing is only worth conducting if
the results are acted on, so each finding is recorded against what was done.

| Finding | Response |
|---|---|
| Slow to respond; "loading experience quite long" | Measured rather than assumed. A request to the development server took **1.1 seconds through a tunnel against 0.011 seconds locally**, and because Expo sends each screen's code on demand, a screen needing twenty modules waited twenty seconds. The cause is the demonstration deployment described in 3.2.1, not the application; it is avoided by serving on the same network, and `npm start` now works the address out at every start so that is easy to do. BUG-24 — a loading flag that was never cleared — made it worse and is fixed. |
| "Put more boarding house"; "more apartments to show" | The catalogue went from four invented listings to **sixteen real boarding houses**, each with photographs, coordinates and, where published, the owner's number. |
| "The compare function should be rebuilt" | It was. Comparison now holds up to four listings instead of two, shares the table width out so three fit the display without scrolling, marks the best value in each row — cheapest, nearest, top rated — offers to add another listing from the table itself, and confirms before clearing (BUG-22, BUG-23). |
| "the layout lang sa profile pag na change into dark or light" | Light mode drew no card borders at all and leaned on a shadow Android renders as almost nothing, so cards ran together into one field. Cards are now outlined in both themes, the rule colour was darkened, and every screen is given a light source. |
| "Navigating the function" | A guided tour was added: on a new account each screen introduces its own controls once, with the control highlighted and a short explanation. A later participant's answer — "there's a guide if you get lost in the app" — is that feature being noticed. |

**Status: conducted.** Nine participants, 2–6 October 2026, signed agreements
and completed surveys retained. The application is accepted by the group it was
built for, with one qualification the participants were right to make and which
this report does not soften: on a slow connection it keeps you waiting.

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
coverage. Comparison places up to four listings side by side and marks the best
value in each row. Navigation draws a route along real roads and follows the
user as they walk. Ratings are aggregated per listing and displayed wherever
that listing appears.

It is stocked with sixteen real boarding houses in Tagum City rather than
sample data, and it was put in front of nine people who had not seen it before.

Two commitments in the proposal were **not** delivered: a separate owner role,
and QR-based listing lookup. Both are declared in Chapter 1 under *Out of
scope*, with the reasons.

What the project demonstrates beyond the feature list: a serverless
architecture using managed services in place of a custom backend; an interface
built on a single design system rather than per-screen values; and a working
account of its own defects, including several that were only found by reading
the code rather than running it.

### Future Work

Everything below is **not implemented and not tested**. That is what makes it
future work, and it is stated at the top of the list so that nothing here can
be read as a claim about what the application already does. Each item names the
state of the thing it refers to.

**Near term**

1. **Automated tests**, beginning with scoring, distance and filtering. They are
   pure functions, the easiest thing in the project to test, and they are the
   part a change is most likely to break unnoticed.
2. **The owner role**, so owners can submit and manage their own listings
   instead of going through an administrator.
3. **Real local notifications.** `expo-notifications` is installed but never
   imported; alerts currently appear only when the application is opened.
4. **A compiled build.** This is the one participants actually asked for,
   without knowing it. Every complaint about waiting traces to the bundle being
   served from a laptop over the network; an `eas build` embeds it in the
   binary and the per-screen fetches stop existing. It is the single change
   that would most improve the measured experience, and it changes no code.

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

---

## References

Sources are listed where the project depends on them: the libraries it is built
from, the services it calls at runtime, and the law it is written to comply
with. Documentation is cited at the version actually used, because a link to
"latest" does not describe what was built.

**Frameworks and libraries**

1. Meta Platforms, Inc. *React Native 0.86 Documentation.* Available at:
   reactnative.dev/docs/0.86/getting-started (accessed September 2026).
2. Expo. *Expo SDK 57 Documentation.* Available at:
   docs.expo.dev/versions/v57.0.0 (accessed October 2026).
3. Google LLC. *Firebase Documentation — Authentication and Cloud Firestore.*
   Available at: firebase.google.com/docs (accessed September 2026).
4. Google LLC. *Cloud Firestore Security Rules Reference.* Available at:
   firebase.google.com/docs/firestore/security/rules-structure (accessed
   October 2026).
5. React Navigation. *React Navigation 7 Documentation.* Available at:
   reactnavigation.org/docs/7.x/getting-started (accessed September 2026).
6. Software Mansion. *React Native Reanimated 4 Documentation.* Available at:
   docs.swmansion.com/react-native-reanimated (accessed September 2026).
7. Agafonkin, V. *Leaflet 1.9.4 — an open-source JavaScript library for mobile-
   friendly interactive maps.* Available at: leafletjs.com (accessed September
   2026).

**Services called at runtime**

8. OpenStreetMap Foundation. *OpenStreetMap Standard Tile Layer.* Tile endpoint:
   `tile.openstreetmap.org/{z}/{x}/{y}.png`. Used under the OpenStreetMap Tile
   Usage Policy. Available at: operations.osmfoundation.org/policies/tiles
   (accessed September 2026).
9. OSRM Project. *Open Source Routing Machine — Routing API.* Endpoint:
   `router.project-osrm.org/route/v1/foot/`. Available at:
   project-osrm.org/docs/v5.24.0/api (accessed September 2026).
10. Cloudinary Ltd. *Image Upload API Reference — unsigned uploads.* Endpoint:
    `api.cloudinary.com/v1_1/{cloud_name}/image/upload`. Available at:
    cloudinary.com/documentation/image_upload_api_reference (accessed October
    2026).
11. OpenStreetMap Foundation. *Nominatim Geocoding API.* Used during data
    preparation to confirm that each boarding house's coordinates resolve to
    the stated barangay. Available at: nominatim.org/release-docs/latest
    (accessed October 2026).

**Legal and policy**

12. Republic of the Philippines. *Republic Act No. 10173 — Data Privacy Act of
    2012.* Official Gazette.
13. National Privacy Commission. *NPC Implementing Rules and Regulations of the
    Data Privacy Act of 2012.* Available at: privacy.gov.ph/implementing-rules-
    regulations-data-privacy-act-2012 (accessed October 2026).

**Project documents**

14. Martin, J. S., Lulu, J. R. P., Galagar, A. M. V. and Lisbo, V. J. C.
    *BoardEase: A Mobile Application Guide for Finding, Comparing, and
    Navigating to Boarding Houses — Project Proposal.* CCE106/L, University of
    Mindanao Tagum College, 2026.
