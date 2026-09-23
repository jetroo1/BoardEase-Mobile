// The page shell: safe-area handling, the canvas colour, and the custom header
// that replaced React Navigation's default one.
//
// Stock platform headers were one of the clearest "unfinished" signals in the
// old build -- grey bar, system font, a title like "Boarding House". Every
// screen now draws its own, so the type scale and the palette hold all the way
// to the top of the display.

import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeContext } from '../../context/ThemeContext';
import { GUTTER } from '../../theme';
import { IconButton } from './Button';
import Text from './Text';

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------
//
// Lives in two places on purpose: here, as a one-tap sun/moon in the header,
// and as a proper three-way Appearance control on Profile. The header copy is
// for reaching it quickly; the Profile one is where people look for a setting.

export function ThemeToggle({ onPhoto = false }: { onPhoto?: boolean }) {
  const { theme, toggle } = useThemeContext();
  return (
    <IconButton
      icon={theme.isDark ? 'sunny' : 'moon'}
      label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onPress={toggle}
      tone={onPhoto ? 'onPhoto' : 'default'}
      size={18}
    />
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  // Rendered at the right end of the header row.
  actions?: React.ReactNode;
  showThemeToggle?: boolean;
  large?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  actions,
  showThemeToggle = false,
  large = false,
}: ScreenHeaderProps) {
  const t = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: GUTTER,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.sm,
        gap: t.spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
        {onBack ? (
          <IconButton icon="chevron-back" label="Go back" onPress={onBack} />
        ) : null}

        <View style={{ flex: 1, gap: 2 }}>
          {eyebrow ? (
            <Text variant="micro" tone="brand" uppercase>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text variant={large ? 'title' : 'heading'}>
              {title}
            </Text>
          ) : null}
        </View>

        {actions}
        {showThemeToggle ? <ThemeToggle /> : null}
      </View>

      {subtitle ? (
        <Text variant="caption" tone="soft">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface ScreenProps {
  children: React.ReactNode;
  // 'canvas' for ordinary pages, 'alt' for pages that are mostly one big card.
  background?: 'canvas' | 'alt';
  // Off when the screen draws its own full-bleed content to the top, such as
  // the photo hero on Details.
  edges?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, background = 'canvas', edges = true, style }: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: background === 'canvas' ? t.colors.canvas : t.colors.canvasAlt,
          paddingTop: edges ? insets.top : 0,
        },
        style,
      ]}
    >
      {/* Status bar icons have to flip with the theme or they disappear into
          the background in one mode or the other. */}
      {focused && <StatusBar style={t.isDark ? 'light' : 'dark'} />}
      {children}
    </View>
  );
}

// A section heading with an optional action on the right ("See all").
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing.sm,
        marginBottom: t.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, flex: 1 }}>
        {icon ? <Ionicons name={icon} size={16} color={t.colors.brand} /> : null}
        <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Text variant="captionStrong" tone="brand" onPress={onAction} suppressHighlighting>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

export default Screen;
