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

import React, { useEffect } from 'react';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider, useTheme, useThemeContext } from './context/ThemeContext';
import { TourProvider } from './context/TourContext';
import { TourOverlay } from './components/ui';
import RootNavigator from './navigation/RootNavigator';

export default function BoardEaseApp() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CompareProvider>
            <TourHost />
          </CompareProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// The guided tour needs to know whose tour it is -- what has been seen is
// remembered per account -- so it sits inside AuthProvider and is handed the
// uid rather than reaching for it itself.
function TourHost() {
  const { user } = useAuth();
  return (
    <TourProvider userId={user?.uid ?? null}>
      <ThemedNavigationContainer />
    </TourProvider>
  );
}

// React Navigation paints the background behind and between screens itself, so
// it needs to be told about the theme too. Without this there is a white flash
// on every push while in dark mode.
function ThemedNavigationContainer() {
  const { isReady } = useThemeContext();
  const t = useTheme();

  // Paint the native window behind React Native, not just the views on top of
  // it.
  //
  // Android's window defaults to white. Every screen here is opaque and the
  // navigation theme is set, so that window is invisible while a screen is
  // sitting still -- but the native stack shows it for a few frames during a
  // push and a pop, which in dark mode is a white flash on every transition
  // and especially on back.
  //
  // It is set here rather than as `backgroundColor` in app.json because that
  // value is fixed at build time and this application has two themes: a dark
  // window would then flash behind light mode instead. This follows whichever
  // theme is actually on.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.colors.canvas).catch(() => {
      // Unsupported on this platform. The flash is cosmetic, so there is
      // nothing worth telling anybody about.
    });
  }, [t.colors.canvas]);

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
      {/* An explicit flex: 1 box rather than letting these two be bare
          children of the container. TourOverlay positions itself absolutely
          against its parent, and it has to be a parent that definitely fills
          the window -- otherwise the highlight is measured against one box and
          drawn into another. */}
      <View style={{ flex: 1 }}>
        <RootNavigator />
        {/* A sibling of the navigator, so a step can point at the tab bar as
            well as at what is above it, and in the same coordinate space as
            the controls it highlights. Draws nothing unless a tour is
            running. */}
        <TourOverlay />
      </View>
    </NavigationContainer>
  );
}
