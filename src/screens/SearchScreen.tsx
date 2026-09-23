// Search screen: the main "discovery" screen.
//
// What it does, step by step:
// 1. Ask the phone for the user's GPS location (expo-location).
// 2. Fetch every approved property from Firestore.
// 3. Use our Haversine helper (src/utils/distance.ts) to work out how far
//    away each property is from the user.
// 4. Sort the list so the closest property is first.
// 5. Apply any filters the user picked on the Filter screen.
// 6. Show the results in a scrollable list.
//
// The two empty states here are deliberately different. "No listings at all"
// and "none matched your filters" need different words and different escape
// routes -- telling someone to widen their filters when the database is empty
// sends them chasing a problem they cannot fix.

import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { scoreProperties } from '../utils/scoring';
import { EMPTY_FILTERS, Filters, Property, PropertyWithDistance } from '../types';
import { AppParamList, RootStackParamList } from '../navigation/types';
import CompareBar from '../components/CompareBar';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  addFavorite,
  FavoriteMap,
  loadFavoriteMap,
  removeFavorite,
} from '../utils/favorites';
import { GUTTER } from '../theme';
import {
  Button,
  EmptyState,
  ErrorState,
  Pill,
  Pressable,
  PropertyCard,
  PropertyCardSkeleton,
  Screen,
  ScreenHeader,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<AppParamList>;

type SortMode = 'recommended' | 'nearest';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCompare, removeFromCompare, compareList } = useCompare();
  const { user } = useAuth();
  const t = useTheme();

  // Which listings this user has already saved. Held as propertyId -> the
  // favourites document id, so the heart can both add and remove.
  const [favorites, setFavorites] = useState<FavoriteMap>({});
  // Guards against a double tap creating two favourite rows for one listing.
  const savingRef = useRef<Set<string>>(new Set());
  // False until the first load finishes, so the focus refresh can tell a
  // cold open from a return visit.
  const hasLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Separated from the generic error because the fix is completely different:
  // one is "try again", the other is "open Settings".
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [allProperties, setAllProperties] = useState<PropertyWithDistance[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // "recommended" = smart-ranked by distance + budget fit + amenities match.
  // "nearest" = plain distance sort. Recommended is the default, matching
  // the proposal's "Smart Filter & Recommendation" feature.
  const [sortMode, setSortMode] = useState<SortMode>('recommended');

  // Loads the user's location, then loads and sorts nearby properties.
  const loadNearbyProperties = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');
    setPermissionDenied(false);

    try {
      // Step 1: ask permission to use the phone's GPS.
      let currentLocation: { lat: number; lng: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && await Location.hasServicesEnabledAsync()) {
          const position = await Location.getCurrentPositionAsync({});
          currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        }
      } catch {
        // GPS availability must not prevent browsing the listing catalogue.
      }
      if (!currentLocation) {
        setPermissionDenied(true);
        setSortMode('recommended');
      }
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
        distanceKm: currentLocation ? getDistanceInKm(
          currentLocation.lat,
          currentLocation.lng,
          property.latitude,
          property.longitude
        ) : Number.POSITIVE_INFINITY,
      }));
      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

      setAllProperties(withDistance);
    } catch {
      setErrorMessage(
        'Could not load nearby boarding houses. Check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Also refresh every time the user comes back to this tab, in case they
  // just added/removed a favorite or the admin approved a new listing.
  useFocusEffect(
    useCallback(() => {
      // First visit shows skeletons; later visits are a quiet background
      // refresh. Passing `true` unconditionally meant the pull-to-refresh
      // spinner appeared on first mount, as if the user had pulled it.
      loadNearbyProperties(hasLoadedRef.current);
      hasLoadedRef.current = true;

      // Re-read the shortlist too, so a listing saved from the Details screen
      // (or unsaved from the Favorites tab) comes back with the right heart.
      if (user) {
        loadFavoriteMap(user.uid)
          .then(setFavorites)
          .catch(() => undefined);
      }
    }, [loadNearbyProperties, user])
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

  const activeFilterCount =
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.roomType !== null ? 1 : 0) +
    filters.amenities.length;

  function openFilterScreen() {
    navigation.navigate('Filter', {
      currentFilters: filters,
      // The Filter screen will call this with the new choices, then go back.
      onApply: (newFilters) => setFilters(newFilters),
    });
  }

  // The heart. Updates the screen first and reverses itself if Firestore
  // rejects the write -- a save that silently fails is worse than one that
  // visibly fails, because the user walks away thinking it is on their list.
  async function toggleFavorite(property: Property) {
    if (!user || savingRef.current.has(property.id)) {
      return;
    }
    savingRef.current.add(property.id);

    const existingDocId = favorites[property.id];
    try {
      if (existingDocId) {
        setFavorites((current) => {
          const next = { ...current };
          delete next[property.id];
          return next;
        });
        await removeFavorite(existingDocId);
      } else {
        const newDocId = await addFavorite(user.uid, property.id);
        setFavorites((current) => ({ ...current, [property.id]: newDocId }));
      }
    } catch {
      // Put it back the way it was and say so.
      setFavorites((current) => {
        const next = { ...current };
        if (existingDocId) {
          next[property.id] = existingDocId;
        } else {
          delete next[property.id];
        }
        return next;
      });
      Alert.alert('Could not save', 'Check your internet connection and try again.');
    } finally {
      savingRef.current.delete(property.id);
    }
  }

  function toggleCompare(property: Property) {
    if (compareList.some((item) => item.id === property.id)) {
      removeFromCompare(property.id);
    } else {
      addToCompare(property);
    }
  }

  // ---- The four states -----------------------------------------------------

  function renderBody() {
    if (isLoading) {
      // Skeletons rather than a spinner, so the list does not jump when the
      // real cards arrive -- the shape is already right.
      return (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: t.spacing.xs }}
          showsVerticalScrollIndicator={false}
        >
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </ScrollView>
      );
    }

    if (errorMessage) {
      return <ErrorState message={errorMessage} onRetry={() => loadNearbyProperties()} />;
    }

    return (
      <FlatList
        data={visibleProperties}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: t.spacing.xs,
          // Room for the floating compare bar so the last card is never
          // trapped underneath it.
          paddingBottom: t.spacing.xxl + t.spacing.lg,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNearbyProperties(true)}
            tintColor={t.colors.brand}
            colors={[t.colors.brand]}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            distanceLabel={userLocation ? formatDistance(item.distanceKm) : undefined}
            matchScore={sortMode === 'recommended' && userLocation ? item.matchScore : undefined}
            onPress={() => navigation.navigate('Details', { propertyId: item.id })}
            isFavorite={Boolean(favorites[item.id])}
            onToggleFavorite={() => toggleFavorite(item)}
            onCompare={() => toggleCompare(item)}
            inCompare={compareList.some((listed) => listed.id === item.id)}
            style={{ marginBottom: t.spacing.sm }}
          />
        )}
        ListEmptyComponent={
          allProperties.length === 0 ? (
            // Nothing exists yet.
            <EmptyState
              icon="home-outline"
              title="No listings yet"
              message="No boarding houses are available right now. Check back soon."
              actionLabel="Refresh"
              onAction={() => loadNearbyProperties()}
            />
          ) : (
            // Something exists, but the filters excluded all of it. Echo what
            // was applied and offer the way out.
            <EmptyState
              icon="filter-outline"
              title="No matches"
              message={`None of the ${allProperties.length} nearby listings match your ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}.`}
              actionLabel="Clear filters"
              onAction={() => setFilters(EMPTY_FILTERS)}
            />
          )
        }
      />
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow={userLocation ? 'Near your location' : 'Boarding houses'}
        title="Search"
        large
        showThemeToggle
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open map view"
            onPress={() => navigation.navigate('Map')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.xxs,
              paddingHorizontal: t.spacing.sm,
              paddingVertical: t.spacing.xs,
              borderRadius: t.radius.pill,
              backgroundColor: t.colors.brandSoft,
            }}
          >
            <Ionicons name="map-outline" size={15} color={t.colors.brand} />
            <Text variant="micro" tone="brand">
              Map
            </Text>
          </Pressable>
        }
      />

      {/* Controls row: sort on the left as a segmented control, filter on the
          right with its active count. A segmented control shows both options
          at once, so the alternative is visible instead of hidden behind a
          button that has to be tapped to discover what it does. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.xs,
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.xs,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: t.colors.canvasAlt,
            borderRadius: t.radius.pill,
            padding: 3,
            flex: 1,
          }}
        >
          {(['recommended', 'nearest'] as SortMode[]).map((mode) => {
            const active = sortMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={mode === 'recommended' ? 'Sort by recommended' : 'Sort by nearest'}
                animate={false}
                onPress={() => {
                  // Always select the tab. It used to only reload when there
                  // was no location, so tapping "Nearest" with GPS off left
                  // the control visibly unselected and looked broken.
                  setSortMode(mode);
                  if (mode === 'nearest' && !userLocation) {
                    loadNearbyProperties();
                  }
                }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: t.spacing.xs,
                  borderRadius: t.radius.pill,
                  backgroundColor: active ? t.colors.surface : 'transparent',
                  ...(active ? t.elevation.low : null),
                }}
              >
                <Text variant="captionStrong" tone={active ? 'brand' : 'faint'}>
                  {mode === 'recommended' ? 'Recommended' : 'Nearest'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} applied`
              : 'Open filters'
          }
          onPress={openFilterScreen}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.xxs,
            paddingHorizontal: t.spacing.sm,
            paddingVertical: t.spacing.xs,
            borderRadius: t.radius.pill,
            backgroundColor: activeFilterCount > 0 ? t.colors.brand : t.colors.canvasAlt,
          }}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={activeFilterCount > 0 ? t.colors.onBrand : t.colors.inkSoft}
          />
          <Text
            variant="captionStrong"
            style={{ color: activeFilterCount > 0 ? t.colors.onBrand : t.colors.inkSoft }}
          >
            {activeFilterCount > 0 ? activeFilterCount : 'Filter'}
          </Text>
        </Pressable>
      </View>

      {/* Applied filters as removable chips. Without this the user can filter
          themselves down to nothing and have no idea why the list is empty. */}
      {activeFilterCount > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            gap: t.spacing.xxs,
            paddingBottom: t.spacing.xs,
          }}
        >
          {filters.maxPrice !== null ? (
            <RemovableChip
              label={`Under ₱${filters.maxPrice.toLocaleString('en-PH')}`}
              onRemove={() => setFilters({ ...filters, maxPrice: null })}
            />
          ) : null}
          {filters.roomType !== null ? (
            <RemovableChip
              label={filters.roomType}
              onRemove={() => setFilters({ ...filters, roomType: null })}
            />
          ) : null}
          {filters.amenities.map((amenity) => (
            <RemovableChip
              key={amenity}
              label={amenity}
              onRemove={() =>
                setFilters({
                  ...filters,
                  amenities: filters.amenities.filter((item) => item !== amenity),
                })
              }
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={() => setFilters(EMPTY_FILTERS)}
            style={{ justifyContent: 'center', paddingHorizontal: t.spacing.xs }}
          >
            <Text variant="micro" tone="brand" uppercase>
              Clear all
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {/* Result count, so the user can tell a short list from a filtered one. */}
      {!isLoading && !errorMessage && !permissionDenied && visibleProperties.length > 0 ? (
        <Text
          variant="caption"
          tone="faint"
          style={{ paddingHorizontal: GUTTER, paddingBottom: t.spacing.xs }}
        >
          {visibleProperties.length} of {allProperties.length} nearby
        </Text>
      ) : null}

      {permissionDenied && !isLoading && (
        <View style={{ marginHorizontal: GUTTER, marginBottom: t.spacing.xs, padding: t.spacing.sm, borderRadius: 8, backgroundColor: t.colors.warningSoft, flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
          <Ionicons name="location-outline" size={18} color={t.colors.warning} />
          <Text variant="caption" style={{ flex: 1 }}>Browsing without distance</Text>
          <Button label="Settings" size="sm" variant="ghost" onPress={() => {
            Linking.openSettings().catch(() => Alert.alert('Open settings', 'Enable location access in your phone settings.'));
          }} />
        </View>
      )}
      {renderBody()}

      <CompareBar />
    </Screen>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove filter ${label}`}
      onPress={onRemove}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xxs,
        backgroundColor: t.colors.brandSoft,
        paddingLeft: t.spacing.sm,
        paddingRight: t.spacing.xs,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
      }}
    >
      <Text variant="micro" tone="brand">
        {label}
      </Text>
      <Ionicons name="close" size={13} color={t.colors.brand} />
    </Pressable>
  );
}
