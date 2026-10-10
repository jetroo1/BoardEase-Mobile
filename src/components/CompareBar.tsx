// The bar at the bottom of the screen that tracks a comparison being built.
//
// It used to appear only once two places had been picked, which meant the
// first pick did nothing visible at all. Somebody tapped Compare on a listing,
// saw the button say "Added", and had no idea what to do next -- so they went
// back, hunted for another boarding house, opened it and waited for it to
// load, all to reach a feature that was already half-started and never said
// so. The slow part was never the comparison; it was finding out it had begun.
//
// So it now appears on the first pick and says what is missing. One place
// selected asks for a second and offers nowhere to go; two or more turn into
// the button that opens the comparison.
//
// It floats above the list rather than sitting in the layout, and slides in
// instead of appearing: something that pops into existence under your thumb
// mid-scroll is easy to hit by accident.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompare } from '../context/CompareContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { Pressable, Text } from './ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CompareBar() {
  const { compareList, clearCompare } = useCompare();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();

  const count = compareList.length;
  const ready = count >= 2;
  const visible = count >= 1;
  const offset = useSharedValue(visible ? 0 : 120);

  useEffect(() => {
    offset.value = withTiming(visible ? 0 : 120, { duration: t.motion.base });
  }, [visible, offset, t.motion.base]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: offset.value === 0 ? 1 : 1 - offset.value / 120,
  }));

  // Still rendered while hidden so the slide-out can play; pointerEvents is
  // what stops it swallowing taps once it is off screen.
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          bottom: t.spacing.md,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          backgroundColor: t.colors.brand,
          borderRadius: t.radius.pill,
          paddingLeft: t.spacing.md,
          paddingRight: t.spacing.xxs,
          paddingVertical: t.spacing.xxs,
          ...t.elevation.high,
        }}
      >
        <Ionicons name="git-compare" size={18} color={t.colors.onBrand} />
        {/* Says what is still needed, not just how many have been picked. "1
            selected" is a fact; "Pick one more to compare" is an instruction,
            and at this point in the flow an instruction is what is wanted. */}
        <Text variant="captionStrong" style={{ color: t.colors.onBrand, flex: 1 }}>
          {ready ? `${count} selected` : 'Pick one more to compare'}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear compare selection"
          onPress={clearCompare}
          style={{ padding: t.spacing.xs }}
        >
          <Text variant="micro" uppercase style={{ color: 'rgba(255,255,255,0.75)' }}>
            Clear
          </Text>
        </Pressable>

        {/* Hidden rather than disabled while only one place is picked. A
            greyed-out button invites a tap that cannot do anything; with
            nothing there, the sentence beside it is the whole message. */}
        {ready ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Compare ${count} properties`}
            onPress={() => navigation.navigate('Compare')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.xxs,
              backgroundColor: t.colors.onBrand,
              paddingHorizontal: t.spacing.sm,
              paddingVertical: t.spacing.xs,
              borderRadius: t.radius.pill,
            }}
          >
            <Text variant="captionStrong" style={{ color: t.colors.brand }}>
              Compare
            </Text>
            <Ionicons name="arrow-forward" size={14} color={t.colors.brand} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
