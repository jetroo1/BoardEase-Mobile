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
  MainTabs: undefined;
  Details: { propertyId: string };
  Filter: {
    currentFilters: Filters;
    // The Filter screen calls this function with the new filters when the
    // user taps "Apply", so the Search screen (which passed this function
    // in) can update its own list. Then the Filter screen goes back.
    onApply: (filters: Filters) => void;
  };
  // Map is not here: it became a bottom-tab screen (see MainTabParamList) and
  // loads its own listings, so there is no stack copy to collide with it.
  Notifications: undefined;
  Compare: undefined;
  Navigation: { property: Property };
  Reviews: { propertyId: string; propertyTitle: string };
  Admin: undefined;
  AddListing: undefined;
};

// A combined list of every screen name in the app (tabs + stack), used in
// the rare case a screen needs to navigate to both kinds (see HomeScreen,
// which jumps to the "Search" tab as well as the standalone "Admin" screen).
export type AppParamList = RootStackParamList & MainTabParamList;
