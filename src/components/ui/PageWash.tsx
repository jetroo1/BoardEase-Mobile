// A full-bleed tint behind a page's content.
//
// Light mode's canvas (#F6F9FA) and surface (#FFFFFF) are about three percent
// apart, and the hairline between them is nearly as pale. On a phone in
// daylight that is no separation at all: a screen of white cards on a white
// page reads as one flat field with text floating in it, which is what "looks
// plain" meant. Dark mode never had the problem, because near-black cards on
// a near-black page still differ by more than the eye needs.
//
// Deepening the canvas in the palette would fix the contrast and lose the
// airiness the design is built on. This keeps the canvas where it is and
// gives it a light source instead: two wide gradients that darken the page
// slightly towards its edges, so a white card has somewhere to sit.
//
// Full-bleed is the whole trick, and the landing page learned it the hard way.
// Anything narrower than the display has sides, and a tinted shape with
// visible sides on a plain background reads as a mistake rather than as
// lighting. These run wall to wall and fade along one axis only, so there is
// no boundary anywhere for the eye to catch.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

export interface PageWashProps {
  // 'page' sits behind a whole screen. 'sheet' is for content that has already
  // been lifted onto its own surface, such as the panel on Details, and is
  // weaker so the card edges inside it still read.
  variant?: 'page' | 'sheet';
}

export function PageWash({ variant = 'page' }: PageWashProps) {
  const t = useTheme();

  // Dark mode carries more of it: the same wash that is plainly visible on an
  // off-white canvas all but disappears against near-black.
  const base = variant === 'sheet' ? 0.6 : 1;
  const strong = (t.isDark ? 0.2 : 0.1) * base;
  const soft = (t.isDark ? 0.13 : 0.055) * base;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[t.colors.brand, 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.7 }}
        style={[StyleSheet.absoluteFill, { opacity: strong }]}
      />
      <LinearGradient
        colors={['transparent', t.colors.accent]}
        start={{ x: 1, y: 0.35 }}
        end={{ x: 0.2, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: soft }]}
      />
    </View>
  );
}

export default PageWash;
