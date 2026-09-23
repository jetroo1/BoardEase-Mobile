// Comparison screen: shows the 2-3 properties the user picked (stored in
// CompareContext) side by side, so they can compare price, distance,
// average rating, and amenities at a glance.
//
// It is a table, and tables are where most apps look unfinished. The rules
// applied here:
//   - one horizontal rule between rows, no vertical gridlines and no 3D chrome
//   - the label column stays put while the property columns scroll, so you
//     never lose track of which row you are reading
//   - amenities show a tick or a dash, never a blank cell: an empty cell is
//     ambiguous between "no" and "we don't know"
//   - numbers line up, so magnitudes can actually be compared

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useCompare } from '../context/CompareContext';
import { Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { Property } from '../types';
import { RootStackParamList } from '../navigation/types';
import {
  EmptyState,
  ErrorState,
  Pressable,
  PropertyPhoto,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// A row of extra numbers we calculate for each property being compared.
interface CompareStats {
  distanceKm: number | null;
  averageRating: number | null;
  reviewCount: number;
}

const COLUMN_WIDTH = 150;
const LABEL_WIDTH = 104;

export default function CompareScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const [stats, setStats] = useState<Record<string, CompareStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Get the user's current location once, so we can show each property's
  // distance from them. locationChecked flips either way, so a refused
  // permission resolves the "Distance" row to "Unknown" instead of leaving
  // it showing "..." forever.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({});
          if (!cancelled) {
            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        }
      } catch {
        // Distance is a nice-to-have here; everything else on this screen
        // still works without it.
      } finally {
        if (!cancelled) {
          setLocationChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // For every property in the compare list, load its reviews and work out
  // its average star rating (simple math, done in plain JS).
  const loadStats = useCallback(async () => {
    if (compareList.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // One pass over all of them rather than a setState per property: the
      // old version fired an independent write per listing, so the table
      // filled in raggedly, a cell at a time.
      const entries = await Promise.all(
        compareList.map(async (property: Property) => {
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('propertyId', '==', property.id)
          );
          const snapshot = await getDocs(reviewsQuery);

          let averageRating: number | null = null;
          if (!snapshot.empty) {
            const total = snapshot.docs.reduce(
              (sum, docSnap) => sum + docSnap.data().rating,
              0
            );
            averageRating = total / snapshot.docs.length;
          }

          const distanceKm = userLocation
            ? getDistanceInKm(
                userLocation.lat,
                userLocation.lng,
                property.latitude,
                property.longitude
              )
            : null;

          return [
            property.id,
            { distanceKm, averageRating, reviewCount: snapshot.docs.length },
          ] as const;
        })
      );

      setStats((previous) => {
        // Merge rather than replace. When the GPS fix lands this runs a second
        // time; replacing would blank every rating for a frame before the new
        // objects arrive.
        const next = { ...previous };
        entries.forEach(([id, value]) => {
          next[id] = value;
        });
        return next;
      });
    } catch {
      // The old version had no catch here at all, so a dropped connection
      // became an unhandled rejection and the table simply stayed blank.
      setErrorMessage('Could not load ratings for these listings.');
    } finally {
      setIsLoading(false);
    }
  }, [compareList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Clearing throws away a selection the user built up deliberately, so it
  // names what it is about to destroy rather than asking "Are you sure?".
  function confirmClear() {
    Alert.alert(
      'Clear comparison?',
      `This removes all ${compareList.length} listings from the comparison. The listings themselves are not deleted.`,
      [
        { text: 'Keep them', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCompare();
            navigation.goBack();
          },
        },
      ]
    );
  }

  // ---- States --------------------------------------------------------------

  if (compareList.length === 0) {
    return (
      <Screen edges={false}>
        <EmptyState
          icon="git-compare-outline"
          title="Nothing to compare yet"
          message="Add at least two boarding houses using the compare icon on a listing card, then come back here to see them side by side."
          actionLabel="Browse listings"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen edges={false}>
        <ErrorState message={errorMessage} onRetry={loadStats} />
      </Screen>
    );
  }

  // Every amenity that appears on ANY of the compared properties, so we can
  // show one row per amenity with a tick/dash for each property.
  const allAmenities = Array.from(
    new Set(compareList.flatMap((property) => property.amenities))
  ).sort();

  // Distance is pure arithmetic on coordinates we already have, so it is
  // computed here rather than fetched. It used to be stored alongside the
  // review stats, which meant the GPS fix arriving re-ran every listing's
  // review query a second time for no reason.
  function distanceLabel(property: Property): string {
    if (userLocation) {
      return formatDistance(
        getDistanceInKm(
          userLocation.lat,
          userLocation.lng,
          property.latitude,
          property.longitude
        )
      );
    }
    // Only honest once we know the answer is not coming.
    return locationChecked ? 'Unknown' : '…';
  }

  return (
    // The header comes from RootNavigator (see detailHeader there), so this
    // screen must not draw a second one.
    <Screen edges={false}>
      <Text
        variant="caption"
        tone="faint"
        style={{ paddingHorizontal: t.spacing.md, paddingBottom: t.spacing.xs }}
      >
        {compareList.length} listings side by side
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* The label column is outside the horizontal scroller, so it stays
            in place while the property columns move. */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: LABEL_WIDTH }}>
            <View style={[styles.headerCell, { width: LABEL_WIDTH }]} />
            <LabelCell label="Price" />
            <LabelCell label="Room type" />
            <LabelCell label="Distance" />
            <LabelCell label="Rating" />
            {allAmenities.map((amenity) => (
              <LabelCell key={amenity} label={amenity} />
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {compareList.map((property) => {
                const propertyStats = stats[property.id];
                return (
                  <View key={property.id} style={{ width: COLUMN_WIDTH }}>
                    <View style={styles.headerCell}>
                      {/* Tappable: comparing is how you decide, so the screen
                          has to let you act on the decision. Without this you
                          pick a winner and then have to go back and find it
                          again in the list. */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${property.title}`}
                        onPress={() =>
                          navigation.navigate('Details', { propertyId: property.id })
                        }
                        style={{ gap: t.spacing.xxs }}
                      >
                        <PropertyPhoto
                          uri={property.imageUrl}
                          title={property.title}
                          roomType={property.roomType}
                          height={64}
                          radius={t.radius.sm}
                        />
                        <Text variant="captionStrong" numberOfLines={2}>
                          {property.title}
                        </Text>
                        <View style={styles.viewRow}>
                          <Text variant="micro" tone="brand">
                            View
                          </Text>
                          <Ionicons name="arrow-forward" size={10} color={t.colors.brand} />
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${property.title} from comparison`}
                        onPress={() => removeFromCompare(property.id)}
                        style={styles.removeRow}
                      >
                        <Ionicons name="close-circle" size={13} color={t.colors.danger} />
                        <Text variant="micro" tone="danger">
                          Remove
                        </Text>
                      </Pressable>
                    </View>

                    <ValueCell>
                      <Text variant="bodyStrong" tone="brand">
                        {formatPeso(property.price)}
                      </Text>
                    </ValueCell>

                    <ValueCell>
                      <Text variant="caption" tone="soft">
                        {property.roomType}
                      </Text>
                    </ValueCell>

                    <ValueCell>
                      {isLoading && !locationChecked ? (
                        <Skeleton height={14} width="60%" />
                      ) : (
                        <Text variant="caption" tone="soft">
                          {distanceLabel(property)}
                        </Text>
                      )}
                    </ValueCell>

                    <ValueCell>
                      {isLoading ? (
                        <Skeleton height={14} width="60%" />
                      ) : !propertyStats || propertyStats.reviewCount === 0 ? (
                        <Text variant="caption" tone="faint">
                          No reviews
                        </Text>
                      ) : (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={13} color={t.colors.star} />
                          <Text variant="caption" tone="soft">
                            {propertyStats.averageRating?.toFixed(1)} ({propertyStats.reviewCount})
                          </Text>
                        </View>
                      )}
                    </ValueCell>

                    {allAmenities.map((amenity) => {
                      const has = property.amenities.includes(amenity);
                      return (
                        <ValueCell key={amenity}>
                          {/* Icon plus a label for screen readers -- a bare
                              tick is meaningless without the row heading,
                              which a screen reader does not carry across. */}
                          <Ionicons
                            name={has ? 'checkmark-circle' : 'remove-circle-outline'}
                            size={17}
                            color={has ? t.colors.success : t.colors.inkFaint}
                            accessibilityLabel={
                              has ? `Has ${amenity}` : `No ${amenity}`
                            }
                          />
                        </ValueCell>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear the comparison list"
          onPress={confirmClear}
          style={styles.clearButton}
        >
          <Ionicons name="trash-outline" size={15} color={t.colors.danger} />
          <Text variant="captionStrong" tone="danger">
            Clear comparison
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function LabelCell({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.cell, styles.labelCell]}>
      <Text variant="captionStrong" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ValueCell({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.cell}>{children}</View>;
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    headerCell: {
      width: COLUMN_WIDTH,
      padding: t.spacing.xs,
      gap: t.spacing.xxs,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.lineStrong,
      backgroundColor: t.colors.surfaceAlt,
      // Fixed so every column's header is the same height regardless of how
      // long the title wraps -- otherwise the rows below stop lining up.
      height: 172,
    },
    // One horizontal rule between rows, no vertical lines. Both together is
    // what makes a grid look like a spreadsheet from 1998.
    cell: {
      height: 52,
      paddingHorizontal: t.spacing.sm,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.line,
    },
    labelCell: {
      width: LABEL_WIDTH,
      backgroundColor: t.colors.canvasAlt,
    },
    removeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.xs,
      padding: t.spacing.md,
      marginTop: t.spacing.sm,
    },
  });
