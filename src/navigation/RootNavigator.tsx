// RootNavigator decides what the whole app shows, based on AuthContext:
//   - still checking login state  -> a loading spinner
//   - nobody logged in            -> Login / Register screens
//   - logged in                   -> the tab bar (MainTabs), plus every
//                                    "detail" screen that opens on top of it
//
// Why are Details/Map/Filter/etc. listed here instead of inside MainTabs?
// Because they are full-screen views that shouldn't show the tab bar (for
// example, the Details screen covers the whole screen when you tap a
// property). Putting them in this outer stack, as siblings of MainTabs,
// means they automatically open without the tab bar getting in the way.
// A screen nested inside a tab (like Search) can still open them directly,
// because React Navigation lets a screen navigate to any screen defined by
// one of its parent navigators.

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DetailsScreen from '../screens/DetailsScreen';
import FilterScreen from '../screens/FilterScreen';
import MapScreen from '../screens/MapScreen';
import CompareScreen from '../screens/CompareScreen';
import NavigationScreen from '../screens/NavigationScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import AdminScreen from '../screens/AdminScreen';
import AddListingScreen from '../screens/AddListingScreen';
import MainTabs from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        // Logged out: landing page first, then the auth screens.
        <>
          <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // Logged in: the tab bar, plus every screen that can open on top of it.
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={{ title: 'Boarding House' }}
          />
          <Stack.Screen
            name="Filter"
            component={FilterScreen}
            options={{ title: 'Filter Results', presentation: 'modal' }}
          />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Map View' }} />
          <Stack.Screen name="Compare" component={CompareScreen} options={{ title: 'Compare' }} />
          <Stack.Screen
            name="Navigation"
            component={NavigationScreen}
            options={{ title: 'Route Guide' }}
          />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Panel' }} />
          <Stack.Screen
            name="AddListing"
            component={AddListingScreen}
            options={{ title: 'Add Listing' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
