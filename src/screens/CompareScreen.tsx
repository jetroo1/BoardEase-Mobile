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
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestLocation } from '../utils/locationAccess';
import { coverOf } from '../utils/photos';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { MAX_COMPARE_ITEMS, useCompare } from '../context/CompareContext';
import { Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { Property } from '../types';
import { RootStackParamList } from '../navigation/types';
import {
  Button,
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

// Columns share out whatever is left after the label column, down to a floor.
//
// A fixed 150 was fine for the two listings the screen was built for and
// wrong for four: the table ran off the side of the display and showed two
// columns of a four-way comparison, which is the one thing a comparison must
// not do. Sharing the width means two and three fit the screen exactly, and
// only four scrolls -- and then by a little, rather than by half the table.
//
// The floor exists because below it a column cannot hold a price and a
// wrapped title, and a column you cannot read is not better than scrolling to
// it.
const MIN_COLUMN_WIDTH = 96;
const LABEL_WIDTH = 88;

export default function CompareScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { width: screenWidth } = useWindowDimensions();

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
        const located = await requestLocation('compare');
        if (located.ok && !cancelled) setUserLocation(located.coords);
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

  // Confirmed on the screen itself, not through Alert.alert.
  //
  // Alert is not implemented in React Native Web, so in a browser the Clear
  // button did precisely nothing -- no dialog, no error, no clue. It worked on
  // a phone, which is the worst version of a bug: real on one platform and
  // invisible on the other.
  //
  // Asking here is better anyway. Clearing everything is rarely what somebody
  // wants when one of four listings is the one they have lost interest in, so
  // the confirmation says which listings are about to go and leaves the
  // per-listing Remove buttons right above it as the other way out.
  const [confirmingClear, setConfirmingClear] = useState(false);

  function handleClear() {
    clearCompare();
    setConfirmingClear(false);
    navigation.goBack();
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
  function distanceKm(property: Property): number | null {
    if (!userLocation) return null;
    return getDistanceInKm(
      userLocation.lat,
      userLocation.lng,
      property.latitude,
      property.longitude
    );
  }

  function distanceLabel(property: Property): string {
    const km = distanceKm(property);
    if (km !== null) {
      return formatDistance(km);
    }
    // Only honest once we know the answer is not coming.
    return locationChecked ? 'Unknown' : '…';
  }

  // Which listing wins each row.
  //
  // A table of numbers is not a comparison; it is the raw material for one,
  // and it leaves the reader doing the arithmetic the screen exists to do for
  // them. Four columns of prices in identical type says nothing about which is
  // cheapest until you read all four and remember them.
  //
  // Marked only when there is something to mark: if every listing is the same
  // price, or only one has been rated at all, nothing "wins" and highlighting
  // one of them would be inventing a distinction.
  function bestIds(
    valueOf: (property: Property) => number | null,
    prefer: 'low' | 'high'
  ): Set<string> {
    const scored = compareList
      .map((property) => ({ id: property.id, value: valueOf(property) }))
      .filter((entry): entry is { id: string; value: number } => entry.value !== null);

    if (scored.length < 2) return new Set();

    const best = scored.reduce(
      (carry, entry) =>
        prefer === 'low'
          ? Math.min(carry, entry.value)
          : Math.max(carry, entry.value),
      scored[0].value
    );

    // Everything equal means nothing stands out.
    if (scored.every((entry) => entry.value === best)) return new Set();

    return new Set(scored.filter((entry) => entry.value === best).map((entry) => entry.id));
  }

  // Share the width out, but never below the floor. Two and three listings
  // land inside the display; four overflows the floor and scrolls.
  const columnWidth = Math.max(
    MIN_COLUMN_WIDTH,
    Math.floor((screenWidth - LABEL_WIDTH) / compareList.length)
  );
  const scrolls = columnWidth * compareList.length > screenWidth - LABEL_WIDTH;

  const cheapest = bestIds((property) => property.price, 'low');
  const nearest = bestIds((property) => distanceKm(property), 'low');
  const bestRated = bestIds((property) => {
    const found = stats[property.id];
    return found && found.reviewCount > 0 ? found.averageRating : null;
  }, 'high');

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
        {scrolls ? ' · swipe the table to see them all' : ''}
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
                  <View key={property.id} style={{ width: columnWidth }}>
                    <View style={[styles.headerCell, { width: columnWidth }]}>
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
                          uri={coverOf(property)}
                          title={property.title}
                          roomType={property.roomType}
                          height={52}
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

                    <ValueCell best={cheapest.has(property.id)}>
                      <Text variant="bodyStrong" tone="brand">
                        {formatPeso(property.price)}
                      </Text>
                      {cheapest.has(property.id) ? <BestChip label="Cheapest" /> : null}
                    </ValueCell>

                    <ValueCell>
                      <Text variant="caption" tone="soft">
                        {property.roomType}
                      </Text>
                    </ValueCell>

                    <ValueCell best={nearest.has(property.id)}>
                      {isLoading && !locationChecked ? (
                        <Skeleton height={14} width="60%" />
                      ) : (
                        <>
                          <Text variant="caption" tone="soft">
                            {distanceLabel(property)}
                          </Text>
                          {nearest.has(property.id) ? <BestChip label="Nearest" /> : null}
                        </>
                      )}
                    </ValueCell>

                    <ValueCell best={bestRated.has(property.id)}>
                      {isLoading ? (
                        <Skeleton height={14} width="60%" />
                      ) : !propertyStats || propertyStats.reviewCount === 0 ? (
                        <Text variant="caption" tone="faint">
                          No reviews
                        </Text>
                      ) : (
                        <>
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={13} color={t.colors.star} />
                            <Text variant="caption" tone="soft">
                              {propertyStats.averageRating?.toFixed(1)} ({propertyStats.reviewCount})
                            </Text>
                          </View>
                          {bestRated.has(property.id) ? <BestChip label="Top rated" /> : null}
                        </>
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

        {/* Add more, right where the gap in the table is obvious.
            A comparison starts as two listings because that is the question
            people actually arrive with. Once the table is on screen the next
            thought is usually "and how does that other place compare?", and
            until now the only way to act on it was to leave, find the listing
            and come back. */}
        {compareList.length < MAX_COMPARE_ITEMS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add another boarding house to the comparison"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
            style={styles.addButton}
          >
            <Ionicons name="add-circle-outline" size={17} color={t.colors.brand} />
            <Text variant="captionStrong" tone="brand">
              Add another ({compareList.length} of {MAX_COMPARE_ITEMS})
            </Text>
          </Pressable>
        ) : null}

        {confirmingClear ? (
          <View style={styles.confirmBox}>
            <Text variant="captionStrong">
              Remove all {compareList.length} listings?
            </Text>
            <Text variant="caption" tone="faint">
              {compareList.map((property) => property.title).join(', ')}. The listings
              themselves are not deleted, and you can remove just one with the Remove
              button above it instead.
            </Text>
            <View style={{ flexDirection: 'row', gap: t.spacing.xs }}>
              <Button
                label="Keep them"
                variant="secondary"
                onPress={() => setConfirmingClear(false)}
                style={{ flex: 1 }}
                fullWidth
              />
              <Button
                label="Remove all"
                icon="trash-outline"
                variant="danger"
                onPress={handleClear}
                style={{ flex: 1 }}
                fullWidth
              />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear the comparison list"
            onPress={() => setConfirmingClear(true)}
            style={styles.clearButton}
          >
            <Ionicons name="trash-outline" size={15} color={t.colors.danger} />
            <Text variant="captionStrong" tone="danger">
              Clear comparison
            </Text>
          </Pressable>
        )}
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

// A cell that knows whether it holds the winning value for its row. The tint
// is what lets somebody read a column downwards and see how often it comes
// out on top, without reading any of the numbers.
function ValueCell({ children, best = false }: { children: React.ReactNode; best?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.cell, best && styles.cellBest]}>{children}</View>;
}

// Says *why* a cell is marked. A tint on its own is a colour somebody has to
// work out; "Cheapest" is the answer they came for.
function BestChip({ label }: { label: string }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bestChip}>
      <Ionicons name="checkmark-circle" size={10} color={t.colors.success} />
      <Text variant="micro" style={{ color: t.colors.success }}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    headerCell: {
      padding: t.spacing.xs,
      gap: t.spacing.xxs,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.lineStrong,
      backgroundColor: t.colors.surfaceAlt,
      // Fixed so every column's header is the same height regardless of how
      // long the title wraps -- otherwise the rows below stop lining up.
      //
      // Trimmed from 172. The header is the part of the table that says the
      // least per pixel, and on a four-way comparison it was pushing the rows
      // that carry the actual answer off the bottom of the screen.
      height: 150,
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
    cellBest: {
      backgroundColor: t.colors.successSoft,
    },
    bestChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 2,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.xs,
      padding: t.spacing.md,
      marginTop: t.spacing.md,
      marginHorizontal: t.spacing.md,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.brand,
    },
    confirmBox: {
      margin: t.spacing.md,
      padding: t.spacing.md,
      gap: t.spacing.sm,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.line,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.xs,
      padding: t.spacing.md,
      marginTop: t.spacing.sm,
    },
  });
