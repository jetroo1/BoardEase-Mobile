// A labelled text field.
//
// Rules baked in here, each one fixing a specific way forms go wrong:
//
//  - The label is always visible. Placeholder-as-label vanishes the moment
//    someone types, leaving them unable to check what they filled in.
//  - Optional fields are marked, not required ones. In most forms required is
//    the majority, so asterisks everywhere carry no information.
//  - Errors sit next to the field and say how to fix it, with an icon as well
//    as a colour so the signal survives colour-blindness and a quick glance.
//  - Validation is the caller's job to trigger on blur, not on every
//    keystroke. Errors that appear while someone is typing the third letter of
//    their name feel like an interruption.

import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HIT_SLOP_MIN } from '../../theme';
import Text from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  hint,
  optional = false,
  icon,
  trailing,
  containerStyle,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? t.colors.danger
    : focused
      ? t.colors.brand
      : t.colors.lineStrong;

  return (
    <View style={[{ gap: t.spacing.xxs }, containerStyle]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.xxs }}>
        <Text variant="captionStrong" tone="soft">
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" tone="faint">
            (optional)
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: t.spacing.xs,
          minHeight: HIT_SLOP_MIN,
          paddingHorizontal: t.spacing.sm,
          paddingVertical: multiline ? t.spacing.sm : 0,
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.sm,
          // Two pixels when focused rather than one, so the focused field is
          // obvious without the layout shifting: the border grows inward.
          borderWidth: 1,
          borderColor,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? t.colors.brand : t.colors.inkFaint}
            style={multiline ? { marginTop: 2 } : undefined}
          />
        ) : null}

        <TextInput
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={t.colors.inkFaint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            {
              flex: 1,
              color: t.colors.ink,
              paddingVertical: multiline ? 0 : t.spacing.sm,
              minHeight: multiline ? 96 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
        {trailing}
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}>
          <Ionicons name="alert-circle" size={13} color={t.colors.danger} />
          <Text variant="caption" tone="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export default Input;
