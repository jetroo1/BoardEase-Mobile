// Map View screen: the search results as a map you can actually shop from
// (see src/components/LeafletMap.tsx for why the map itself is a WebView).
//
// The design this follows treats the map as the primary surface and floats
// everything else on top of it:
//   - a search pill and circular controls sit over the map, not above it, so
//     the map keeps the full height of the display
//   - each listing is a price card on the map, so "how much?" is answered
//     without tapping anything
//   - a swipeable carousel along the bottom is tied to those markers in both
//     directions: swiping a card pans the map, tapping a marker scrolls the
//     carousel
//
// That two-way link is the whole point. A map and a list that do not know
// about each other force the user to hold the connection in their head.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeafletMap, { MapMarker } from '../components/LeafletMap';
import { db } from '../firebaseConfig';
import { AppParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { GUTTER } from '../theme';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { Property, PropertyWithDistance } from '../types';
import {
  Card,
  EmptyState,
  ErrorState,
  Pressable,
  PropertyPhoto,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<AppParamList>;

// Height the carousel occupies, used to keep map markers clear of it.
const CARD_HEIGHT = 116;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listRef = useRef<FlatList>(null);
  const [properties, setProperties] = useState<PropertyWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Map is a tab now rather than something Search pushes, so it loads its own
  // listings instead of being handed a result set. Distance is optional: with
  // GPS off the map still shows every boarding house, it just cannot sort or
  // label them by how far away they are.
  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    let currentLocation: { lat: number; lng: number } | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted' && (await Location.hasServicesEnabledAsync())) {
        const position = await Location.getCurrentPositionAsync({});
        currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      }
    } catch {
      // GPS being unavailable must never stop the map from drawing.
    }
    setUserLocation(currentLocation);

    try {
      const snapshot = await getDocs(
        query(collection(db, 'properties'), where('isApproved', '==', true))
      );
      const loaded: PropertyWithDistance[] = snapshot.docs.map((docSnap) => {
        const property = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<Property, 'id'>),
        };
        return {
          ...property,
          distanceKm: currentLocation
            ? getDistanceInKm(
                currentLocation.lat,
                currentLocation.lng,
                property.latitude,
                property.longitude
              )
            : Number.POSITIVE_INFINITY,
        };
      });
      loaded.sort((a, b) => a.distanceKm - b.distanceKm);
      setProperties(loaded);
      setSelectedId(loaded.length > 0 ? loaded[0].id : null);
    } catch {
      setErrorMessage('Could not load the map. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties])
  );

  // One card fills the width minus the gutters; the next one peeks in from
  // the edge, which is what tells the user there is more to swipe to.
  const cardWidth = width - GUTTER * 2 - t.spacing.lg;
  const snapInterval = cardWidth + t.spacing.sm;

  // Searching filters what is already loaded rather than hitting Firestore
  // again -- the whole approved set is small and already in memory.
  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return properties;
    }
    return properties.filter(
      (property) =>
        property.title.toLowerCase().includes(term) ||
        property.address.toLowerCase().includes(term)
    );
  }, [properties, searchTerm]);

  const markers: MapMarker[] = visible.map((property) => ({
    id: property.id,
    lat: property.latitude,
    lng: property.longitude,
    title: property.title,
    price: formatPeso(property.price),
  }));

  // If a search removes the selected listing, move the selection to whatever
  // is still on screen rather than leaving a highlight pointing at nothing.
  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!visible.some((property) => property.id === selectedId)) {
      setSelectedId(visible[0].id);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [visible, selectedId]);

  // Marker tap -> scroll the carousel to the matching card.
  const handleMarkerPress = useCallback(
    (propertyId: string) => {
      const index = visible.findIndex((property) => property.id === propertyId);
      if (index < 0) {
        return;
      }
      setSelectedId(propertyId);
      listRef.current?.scrollToOffset({ offset: index * snapInterval, animated: true });
    },
    [visible, snapInterval]
  );

  // Carousel settle -> highlight the matching marker and pan to it.
  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    const property = visible[index];
    if (property && property.id !== selectedId) {
      setSelectedId(property.id);
    }
  }

  async function recentreOnUser() {
    try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location unavailable', 'Enable location access in your phone settings to centre the map on you.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    // Deliberately does NOT clear selectedId. It used to, so the map would
    // refit to everything -- but the guard effect below immediately reselects
    // the first listing and yanks the carousel back to card one, so the only
    // visible result of pressing Recentre was losing your place.
    } catch {
      Alert.alert('Location unavailable', 'Check that location services are switched on and try again.');
    }
  }

  // These two states were being computed and then never shown, so a failed
  // fetch looked identical to "there are simply no listings" -- with no way
  // to retry -- and the same pill claimed "0 listings" while still loading.
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.colors.canvas,
          paddingTop: insets.top,
          padding: GUTTER,
          gap: t.spacing.sm,
        }}
      >
        <Skeleton height={44} radius={t.radius.pill} />
        <Skeleton height={24} width="45%" radius={t.radius.pill} />
        <Skeleton height={280} radius={t.radius.md} />
        <Skeleton height={CARD_HEIGHT} radius={t.radius.lg} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.canvas, paddingTop: insets.top }}>
        <ErrorState message={errorMessage} onRetry={loadProperties} />
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.canvas, paddingTop: insets.top }}>
        <EmptyState
          icon="map-outline"
          title="No listings to map"
          message="There are no approved boarding houses yet. Once an admin approves one it will appear here."
          actionLabel="Refresh"
          onAction={loadProperties}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.canvas, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <LeafletMap
        markers={markers}
        userLocation={userLocation}
        selectedId={selectedId}
        onMarkerPress={handleMarkerPress}
        bottomInset={CARD_HEIGHT + t.spacing.xl}
      />

      {/* --- Floating controls, top ------------------------------------- */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + t.spacing.xs,
          left: GUTTER,
          right: GUTTER,
          gap: t.spacing.xs,
        }}
      >
        {/* No back button: Map is a bottom tab now, so there is nowhere to go
            back to. The search pill takes the space instead. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.xs,
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.pill,
              paddingHorizontal: t.spacing.sm,
              height: 44,
              ...t.elevation.medium,
            }}
          >
            <Ionicons name="search" size={17} color={t.colors.inkFaint} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search this map"
              placeholderTextColor={t.colors.inkFaint}
              accessibilityLabel="Search boarding houses on the map"
              returnKeyType="search"
              style={[t.type.body, { flex: 1, color: t.colors.ink, paddingVertical: 0 }]}
            />
            {searchTerm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearchTerm('')}
                style={{ padding: t.spacing.xxs }}
              >
                <Ionicons name="close-circle" size={17} color={t.colors.inkFaint} />
              </Pressable>
            ) : null}
          </View>

          <FloatingControl
            icon="locate"
            label="Centre the map on my location"
            onPress={recentreOnUser}
          />
        </View>

        {/* Result count doubles as the "no matches" message, so the map is
            never silently empty with no explanation. */}
        <View style={{ alignSelf: 'flex-start' }}>
          <View
            style={{
              backgroundColor: visible.length === 0 ? t.colors.dangerSoft : t.colors.surface,
              paddingHorizontal: t.spacing.sm,
              paddingVertical: t.spacing.xxs,
              borderRadius: t.radius.pill,
              ...t.elevation.low,
            }}
          >
            <Text variant="micro" tone={visible.length === 0 ? 'danger' : 'soft'}>
              {visible.length === 0
                ? searchTerm.trim() ? `Nothing matches "${searchTerm.trim()}"` : 'No listings to show'
                : `${visible.length} listing${visible.length === 1 ? '' : 's'} on the map`}
            </Text>
          </View>
        </View>
      </View>

      {/* --- Carousel, bottom ------------------------------------------- */}
      {visible.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 28,
          }}
        >
          <FlatList
            ref={listRef}
            horizontal
            data={visible}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="start"
            onMomentumScrollEnd={handleScrollEnd}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: t.spacing.sm }}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  onPress={() => navigation.navigate('Details', { propertyId: item.id })}
                  style={{ width: cardWidth }}
                >
                  <Card
                    level="high"
                    padded={false}
                    style={{
                      flexDirection: 'row',
                      gap: t.spacing.sm,
                      padding: t.spacing.xs,
                      height: CARD_HEIGHT,
                      borderRadius: t.radius.lg,
                      // The selected card gets a brand outline so the link
                      // between it and the highlighted marker is visible.
                      borderWidth: 2,
                      borderColor: selected ? t.colors.brand : 'transparent',
                    }}
                  >
                    <PropertyPhoto
                      uri={item.imageUrl}
                      title={item.title}
                      roomType={item.roomType}
                      height={CARD_HEIGHT - t.spacing.md}
                      radius={t.radius.md}
                      style={{ width: 92 }}
                    />

                    <View style={{ flex: 1, paddingVertical: t.spacing.xxs, gap: 3 }}>
                      <Text variant="captionStrong" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text variant="micro" tone="faint" numberOfLines={1}>
                        {item.address}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}
                      >
                        <Ionicons name="walk-outline" size={11} color={t.colors.inkFaint} />
                        <Text variant="micro" tone="faint">
                          {formatDistance(item.distanceKm)}
                        </Text>
                        <Text variant="micro" tone="faint">
                          ·
                        </Text>
                        <Text variant="micro" tone="faint">
                          {item.roomType}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                        }}
                      >
                        <Text variant="bodyStrong" tone="brand">
                          {formatPeso(item.price)}
                          <Text variant="micro" tone="faint">
                            {' '}
                            /mo
                          </Text>
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <Text variant="micro" tone="brand">
                            Details
                          </Text>
                          <Ionicons name="arrow-forward" size={11} color={t.colors.brand} />
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />

          {/* No "swipe to see more" caption. It sat in the gap between the
              card and the tab bar, printed over the map's attribution line,
              and said what the half-visible next card already says. */}
        </View>
      ) : null}
    </View>
  );
}

// A circular control that floats on the map. White on light, surface on dark,
// always with elevation -- it has to stay legible over whatever tile happens
// to be underneath it.
function FloatingControl({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.surface,
        ...t.elevation.medium,
      }}
    >
      <Ionicons name={icon} size={19} color={t.colors.ink} />
    </Pressable>
  );
}
