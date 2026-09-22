// Comparison screen: shows the 2-3 properties the user picked (stored in
// CompareContext) side by side, so they can compare price, distance,
// average rating, and amenities at a glance.

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useCompare } from '../context/CompareContext';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { Property } from '../types';
import { colors, radius, shadow, spacing } from '../theme';

// A row of extra numbers we calculate for each property being compared.
interface CompareStats {
  distanceKm: number | null;
  averageRating: number | null;
  reviewCount: number;
}

export default function CompareScreen() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState<Record<string, CompareStats>>({});

  // Get the user's current location once, so we can show each property's
  // distance from them.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      }
    })();
  }, []);

  // For every property in the compare list, load its reviews and work out
  // its average star rating (simple math, done in plain JS).
  useEffect(() => {
    async function loadStatsForProperty(property: Property) {
      const reviewsQuery = query(collection(db, 'reviews'), where('propertyId', '==', property.id));
      const snapshot = await getDocs(reviewsQuery);

      let averageRating: number | null = null;
      if (!snapshot.empty) {
        const total = snapshot.docs.reduce((sum, docSnap) => sum + docSnap.data().rating, 0);
        averageRating = total / snapshot.docs.length;
      }

      const distanceKm = userLocation
        ? getDistanceInKm(userLocation.lat, userLocation.lng, property.latitude, property.longitude)
        : null;

      setStats((previous) => ({
        ...previous,
        [property.id]: {
          distanceKm,
          averageRating,
          reviewCount: snapshot.docs.length,
        },
      }));
    }

    compareList.forEach((property) => loadStatsForProperty(property));
  }, [compareList, userLocation]);

  if (compareList.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Add at least 2 properties to compare (use the "Compare" button on a property's
          details page).
        </Text>
      </View>
    );
  }

  // Every amenity that appears on ANY of the compared properties, so we can
  // show one row per amenity with a check/cross for each property.
  const allAmenities = Array.from(
    new Set(compareList.flatMap((property) => property.amenities))
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal>
        <View>
          {/* Header row: one column per property */}
          <View style={styles.row}>
            <View style={styles.labelCell} />
            {compareList.map((property) => (
              <View key={property.id} style={styles.column}>
                <Text style={styles.propertyTitle} numberOfLines={2}>
                  {property.title}
                </Text>
                <Pressable style={styles.removeLinkRow} onPress={() => removeFromCompare(property.id)}>
                  <Ionicons name="close-circle" size={13} color={colors.danger} />
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <CompareRow
            label="Price"
            values={compareList.map((property) => `₱${property.price}`)}
          />
          <CompareRow
            label="Room Type"
            values={compareList.map((property) => property.roomType)}
          />
          <CompareRow
            label="Distance"
            values={compareList.map((property) => {
              const distanceKm = stats[property.id]?.distanceKm;
              return distanceKm !== undefined && distanceKm !== null
                ? formatDistance(distanceKm)
                : '...';
            })}
          />
          <CompareRow
            label="Rating"
            values={compareList.map((property) => {
              const propertyStats = stats[property.id];
              if (!propertyStats || propertyStats.reviewCount === 0) {
                return <Text style={styles.valueText}>No reviews</Text>;
              }
              return (
                <View style={styles.ratingCell}>
                  <Ionicons name="star" size={13} color={colors.amber} />
                  <Text style={styles.valueText}>
                    {propertyStats.averageRating?.toFixed(1)} ({propertyStats.reviewCount})
                  </Text>
                </View>
              );
            })}
          />

          {allAmenities.map((amenity) => (
            <CompareRow
              key={amenity}
              label={amenity}
              values={compareList.map((property) => (
                <Ionicons
                  name={property.amenities.includes(amenity) ? 'checkmark-circle' : 'close-circle-outline'}
                  size={16}
                  color={property.amenities.includes(amenity) ? colors.green : colors.muted}
                />
              ))}
            />
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.clearButton} onPress={clearCompare}>
        <Ionicons name="trash-outline" size={15} color={colors.danger} />
        <Text style={styles.clearButtonText}>Clear Compare List</Text>
      </Pressable>
    </View>
  );
}

// One row of the comparison table: a label on the left, then one value per
// property being compared. `values` can be plain text or a small element
// (like a star icon + number) -- either way it just gets placed in a column.
function CompareRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelCell}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
      {values.map((value, index) => (
        <View key={index} style={styles.column}>
          {typeof value === 'string' ? <Text style={styles.valueText}>{value}</Text> : value}
        </View>
      ))}
    </View>
  );
}

const COLUMN_WIDTH = 130;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 22 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  labelCell: { width: 100, padding: spacing.sm + 2, justifyContent: 'center', backgroundColor: colors.mist },
  labelText: { fontWeight: '600', fontSize: 13, color: colors.ink },
  column: { width: COLUMN_WIDTH, padding: spacing.sm + 2, justifyContent: 'center' },
  propertyTitle: { fontWeight: 'bold', fontSize: 13, marginBottom: 4, color: colors.ink },
  removeLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeLink: { color: colors.danger, fontSize: 11, fontWeight: '600' },
  ratingCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 13, color: colors.inkSoft },
  clearButton: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  clearButtonText: { color: colors.danger, fontWeight: '600' },
});
