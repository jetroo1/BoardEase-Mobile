// A small reusable bar that appears at the bottom of a screen whenever the
// user has picked at least 2 properties to compare. Tapping it opens the
// Comparison screen. Used on both the Search and Favorites screens so the
// user can jump to comparing no matter where they added properties from.

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompare } from '../context/CompareContext';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CompareBar() {
  const { compareList } = useCompare();
  const navigation = useNavigation<NavigationProp>();

  // Nothing to compare yet -- don't show the bar at all.
  if (compareList.length < 2) {
    return null;
  }

  return (
    <Pressable style={styles.bar} onPress={() => navigation.navigate('Compare')}>
      <Ionicons name="git-compare" size={18} color={colors.white} />
      <Text style={styles.text}>Compare {compareList.length} properties</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.deep,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    ...shadow.card,
  },
  text: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
