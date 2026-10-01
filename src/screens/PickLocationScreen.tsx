// Drop a pin where the boarding house actually is.
//
// Typing latitude and longitude is the only way to place a listing you are not
// standing in front of, and it is a terrible one: the numbers mean nothing to
// look at, a digit in the wrong place puts the house in the sea, and you find
// out only when the route guide walks somebody the wrong way. Here you look at
// the map, see the street, and tap the roof.
//
// "Use my current location" on the form stays, and is still the better option
// when you are standing at the gate. This is for the rest of the time.
//
// The chosen point is handed back through a callback in the route params, the
// same way the Filter screen returns its filters. The alternative -- writing it
// into a shared store for the form to read -- would leave a value lying around
// after the screen closes, and the form would have to work out whether it was
// meant for this listing or the last one.

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeafletMap from '../components/LeafletMap';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { requestLocation, describeLocationOutcome } from '../utils/locationAccess';
import { clearCallback, getCallback } from '../utils/navigationCallbacks';
import { Button, Screen, ScreenHeader, Text } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PickLocationRouteProp = RouteProp<RootStackParamList, 'PickLocation'>;

type Point = { lat: number; lng: number };

export default function PickLocationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PickLocationRouteProp>();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const initial = route.params?.initial;

  const [point, setPoint] = useState<Point | null>(initial ?? null);
  const [notice, setNotice] = useState('');

  // With nothing chosen yet, centre on the user so the first thing on screen
  // is the street they are on rather than the middle of Tagum. Silent if it
  // is refused: the map still works, it just opens somewhere less useful, and
  // this screen is not the place to argue about permissions.
  useEffect(() => {
    if (initial) {
      return;
    }
    let cancelled = false;
    (async () => {
      const outcome = await requestLocation('pin');
      if (cancelled) {
        return;
      }
      if (outcome.ok) {
        setPoint(outcome.coords);
        setNotice('Starting from where you are. Tap the map to move the pin.');
      } else {
        setNotice(describeLocationOutcome(outcome.reason));
      }
    })();
    return () => { cancelled = true; };
  }, [initial]);

  function confirm() {
    if (!point) {
      return;
    }
    getCallback<Point>('pickLocation')?.(point);
    clearCallback('pickLocation');
    navigation.goBack();
  }

  return (
    <Screen edges={false}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        title="Drop the pin"
        subtitle="Tap where the boarding house is"
      />

      <View style={{ flex: 1 }}>
        <LeafletMap
          markers={
            point
              ? [{ id: 'picked', lat: point.lat, lng: point.lng, title: 'Boarding house' }]
              : []
          }
          selectedId={point ? 'picked' : null}
          onMapPress={(next) => {
            setPoint(next);
            setNotice('');
          }}
          bottomInset={140}
        />

        {/* Crosshair-free on purpose: the pin goes where you tapped, not where
            the map happens to be centred. A centre crosshair would promise
            drag-to-position, which this does not do. */}
        {!point ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: t.spacing.md,
              left: GUTTER,
              right: GUTTER,
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.line,
              padding: t.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.xs,
              ...t.elevation.low,
            }}
          >
            <Ionicons name="hand-left-outline" size={18} color={t.colors.brand} />
            <Text variant="caption" tone="soft" style={{ flex: 1 }}>
              {notice || 'Tap anywhere on the map to place the pin.'}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          paddingHorizontal: GUTTER,
          paddingTop: t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.md,
          gap: t.spacing.sm,
          backgroundColor: t.colors.surface,
          borderTopLeftRadius: t.radius.lg,
          borderTopRightRadius: t.radius.lg,
          ...t.elevation.high,
        }}
      >
        {/* The numbers are shown, not hidden. Somebody checking a listing
            against a map on a laptop needs to be able to read them off. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
          <Ionicons
            name={point ? 'location' : 'location-outline'}
            size={18}
            color={point ? t.colors.brand : t.colors.inkFaint}
          />
          <Text variant="caption" tone={point ? 'default' : 'faint'} style={{ flex: 1 }}>
            {point
              ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`
              : 'No pin yet'}
          </Text>
        </View>

        <Button
          label="Use this spot"
          icon="checkmark"
          fullWidth
          disabled={!point}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}
