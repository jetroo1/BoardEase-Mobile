// The real BoardEase app. All this file does is stack up our "providers"
// (things that share data with every screen) and then hand off to
// RootNavigator, which decides what to actually show.
//
// This used to live directly in App.tsx. It was moved here so that the
// school lab in src/lab can run on its own without Metro also bundling
// the whole BoardEase app. To go back to BoardEase, see App.tsx.
//
// Provider order matters. ThemeProvider is outermost because it also loads the
// app's fonts, and nothing below it should paint until those are ready --
// otherwise every screen visibly reflows from the system font to Inter a beat
// after it appears.

import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider, useTheme, useThemeContext } from './context/ThemeContext';
import RootNavigator from './navigation/RootNavigator';

export default function BoardEaseApp() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CompareProvider>
            <ThemedNavigationContainer />
          </CompareProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// React Navigation paints the background behind and between screens itself, so
// it needs to be told about the theme too. Without this there is a white flash
// on every push while in dark mode.
function ThemedNavigationContainer() {
  const { isReady } = useThemeContext();
  const t = useTheme();

  const navTheme = {
    ...(t.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(t.isDark ? DarkTheme : DefaultTheme).colors,
      background: t.colors.canvas,
      card: t.colors.surface,
      text: t.colors.ink,
      border: t.colors.line,
      primary: t.colors.brand,
    },
  };

  // Held on a plain canvas-coloured view rather than a spinner: this lasts a
  // few hundred milliseconds, and a spinner that flashes up and vanishes is
  // more distracting than a still screen in the right colour.
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: t.colors.canvas }} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
