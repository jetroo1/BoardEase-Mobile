// The real BoardEase app. All this file does is stack up our "providers"
// (things that share data with every screen) and then hand off to
// RootNavigator, which decides what to actually show.
//
// This used to live directly in App.tsx. It was moved here so that the
// school lab in src/lab can run on its own without Metro also bundling
// the whole BoardEase app. To go back to BoardEase, see App.tsx.

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import RootNavigator from './navigation/RootNavigator';

export default function BoardEaseApp() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CompareProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </CompareProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
