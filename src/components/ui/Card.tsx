// A surface that sits above the canvas.
//
// Three elevation tiers exist (see theme.ts) so the interface has a front and
// a back. Pick by meaning, not by looks: "low" for a resting row, "medium" for
// the cards that are the point of the screen, "high" for anything that floats
// over content.

import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface CardProps extends ViewProps {
  level?: 'flat' | 'low' | 'medium' | 'high';
  // Outlined cards read better than shadowed ones in dark mode, where a
  // shadow against a near-black canvas is invisible anyway.
  outlined?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  level = 'low',
  outlined = false,
  padded = true,
  style,
  children,
  ...rest
}: CardProps) {
  const t = useTheme();

  const base: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    ...(padded ? { padding: t.spacing.md } : null),
    ...(outlined || t.isDark
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.line }
      : null),
    ...(level === 'flat' ? null : t.elevation[level]),
  };

  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}

export default Card;
