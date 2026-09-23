// RootNavigator decides what the whole app shows, based on AuthContext:
//   - still checking login state  -> a holding screen
//   - nobody logged in            -> Landing / Login / Register
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
//
// Every screen here sets headerShown: false and draws its own header with
// <ScreenHeader>. The stock native header could not be themed to match the
// rest of the app -- it brought its own font, its own grey and its own back
// arrow, and it was the most visible piece of undesigned chrome in the build.

import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DetailsScreen from '../screens/DetailsScreen';
import FilterScreen from '../screens/FilterScreen';
import CompareScreen from '../screens/CompareScreen';
import NavigationScreen from '../screens/NavigationScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import AdminScreen from '../screens/AdminScreen';
import AddListingScreen from '../screens/AddListingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MainTabs from './MainTabs';
import { RootStackParamList } from './types';
import { Screen, ScreenHeader } from '../components/ui';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const t = useTheme();
  const detailHeader = (title: string) => ({
    headerShown: true,
    header: ({ navigation }: { navigation: { goBack: () => void } }) => (
      <Screen style={{ flex: 0 }}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      </Screen>
    ),
  });

  // A bare canvas rather than a spinner. This state lasts a moment, and a
  // spinner that appears and disappears inside half a second reads as a
  // flicker rather than as progress.
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.colors.canvas }} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        // Logged out: landing page first, then the auth screens.
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Logged in: the tab bar, plus every screen that can open on top of it.
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen
            name="Filter"
            component={FilterScreen}
            // Filter is a decision you make and dismiss, not a place you go,
            // so it slides up as a sheet instead of across as a page.
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="Compare" component={CompareScreen} options={detailHeader('Compare listings')} />
          <Stack.Screen name="Navigation" component={NavigationScreen} options={detailHeader('Directions')} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={detailHeader('Reviews')} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={detailHeader('Alerts')} />
          <Stack.Screen name="Admin" component={AdminScreen} options={detailHeader('Admin panel')} />
          <Stack.Screen name="AddListing" component={AddListingScreen} options={detailHeader('Add listing')} />
        </>
      )}
    </Stack.Navigator>
  );
}
