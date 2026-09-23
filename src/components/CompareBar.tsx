// A small reusable bar that appears at the bottom of a screen whenever the
// user has picked at least 2 properties to compare. Tapping it opens the
// Comparison screen. Used on both the Search and Favorites screens so the
// user can jump to comparing no matter where they added properties from.
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

  const visible = compareList.length >= 2;
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
        <Text variant="captionStrong" style={{ color: t.colors.onBrand, flex: 1 }}>
          {compareList.length} selected
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Compare ${compareList.length} properties`}
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
      </View>
    </Animated.View>
  );
}
