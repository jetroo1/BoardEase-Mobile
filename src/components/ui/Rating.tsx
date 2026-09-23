// Star ratings, in two jobs that used to be tangled together:
//   - Rating: read-only, shows an average
//   - RatingInput: the tappable one used when writing a review
//
// Half stars matter here. An average of 4.6 drawn as five whole stars is
// simply wrong, and rounding it down to four is equally wrong -- so the
// display version renders a half star when the fraction warrants it.

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HIT_SLOP_MIN } from '../../theme';
import Pressable from './Pressable';
import Text from './Text';

export interface RatingProps {
  value: number;
  size?: number;
  // "4.6 (24)" alongside the stars -- the number carries the precision the
  // stars cannot.
  showValue?: boolean;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function Rating({ value, size = 14, showValue = false, count, style }: RatingProps) {
  const t = useTheme();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        count != null
          ? `Rated ${value.toFixed(1)} out of 5, from ${count} reviews`
          : `Rated ${value.toFixed(1)} out of 5`
      }
      style={[{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }, style]}
    >
      <View style={{ flexDirection: 'row', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((position) => {
          const filled = value >= position;
          const half = !filled && value >= position - 0.5;
          return (
            <Ionicons
              key={position}
              name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
              size={size}
              color={filled || half ? t.colors.star : t.colors.inkFaint}
            />
          );
        })}
      </View>

      {showValue ? (
        <Text variant="caption" tone="soft">
          {value > 0 ? value.toFixed(1) : 'No rating'}
          {count != null && count > 0 ? ` (${count})` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export function RatingInput({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (next: number) => void;
  size?: number;
}) {
  const t = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: t.spacing.xxs }}>
      {[1, 2, 3, 4, 5].map((position) => (
        <Pressable
          key={position}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === position }}
          accessibilityLabel={`${position} star${position > 1 ? 's' : ''}`}
          onPress={() => onChange(position)}
          style={{
            minWidth: HIT_SLOP_MIN,
            minHeight: HIT_SLOP_MIN,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={value >= position ? 'star' : 'star-outline'}
            size={size}
            color={value >= position ? t.colors.star : t.colors.lineStrong}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default Rating;
