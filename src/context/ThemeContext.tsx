// Light/dark theming for the whole app.
//
// Why this is a context and not just an import: a screen that does
// `import { colors } from '../theme'` reads its colours once, at module load,
// and can never react to the user flipping the switch. Everything visual has
// to come through the hooks below instead.
//
// Three modes, not two. "system" follows the phone's own setting, which is
// what most people actually want; "light" and "dark" pin it. The choice is
// saved to the phone so it survives a restart.
//
// This provider also loads the app's fonts, because the two belong together:
// both have to be ready before the first pixel is drawn, and both are things
// every screen depends on.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  darkPalette,
  elevation,
  lightPalette,
  motion,
  Palette,
  radius,
  spacing,
  type,
} from '../theme';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'boardease.themeMode';

// What every component gets from useTheme(). The scales are constant, so they
// are passed through unchanged -- having them here means a screen needs exactly
// one import to style itself.
export interface Theme {
  colors: Palette;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  motion: typeof motion;
  elevation: ReturnType<typeof elevation>;
}

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  // What the sun/moon button does: flips to the opposite of what is on screen
  // right now. From "system" that means pinning the opposite of the phone's
  // setting, which is the behaviour people expect from a one-tap toggle.
  toggle: () => void;
  // False until both the saved mode and the fonts are ready.
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [modeLoaded, setModeLoaded] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Read the saved choice once on startup.
  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (cancelled) {
          return;
        }
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      // A phone with no saved value, or storage that refuses to open, is not an
      // error worth showing anyone -- we just stay on "system".
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setModeLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    // Update the screen first, then persist. Waiting on storage before
    // redrawing would put a visible lag on a button that should feel instant.
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkPalette : lightPalette;
    return {
      colors,
      isDark,
      spacing,
      radius,
      type,
      motion,
      elevation: elevation(colors, isDark),
    };
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      setMode,
      toggle,
      // Fonts that fail to load should not brick the app -- if the network or
      // the asset is bad we carry on with the system font rather than showing
      // a blank screen forever.
      isReady: modeLoaded && (fontsLoaded || fontError != null),
    }),
    [theme, mode, setMode, toggle, modeLoaded, fontsLoaded, fontError]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used inside a ThemeProvider');
  }
  return context;
}

// The hook almost every component wants.
export function useTheme(): Theme {
  return useThemeContext().theme;
}

// Styles that follow the theme.
//
// StyleSheet.create at the top of a file runs once and freezes whatever colours
// were current, so it cannot be used directly any more. Instead each screen
// writes a factory:
//
//   const createStyles = (t: Theme) => StyleSheet.create({ ... });
//   ...
//   const styles = useThemedStyles(createStyles);
//
// The sheet is rebuilt only when the theme actually changes, so this costs
// nothing on a normal re-render.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
