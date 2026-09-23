// The app's buttons.
//
// Three weights, and the hierarchy matters: one primary per screen region.
// Two equally loud buttons side by side is the designer refusing to decide for
// the user, and the user then has to.
//
// Every button handles its own busy state, because "disable the control while
// the call is in flight, and re-enable it afterwards" is the difference
// between one booking and three.

import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HIT_SLOP_MIN } from '../../theme';
import Pressable from './Pressable';
import Text from './Text';

// 'dark' is the near-black pill from the reference designs -- the highest
// contrast the palette has. Reserved for the single most important action on
// a screen, because its weight is exactly what stops working if it is used
// twice.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const t = useTheme();

  // Padding is proportional to the text size rather than fixed, so a small
  // button does not end up looking like a squashed large one.
  const sizing = {
    sm: { paddingV: t.spacing.xs, paddingH: t.spacing.sm, text: 'captionStrong' as const, icon: 14 },
    md: { paddingV: t.spacing.sm, paddingH: t.spacing.md, text: 'bodyStrong' as const, icon: 18 },
    lg: { paddingV: t.spacing.md, paddingH: t.spacing.lg, text: 'bodyStrong' as const, icon: 20 },
  }[size];

  const palette = {
    primary: { bg: t.colors.brand, fg: t.colors.onBrand, border: 'transparent' },
    secondary: { bg: t.colors.surface, fg: t.colors.brand, border: t.colors.lineStrong },
    ghost: { bg: 'transparent', fg: t.colors.brand, border: 'transparent' },
    danger: { bg: t.colors.danger, fg: '#FFFFFF', border: 'transparent' },
    // In dark mode "near-black on white" has to invert, or the button
    // disappears into the canvas it is meant to stand out from.
    dark: {
      bg: t.isDark ? t.colors.ink : t.colors.ink,
      fg: t.isDark ? t.colors.canvas : t.colors.surface,
      border: 'transparent',
    },
  }[variant];

  const isInactive = disabled || loading;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    minHeight: HIT_SLOP_MIN,
    paddingVertical: sizing.paddingV,
    paddingHorizontal: sizing.paddingH,
    borderRadius: t.radius.md,
    backgroundColor: palette.bg,
    borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
    borderColor: palette.border,
    // Disabled reads as low contrast AND no response. Low contrast on its own
    // just looks like a rendering bug.
    opacity: isInactive ? 0.5 : 1,
    ...(fullWidth ? { alignSelf: 'stretch' } : null),
    ...((variant === 'primary' || variant === 'dark') && !isInactive
      ? t.elevation.low
      : null),
  };

  const iconNode = icon ? <Ionicons name={icon} size={sizing.icon} color={palette.fg} /> : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={[containerStyle, style]}
    >
      {loading ? (
        // Sized to match the icon so the button does not change width when it
        // flips into its busy state -- a button that resizes mid-press feels
        // broken even when it is working.
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {iconPosition === 'left' ? iconNode : null}
          <Text variant={sizing.text} style={{ color: palette.fg, flexShrink: 1, textAlign: 'center' }}>
            {label}
          </Text>
          {iconPosition === 'right' ? iconNode : null}
        </>
      )}
    </Pressable>
  );
}

// A round icon-only button -- back arrows, the theme toggle, a heart.
// Always takes a label, because an icon on its own is ambiguous to a screen
// reader and frequently to a person as well.
export interface IconButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
  tone?: 'default' | 'brand' | 'danger' | 'onPhoto';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
  size = 20,
  style,
}: IconButtonProps) {
  const t = useTheme();

  const tones = {
    default: { bg: t.colors.surfaceAlt, fg: t.colors.inkSoft },
    brand: { bg: t.colors.brandSoft, fg: t.colors.brand },
    danger: { bg: t.colors.dangerSoft, fg: t.colors.danger },
    // For buttons that sit on top of a photo, where the background behind
    // them is unpredictable.
    onPhoto: { bg: 'rgba(0,0,0,0.45)', fg: '#FFFFFF' },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          width: HIT_SLOP_MIN,
          height: HIT_SLOP_MIN,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.pill,
          backgroundColor: tones.bg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={tones.fg} />
    </Pressable>
  );
}

// A row of buttons at the bottom of a form or sheet. The primary action sits
// on the right, where the eye finishes.
export function ButtonRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'center' }, style]}>
      {children}
    </View>
  );
}

export default Button;
