// Navigation / Route Guide screen: shows a real walking route from the
// user's current location to the selected boarding house -- the line
// follows actual roads, and below the map we list the turn-by-turn steps.
//
// The route itself comes from OSRM, a free routing service
// (see src/utils/routing.ts for how we ask for it).

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRoute, RouteProp } from '@react-navigation/native';
import LeafletMap from '../components/LeafletMap';
import { fetchWalkingRoute, formatMeters, formatMinutes, WalkingRoute } from '../utils/routing';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type NavigationRouteProp = RouteProp<RootStackParamList, 'Navigation'>;

export default function NavigationScreen() {
  const route = useRoute<NavigationRouteProp>();
  const { property } = route.params;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Step 1: where is the user right now?
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Location permission is needed to show the route.');
          setIsLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(currentLocation);

        // Step 2: ask the routing service for directions to the property.
        const result = await fetchWalkingRoute(currentLocation, {
          lat: property.latitude,
          lng: property.longitude,
        });

        if (result === null) {
          setErrorMessage('Could not find a walking route to this boarding house.');
        } else {
          setWalkingRoute(result);
        }
      } catch (error: any) {
        setErrorMessage(error.message || 'Something went wrong while loading the route.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [property.latitude, property.longitude]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sky} />
        <Text style={styles.loadingText}>Finding the best walking route...</Text>
      </View>
    );
  }

  if (errorMessage !== '') {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={32} color={colors.danger} />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="walk" size={18} color={colors.white} />
        <Text style={styles.bannerText}>
          {walkingRoute
            ? `${formatMeters(walkingRoute.totalDistanceMeters)} · about ${formatMinutes(
                walkingRoute.totalDurationSeconds
              )} walk`
            : property.title}
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <LeafletMap
          markers={[
            {
              id: property.id,
              lat: property.latitude,
              lng: property.longitude,
              title: property.title,
            },
          ]}
          userLocation={userLocation}
          routeLine={walkingRoute ? walkingRoute.line : null}
        />
      </View>

      <View style={styles.stepsWrapper}>
        <Text style={styles.stepsTitle}>Directions to {property.title}</Text>
        <FlatList
          data={walkingRoute ? walkingRoute.steps : []}
          keyExtractor={(item, index) => String(index)}
          renderItem={({ item, index }) => (
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepInstruction}>{item.instruction}</Text>
                {item.distanceMeters > 0 && (
                  <Text style={styles.stepDistance}>{formatMeters(item.distanceMeters)}</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.stepDistance}>No steps available.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: { color: colors.muted },
  errorText: { color: colors.danger, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.deep,
    padding: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bannerText: { color: colors.white, textAlign: 'center', fontWeight: '600', flexShrink: 1 },
  // The map takes the top half, the written directions the bottom half.
  mapWrapper: { flex: 1 },
  stepsWrapper: { flex: 1, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  stepsTitle: { fontSize: 15, fontWeight: 'bold', color: colors.ink, marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, marginBottom: spacing.sm + 2 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  stepTextWrap: { flex: 1 },
  stepInstruction: { fontSize: 14, color: colors.ink },
  stepDistance: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
