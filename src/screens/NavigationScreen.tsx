// Navigation / Route Guide screen: shows a real walking route from the
// user's current location to the selected boarding house -- the line
// follows actual roads, and below the map we list the turn-by-turn steps.
//
// The route itself comes from OSRM, a free routing service
// (see src/utils/routing.ts for how we ask for it).
//
// This screen tracks the user LIVE. It used to take a single GPS fix when it
// opened, draw a line, and then never move again -- which looks like a map
// with a picture of a route on it rather than something guiding you. Now the
// dot follows you as you walk, the remaining distance counts down, and if you
// wander off the path the route is recalculated from where you actually are.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRoute, RouteProp } from '@react-navigation/native';
import LeafletMap from '../components/LeafletMap';
import { fetchWalkingRoute, formatMeters, formatMinutes, WalkingRoute } from '../utils/routing';
import { RootStackParamList } from '../navigation/types';
import { getDistanceInKm } from '../utils/distance';
import { Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { EmptyState, ErrorState, Screen, Skeleton, Text } from '../components/ui';

type NavigationRouteProp = RouteProp<RootStackParamList, 'Navigation'>;

type Point = { lat: number; lng: number };

// How far off the drawn route the user has to get before we ask OSRM for a
// fresh one. Too small and a normal GPS wobble triggers constant re-routing
// against a public API; too big and you walk a block the wrong way before the
// app admits it.
const OFF_ROUTE_METRES = 45;

// Inside this radius we call it arrived and stop recalculating. Consumer GPS
// is not accurate enough to do better than this on foot.
const ARRIVED_METRES = 25;

// Balanced tracking: a fix roughly every 5 metres. Smooth enough that the dot
// glides rather than jumping, without the battery cost of BestForNavigation.
const DISTANCE_INTERVAL_M = 5;

export default function NavigationScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute<NavigationRouteProp>();
  const { property } = route.params;

  const destination: Point = { lat: property.latitude, lng: property.longitude };

  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [remainingMetres, setRemainingMetres] = useState<number | null>(null);
  const [hasArrived, setHasArrived] = useState(false);

  // Guards against firing several overlapping OSRM requests while one is
  // already in the air -- GPS updates arrive far faster than a route comes
  // back, and the endpoint is a free public service.
  const routingRef = useRef(false);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  const requestRoute = useCallback(
    async (from: Point) => {
      if (routingRef.current) {
        return;
      }
      routingRef.current = true;
      try {
        const result = await fetchWalkingRoute(from, destination);
        if (result === null) {
          setErrorMessage('Could not find a walking route to this boarding house.');
        } else {
          setWalkingRoute(result);
          setErrorMessage('');
        }
      } catch {
        setErrorMessage('Could not reach the routing service. Check your connection.');
      } finally {
        routingRef.current = false;
      }
    },
    [destination.lat, destination.lng]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Location permission is needed to show the route.');
          setIsLoading(false);
          return;
        }

        if (!(await Location.hasServicesEnabledAsync())) {
          setErrorMessage('Location services are switched off on this phone.');
          setIsLoading(false);
          return;
        }

        // First fix: draw something immediately rather than waiting for the
        // watcher's first callback, which can take several seconds.
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) {
          return;
        }

        const start: Point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(start);
        await requestRoute(start);
        if (cancelled) {
          return;
        }
        setIsLoading(false);

        // Then follow the user.
        //
        // The subscription is created AFTER an await, so the screen may
        // already have been left by the time it exists. Without this check the
        // cleanup below has already run, nothing ever removes the watcher, and
        // a high-accuracy GPS stream keeps running (and re-routing) for the
        // rest of the session.
        if (cancelled) {
          return;
        }
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: DISTANCE_INTERVAL_M,
            timeInterval: 2000,
          },
          (update) => {
            const next: Point = {
              lat: update.coords.latitude,
              lng: update.coords.longitude,
            };
            setUserLocation(next);
            setIsTracking(true);

            const metresToGo = getDistanceInKm(next.lat, next.lng, destination.lat, destination.lng) * 1000;
            setRemainingMetres(metresToGo);

            if (metresToGo <= ARRIVED_METRES) {
              setHasArrived(true);
              return;
            }
            setHasArrived(false);

            // Re-route only when genuinely off the path, not on every step.
            setWalkingRoute((current) => {
              if (current && distanceToLineMetres(next, current.line) > OFF_ROUTE_METRES) {
                requestRoute(next);
              }
              return current;
            });
          }
        );

        // Cancelled while watchPositionAsync was resolving: the cleanup has
        // already run and will not run again, so stop this one here.
        if (cancelled) {
          subscription.remove();
          return;
        }
        watcherRef.current = subscription;
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'Something went wrong while loading the route.');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Leaving the screen must stop the GPS, or it keeps draining the
      // battery for the rest of the session.
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [requestRoute, destination.lat, destination.lng]);

  if (isLoading) {
    return (
      <Screen edges={false}>
        <View style={{ padding: t.spacing.md, gap: t.spacing.sm }}>
          <Skeleton height={52} radius={t.radius.md} />
          <Skeleton height={260} radius={t.radius.md} />
          <Skeleton height={18} width="60%" />
          <Skeleton height={18} width="80%" />
        </View>
        <Text variant="caption" tone="faint" center>
          Finding the best walking route…
        </Text>
      </Screen>
    );
  }

  if (errorMessage !== '' && !walkingRoute) {
    return (
      <Screen edges={false}>
        <ErrorState message={errorMessage} onRetry={() => userLocation && requestRoute(userLocation)} />
      </Screen>
    );
  }

  return (
    <Screen edges={false}>
      {/* The banner is the live readout: what is left, not what it was when
          the screen opened. */}
      <View style={[styles.banner, hasArrived && { backgroundColor: t.colors.success }]}>
        <Ionicons name={hasArrived ? 'flag' : 'walk'} size={18} color={t.colors.onBrand} />
        <Text variant="captionStrong" style={{ color: t.colors.onBrand, flex: 1 }}>
          {hasArrived
            ? `You have arrived at ${property.title}`
            : remainingMetres != null
              ? `${formatMeters(remainingMetres)} to go`
              : walkingRoute
                ? `${formatMeters(walkingRoute.totalDistanceMeters)} · about ${formatMinutes(
                    walkingRoute.totalDurationSeconds
                  )} walk`
                : property.title}
        </Text>

        {/* Says out loud whether the dot is actually following you. Without
            it there is no way to tell live tracking from a frozen fix. */}
        <View style={styles.livePill}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isTracking ? t.colors.onBrand : 'rgba(255,255,255,0.45)' },
            ]}
          />
          <Text variant="micro" style={{ color: t.colors.onBrand }}>
            {isTracking ? 'LIVE' : 'GPS…'}
          </Text>
        </View>
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
        <Text variant="captionStrong" style={{ marginBottom: t.spacing.sm }}>
          Directions to {property.title}
        </Text>
        <FlatList
          data={walkingRoute ? walkingRoute.steps : []}
          keyExtractor={(item, index) => String(index)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text variant="micro" style={{ color: t.colors.onBrand }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption">{item.instruction}</Text>
                {item.distanceMeters > 0 && (
                  <Text variant="micro" tone="faint">
                    {formatMeters(item.distanceMeters)}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="navigate-outline"
              title="No steps to show"
              message="The route was found but came back without turn-by-turn directions."
            />
          }
        />
      </View>
    </Screen>
  );
}

// Shortest distance, in metres, from a point to a polyline -- used to decide
// whether the user has genuinely left the route.
//
// It measures to the line's vertices rather than to the segments between them.
// OSRM returns points every few metres on a walking route, so the difference
// is far smaller than GPS error and not worth the extra maths.
function distanceToLineMetres(point: Point, line: [number, number][]): number {
  if (line.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let closest = Number.POSITIVE_INFINITY;
  for (const [lat, lng] of line) {
    const metres = getDistanceInKm(point.lat, point.lng, lat, lng) * 1000;
    if (metres < closest) {
      closest = metres;
    }
  }
  return closest;
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      backgroundColor: t.colors.brand,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xxs,
      backgroundColor: 'rgba(0,0,0,0.18)',
      paddingHorizontal: t.spacing.xs,
      paddingVertical: 3,
      borderRadius: t.radius.pill,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    mapWrapper: { flex: 1 },
    stepsWrapper: {
      maxHeight: 220,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.lg,
      borderTopRightRadius: t.radius.lg,
      padding: t.spacing.md,
      ...t.elevation.high,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.spacing.sm,
      marginBottom: t.spacing.sm,
    },
    stepNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
