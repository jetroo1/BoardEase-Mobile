// A small status or attribute label: "Pending", "WiFi", "92% match".
//
// Dark text on a soft tint, never white on the full-strength colour. Full
// strength is louder than the information usually deserves, and it fights the
// text sitting on top of it.
//
// Colour is never the only signal -- every tone can take an icon, and the
// label always says the thing in words too.

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Palette } from '../../theme';
import Text from './Text';

export type PillTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

const TONE: Record<PillTone, { bg: keyof Palette; fg: keyof Palette }> = {
  neutral: { bg: 'canvasAlt', fg: 'inkSoft' },
  brand: { bg: 'brandSoft', fg: 'brand' },
  accent: { bg: 'accentSoft', fg: 'accent' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
};

export interface PillProps {
  label: string;
  tone?: PillTone;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, tone = 'neutral', icon, style }: PillProps) {
  const t = useTheme();
  const { bg, fg } = TONE[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.xxs,
          alignSelf: 'flex-start',
          backgroundColor: t.colors[bg],
          paddingHorizontal: t.spacing.xs,
          paddingVertical: t.spacing.xxs,
          borderRadius: t.radius.pill,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={t.colors[fg]} /> : null}
      <Text variant="micro" style={{ color: t.colors[fg] }}>
        {label}
      </Text>
    </View>
  );
}

export default Pill;
