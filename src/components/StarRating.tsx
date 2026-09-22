// A small row of star icons used anywhere we show a rating (review cards,
// the "leave a review" form). Filled amber stars up to `rating`, outline
// stars for the rest -- replaces the old plain-text "★★★☆☆" approach.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface StarRatingProps {
  rating: number; // 1 to 5
  size?: number;
}

export default function StarRating({ rating, size = 14 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons
          key={value}
          name={value <= rating ? 'star' : 'star-outline'}
          size={size}
          color={colors.amber}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
