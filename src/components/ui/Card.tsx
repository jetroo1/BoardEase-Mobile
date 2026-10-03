// A surface that sits above the canvas.
//
// Three elevation tiers exist (see theme.ts) so the interface has a front and
// a back. Pick by meaning, not by looks: "low" for a resting row, "medium" for
// the cards that are the point of the screen, "high" for anything that floats
// over content.
//
// Every card is outlined, in both themes. Light mode used to rely on its
// shadow alone, which sounds right and is not: Android renders `elevation: 1`
// as a few pixels of barely-there grey, and against a white card on a canvas
// three percent off white there was nothing left to see. A screen of resting
// rows ran together into one undifferentiated field. The hairline is what
// actually draws the edge; the shadow only says how far forward it is.

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
    // A hairline disappears on a high-density Android display, where it
    // rounds to well under a physical pixel. 1 is the thinnest line that
    // actually survives to the screen.
    borderWidth: outlined || !t.isDark ? 1 : StyleSheet.hairlineWidth,
    borderColor: t.colors.line,
    ...(level === 'flat' ? null : t.elevation[level]),
  };

  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}

export default Card;
