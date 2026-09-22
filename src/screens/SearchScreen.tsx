// Search screen: the main "discovery" screen.
//
// What it does, step by step:
// 1. Ask the phone for the user's GPS location (expo-location).
// 2. Fetch every approved property from Firestore.
// 3. Use our Haversine helper (src/utils/distance.ts) to work out how far
//    away each property is from the user.
// 4. Sort the list so the closest property is first.
// 5. Apply any filters the user picked on the Filter screen.
// 6. Show the results in a simple scrollable list.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { scoreProperties } from '../utils/scoring';
import { EMPTY_FILTERS, Filters, Property, PropertyWithDistance } from '../types';
import { RootStackParamList } from '../navigation/types';
import CompareBar from '../components/CompareBar';
import { useCompare } from '../context/CompareContext';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCompare } = useCompare();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [allProperties, setAllProperties] = useState<PropertyWithDistance[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // "recommended" = smart-ranked by distance + budget fit + amenities match.
  // "nearest" = plain distance sort. Recommended is the default, matching
  // the proposal's "Smart Filter & Recommendation" feature.
  const [sortMode, setSortMode] = useState<'recommended' | 'nearest'>('recommended');

  // Loads the user's location, then loads and sorts nearby properties.
  const loadNearbyProperties = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Step 1: ask permission to use the phone's GPS.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location permission is needed to find nearby boarding houses.');
        setIsLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setUserLocation(currentLocation);

      // Step 2: fetch every property that has been approved by an admin.
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('isApproved', '==', true)
      );
      const snapshot = await getDocs(propertiesQuery);

      const properties: Property[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Property, 'id'>),
      }));

      // Step 3 + 4: compute each property's distance from the user, then
      // sort the list so the nearest property is at the top.
      const withDistance: PropertyWithDistance[] = properties.map((property) => ({
        ...property,
        distanceKm: getDistanceInKm(
          currentLocation.lat,
          currentLocation.lng,
          property.latitude,
          property.longitude
        ),
      }));
      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

      setAllProperties(withDistance);
    } catch (error: any) {
      setErrorMessage(error.message || 'Could not load nearby boarding houses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run once when the screen first appears.
  useEffect(() => {
    loadNearbyProperties();
  }, [loadNearbyProperties]);

  // Also refresh every time the user comes back to this tab, in case they
  // just added/removed a favorite or the admin approved a new listing.
  useFocusEffect(
    useCallback(() => {
      loadNearbyProperties();
    }, [loadNearbyProperties])
  );

  // Step 5: apply the currently selected filters as plain JS array filters
  // (no Firestore compound queries -- keeps things simple to read).
  const filteredProperties = allProperties.filter((property) => {
    if (filters.maxPrice !== null && property.price > filters.maxPrice) {
      return false;
    }
    if (filters.roomType !== null && property.roomType !== filters.roomType) {
      return false;
    }
    if (filters.amenities.length > 0) {
      const hasAllSelectedAmenities = filters.amenities.every((amenity) =>
        property.amenities.includes(amenity)
      );
      if (!hasAllSelectedAmenities) {
        return false;
      }
    }
    return true;
  });

  // Step 6: "Smart Filter & Recommendation" -- give every property a match
  // score (distance + budget fit + amenities) and, in "recommended" mode,
  // show the best matches first instead of just the nearest ones.
  const scoredProperties = scoreProperties(filteredProperties, filters);
  const visibleProperties =
    sortMode === 'recommended'
      ? [...scoredProperties].sort((a, b) => b.matchScore - a.matchScore)
      : [...scoredProperties].sort((a, b) => a.distanceKm - b.distanceKm);

  function openFilterScreen() {
    navigation.navigate('Filter', {
      currentFilters: filters,
      // The Filter screen will call this with the new choices, then go back.
      onApply: (newFilters) => setFilters(newFilters),
    });
  }

  function renderItem({ item }: { item: PropertyWithDistance & { matchScore: number } }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('Details', { propertyId: item.id })}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardAddress}>{item.address}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="location" size={12} color={colors.sky} />
            <Text style={styles.cardMeta}>
              ₱{item.price} · {item.roomType} · {formatDistance(item.distanceKm)} away
            </Text>
          </View>
          {sortMode === 'recommended' && (
            <Text style={styles.matchBadge}>{item.matchScore}% match</Text>
          )}
        </View>
        <Pressable style={styles.compareButton} onPress={() => addToCompare(item)}>
          <Ionicons name="add-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.compareButtonText}>Compare</Text>
        </Pressable>
      </Pressable>
    );
  }

  function toggleSortMode() {
    setSortMode((current) => (current === 'recommended' ? 'nearest' : 'recommended'));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Boarding Houses</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.smallButton} onPress={openFilterScreen}>
            <Ionicons name="options" size={14} color={colors.deep} />
            <Text style={styles.smallButtonText}>Filter</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={toggleSortMode}>
            <Ionicons name="swap-vertical" size={14} color={colors.deep} />
            <Text style={styles.smallButtonText}>
              Sort: {sortMode === 'recommended' ? 'Recommended' : 'Nearest'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.smallButton}
            onPress={() => navigation.navigate('Map', { properties: visibleProperties })}
          >
            <Ionicons name="map" size={14} color={colors.deep} />
            <Text style={styles.smallButtonText}>Map View</Text>
          </Pressable>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      )}

      {!isLoading && errorMessage !== '' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {!isLoading && errorMessage === '' && (
        <FlatList
          data={visibleProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No boarding houses match your search yet.</Text>
            </View>
          }
        />
      )}

      <CompareBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.ink },
  headerButtons: { flexDirection: 'row', marginTop: spacing.sm + 2, gap: spacing.sm + 2 },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    ...shadow.card,
  },
  smallButtonText: { color: colors.deep, fontWeight: '600', fontSize: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { color: colors.danger, textAlign: 'center' },
  emptyText: { color: colors.muted, textAlign: 'center' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.sm + 4,
    padding: spacing.sm + 2,
    gap: spacing.sm + 2,
    ...shadow.card,
  },
  cardImage: { width: 64, height: 64, borderRadius: radius.sm },
  cardImagePlaceholder: {
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 10, color: colors.muted },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.ink },
  cardAddress: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMeta: { fontSize: 12, color: colors.sky },
  matchBadge: { fontSize: 11, color: colors.green, fontWeight: '600', marginTop: 4 },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  compareButtonText: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
});
