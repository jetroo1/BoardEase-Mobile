// What the tour says, kept apart from the machinery that shows it.
//
// Together in one file because they are copy, and copy gets read and rewritten
// as a set. Scattered through the screens they drift: two steps end up
// explaining the same control differently, and nobody notices until somebody
// reads them one after another, which is exactly how a person on a tour reads
// them.
//
// Each step says what the control does and why somebody would want it, never
// what it is called. "Tap the heart icon to favourite" tells a person who can
// already see a heart nothing they did not know. What they do not know is
// where the saved ones go afterwards.

import { TourStep } from './context/TourContext';

// Names a screen passes to useScreenTour. Kept as constants so a screen and
// its steps cannot drift apart over a typo -- a mistyped name there would
// silently tour nobody.
export const TOUR = {
  home: 'home',
  search: 'search',
  details: 'details',
  profile: 'profile',
  adminHome: 'adminHome',
} as const;

export const HOME_TOUR: TourStep[] = [
  {
    title: 'Welcome to BoardEase',
    body: 'A quick look around, about thirty seconds. You can leave at any point with Skip, and pick it up again later from Profile.',
  },
  {
    target: 'home.search',
    title: 'Start typing, see results',
    body: 'Results appear as you type -- no need to press enter. Type the name of a boarding house, or the barangay you want to live in.',
  },
  {
    target: 'home.map',
    title: 'See them on a map',
    body: 'Every boarding house as a pin. Useful when what matters is how far it is from campus rather than what it costs.',
  },
  {
    target: 'home.saved',
    title: 'Where your shortlist lives',
    body: 'The heart on any listing puts it here, so you can look at four places properly instead of trying to remember eight.',
  },
  {
    target: 'home.alerts',
    title: 'Be told about new places',
    body: 'Set a budget and the amenities you need on the Search screen, switch on alerts, and any new boarding house that fits turns up here.',
  },
  {
    title: 'One thing BoardEase does not do',
    body: 'It does not take bookings or payments, and it cannot message an owner for you. It helps you find a place and get there -- you arrange the rest directly with the owner.',
  },
];

export const SEARCH_TOUR: TourStep[] = [
  {
    target: 'search.field',
    title: 'The list narrows as you type',
    body: 'Matches on the name of the place or on the barangay. Clear it with the x to see everything again.',
  },
  {
    target: 'search.filter',
    title: 'Set a budget and what you need',
    body: 'A maximum rent, a room type, the amenities you cannot do without. The list only shows places that fit.',
  },
  {
    target: 'search.sort',
    title: 'Order them your way',
    body: 'By price, or by how near they are to you. Nearest needs location permission, which you can grant from Profile.',
  },
];

export const DETAILS_TOUR: TourStep[] = [
  {
    target: 'details.favourite',
    title: 'Save it for later',
    body: 'The heart adds this place to Saved. Nothing is sent to the owner -- it is your own shortlist and only you can see it.',
  },
  {
    target: 'details.directions',
    title: 'Get yourself there',
    body: 'Opens turn-by-turn directions from where you are standing to the front door. This is the part worth going out and seeing for yourself.',
  },
  {
    target: 'details.compare',
    title: 'Add it to a comparison',
    body: 'Pick two or three places this way and you can read their details in one table instead of from memory.',
  },
];

export const PROFILE_TOUR: TourStep[] = [
  {
    target: 'profile.avatar',
    title: 'Your picture',
    body: 'Tap it to take a photo or choose one from this phone. It is only shown to you, on this screen.',
  },
  {
    target: 'profile.appearance',
    title: 'Light, dark, or follow the phone',
    body: 'System follows whatever your phone is set to, including a schedule if you have one.',
  },
  {
    target: 'profile.replayTour',
    title: 'Run this tour again',
    body: 'Shows every screen its introduction once more. Handy if you are showing BoardEase to somebody else.',
  },
];

export const ADMIN_HOME_TOUR: TourStep[] = [
  {
    title: 'You are signed in as an administrator',
    body: 'You see what tenants see, plus the tools for keeping the listings right. A short look at those.',
  },
  {
    target: 'adminHome.search',
    title: 'Search every listing',
    body: 'Unlike the tenant search, this one includes listings that are still waiting for approval -- so it answers "is this place already in here?" properly.',
  },
  {
    target: 'adminHome.pending',
    title: 'What needs you',
    body: 'How many submitted listings are waiting. Anything you add yourself is published immediately and never appears here.',
  },
  {
    target: 'adminHome.panel',
    title: 'Where you manage them',
    body: 'Approve, edit, hide or delete any listing, and add new boarding houses with their photographs and location.',
  },
];
