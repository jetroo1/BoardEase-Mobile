// A checkbox with its label, used where the person has to make a deliberate
// choice rather than fill something in.
//
// The whole row is the target, not just the 22pt box. A consent tick that can
// only be hit by landing on a small square is a consent tick people miss, and
// then they blame the button that will not work.
//
// The label is a slot rather than a string, because the one this exists for
// has links inside it.

import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Pressable from './Pressable';
import Text from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  // Spoken by the screen reader in place of the label, which may contain
  // links that would otherwise be read as a run-on sentence.
  accessibilityLabel: string;
  children: React.ReactNode;
  error?: string | null;
  disabled?: boolean;
}

export default function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
  children,
  error,
  disabled,
}: CheckboxProps) {
  const t = useTheme();
  const borderColor = error ? t.colors.danger : checked ? t.colors.brand : t.colors.line;

  return (
    <View style={{ gap: t.spacing.xxs }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: !!disabled }}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: t.spacing.sm,
          paddingVertical: t.spacing.xs,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            // Not from the radius scale: its smallest step is 12, which on a
            // 22pt square is a circle, and a circle means a radio button.
            borderRadius: 6,
            borderWidth: 2,
            borderColor,
            backgroundColor: checked ? t.colors.brand : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            // Nudged down so the box sits on the first line of the label
            // rather than above it.
            marginTop: 1,
          }}
        >
          {checked ? <Ionicons name="checkmark" size={15} color={t.colors.onBrand} /> : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Pressable>

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
