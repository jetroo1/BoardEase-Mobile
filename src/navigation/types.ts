// This file just describes, for TypeScript, which screens exist and what
// data (params) each screen expects when you navigate to it. It doesn't
// render anything itself -- it's only used so that navigation.navigate(...)
// calls are type-checked (e.g. TypeScript will warn us if we forget to pass
// a required id).

import { Filters, Property, PropertyWithDistance } from '../types';

// The 5 screens available from the bottom tab bar, once logged in.
//
// Map sits in the middle slot and is drawn as the raised centre button, so
// "see what is around me" is one tap from anywhere in the app rather than
// something you have to go through Search to reach.
//
// Notifications used to be a tab. It moved into the stack below when Map took
// a slot: six icon-only tabs is too cramped on a phone, and Home already has
// an Alerts tile plus a bell in its header pointing at it.
export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// Every screen in the app, including the tab bar itself (as "MainTabs")
// and the full-screen ones that open on top of it (Details, Map, etc).
export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: undefined;
  CompleteFacebookProfile: undefined;
  MainTabs: undefined;
  Details: { propertyId: string };
  // The Filter screen hands the chosen filters back to whoever opened it. The
  // function itself is left in src/utils/navigationCallbacks.ts rather than
  // passed here -- params have to stay serializable, and React Navigation says
  // so out loud, in Expo Go, on screen.
  Filter: { currentFilters: Filters };
  // Map is not here: it became a bottom-tab screen (see MainTabParamList) and
  // loads its own listings, so there is no stack copy to collide with it.
  Notifications: undefined;
  Compare: undefined;
  Navigation: { property: Property };
  Reviews: { propertyId: string; propertyTitle: string };
  Admin: undefined;
  // With a propertyId it edits that listing; without one it creates a new
  // listing. Both are the same form, because "everything about a listing" is
  // the same set of fields either way and keeping two copies of it guarantees
  // they drift.
  AddListing: { propertyId?: string } | undefined;
  // Opens the map so a listing's position can be tapped rather than typed.
  // The chosen point comes back the same way Filter's do, through the callback
  // registry rather than through these params.
  PickLocation: { initial?: { lat: number; lng: number } };
  // Opens on the document named, but shows both behind a pair of tabs. It is
  // reachable from Register (before an account exists) as well as from
  // Profile, so it is registered in both halves of the root navigator.
  Legal: { document?: 'terms' | 'privacy' } | undefined;
};

// A combined list of every screen name in the app (tabs + stack), used in
// the rare case a screen needs to navigate to both kinds (see HomeScreen,
// which jumps to the "Search" tab as well as the standalone "Admin" screen).
export type AppParamList = RootStackParamList & MainTabParamList;
