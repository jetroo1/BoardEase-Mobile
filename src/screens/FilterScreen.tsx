// Filter screen: lets the user narrow down the search results by max
// price, room type, and amenities. The filtering itself doesn't touch
// Firestore -- we just collect the user's choices and hand them back to the
// Search screen through the "onApply" function that was passed in via
// route.params (see navigation.navigate('Filter', { onApply: ... }) in
// SearchScreen).
//
// The one thing here that DOES touch Firestore is the "Save these filters
// and alert me" switch at the bottom. That copies the current choices onto
// the user's own users/{uid} document so the app can check for matching new
// listings later (see src/utils/matchAlerts.ts).
//
// Opens as a sheet, because a filter is a decision you make and dismiss
// rather than a place you travel to.

import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loadAlertSettings, saveFilterAlerts, turnOffFilterAlerts } from '../utils/matchAlerts';
import { Filters } from '../types';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import {
  Button,
  Card,
  IconButton,
  Input,
  Pressable,
  Screen,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterRouteProp = RouteProp<RootStackParamList, 'Filter'>;

// These are just example choices for this school project. A real app might
// load these from Firestore instead of hard-coding them.
const ROOM_TYPE_OPTIONS = ['Single', 'Shared', 'Studio'];
const AMENITY_OPTIONS = ['WiFi', 'CR', 'Parking', 'Aircon', 'Kitchen', 'Laundry'];

// Budgets students actually ask for, so the common case is one tap instead of
// typing. Every preset is a field they do not have to fill in.
const PRICE_PRESETS = [1500, 2500, 3500, 5000];

export default function FilterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FilterRouteProp>();
  const { currentFilters, onApply } = route.params;
  const { user } = useAuth();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [maxPriceText, setMaxPriceText] = useState(
    currentFilters.maxPrice !== null ? String(currentFilters.maxPrice) : ''
  );
  const [roomType, setRoomType] = useState<string | null>(currentFilters.roomType);
  const [amenities, setAmenities] = useState<string[]>(currentFilters.amenities);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Whether "Save these filters and alert me" is currently switched on for
  // this user. We load the real answer from Firestore when the screen opens.
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    (async () => {
      const settings = await loadAlertSettings(user.uid);
      if (!cancelled) {
        setAlertsOn(settings.alertsEnabled);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleAmenity(amenity: string) {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((item) => item !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  }

  // Turns whatever is on screen right now into a Filters object. Both
  // "Apply Filters" and the alerts switch need it, so it lives in one place.
  function buildFilters(): Filters {
    return {
      maxPrice: maxPriceText.trim() === '' ? null : Number(maxPriceText),
      roomType,
      amenities,
    };
  }

  // The old screen accepted anything typed into the price box, so "abc"
  // became NaN and quietly filtered every listing out.
  function checkPrice(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return 'Enter a number, like 3000.';
    }
    if (parsed <= 0) {
      return 'Enter an amount greater than zero.';
    }
    return null;
  }

  async function toggleAlerts() {
    if (!user || saving) {
      return;
    }
    const error = checkPrice(maxPriceText);
    setPriceError(error);
    if (!alertsOn && error) return;
    setSaving(true);

    const turningOn = !alertsOn;
    setAlertsOn(turningOn); // update the switch straight away so it feels instant
    setAlertError(null);

    try {
      if (turningOn) {
        await saveFilterAlerts(user.uid, buildFilters());
      } else {
        await turnOffFilterAlerts(user.uid);
      }
    } catch {
      // The save failed (usually no internet), so put the switch back to
      // where it was and tell the user instead of pretending it worked.
      setAlertsOn(!turningOn);
      setAlertError('Could not save. Check your internet connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    if (saving) return;
    const error = checkPrice(maxPriceText);
    setPriceError(error);
    if (error) {
      return;
    }

    const newFilters = buildFilters();

    // If alerts are switched on, keep the saved copy in step with whatever
    // the user is applying now.
    if (user && alertsOn) {
      setSaving(true);
      try {
        await saveFilterAlerts(user.uid, newFilters);
      } catch {
        // Updating the saved copy is a bonus. Filtering the list in front of
        // the user must still happen -- returning here meant that with alerts
        // switched on and no internet, Apply did nothing at all and the user
        // could not filter the results they were already looking at.
        setAlertError('Filters applied, but the alert copy could not be saved.');
      } finally {
        setSaving(false);
      }
    }

    onApply(newFilters);
    navigation.goBack();
  }

  function handleReset() {
    setMaxPriceText('');
    setRoomType(null);
    setAmenities([]);
    setPriceError(null);
  }

  const activeCount =
    (maxPriceText.trim() !== '' ? 1 : 0) + (roomType !== null ? 1 : 0) + amenities.length;

  return (
    <Screen>
      {/* A sheet gets a close button, not a back arrow -- the difference tells
          the user whether they are leaving a page or dismissing a decision. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.xs,
          paddingHorizontal: GUTTER,
          paddingTop: t.spacing.xs,
          paddingBottom: t.spacing.sm,
        }}
      >
        <IconButton icon="close" label="Close filters" onPress={() => navigation.goBack()} />
        <Text variant="heading" style={{ flex: 1 }}>
          Filters
        </Text>
        {activeCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
            onPress={handleReset}
            style={{ padding: t.spacing.xs }}
          >
            <Text variant="captionStrong" tone="brand">
              Reset
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        <View style={{ gap: t.spacing.xs }}>
          <Text variant="heading">Budget</Text>
          <Input
            label="Maximum monthly rent"
            icon="cash-outline"
            placeholder="Any price"
            keyboardType="number-pad"
            value={maxPriceText}
            onChangeText={setMaxPriceText}
            onBlur={() => setPriceError(checkPrice(maxPriceText))}
            error={priceError}
            optional
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
            {PRICE_PRESETS.map((preset) => {
              const selected = maxPriceText === String(preset);
              return (
                <Choice
                  key={preset}
                  label={`Under ₱${preset.toLocaleString('en-PH')}`}
                  selected={selected}
                  onPress={() => {
                    setMaxPriceText(selected ? '' : String(preset));
                    setPriceError(null);
                  }}
                />
              );
            })}
          </View>
        </View>

        <View style={{ gap: t.spacing.xs }}>
          <Text variant="heading">Room type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
            {ROOM_TYPE_OPTIONS.map((option) => (
              <Choice
                key={option}
                label={option}
                selected={roomType === option}
                // Tapping the selected one clears it, so there is always a way
                // back to "any" without hunting for a Reset button.
                onPress={() => setRoomType(roomType === option ? null : option)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: t.spacing.xs }}>
          <Text variant="heading">Amenities</Text>
          <Text variant="caption" tone="faint">
            Listings must have all of the ones you pick.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
            {AMENITY_OPTIONS.map((option) => (
              <Choice
                key={option}
                label={option}
                selected={amenities.includes(option)}
                onPress={() => toggleAmenity(option)}
              />
            ))}
          </View>
        </View>

        <Card level="low" style={{ gap: t.spacing.xs, borderRadius: t.radius.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: t.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.brandSoft,
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={t.colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="captionStrong">Alert me about new matches</Text>
              <Text variant="caption" tone="faint">
                Saves these filters and tells you when a new listing fits.
              </Text>
            </View>
            <Switch
              value={alertsOn}
              onValueChange={toggleAlerts}
              disabled={!user || saving}
              accessibilityLabel="Alert me about new matches"
              trackColor={{ false: t.colors.lineStrong, true: t.colors.brand }}
              thumbColor={t.colors.surface}
            />
          </View>

          {alertError ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}>
              <Ionicons name="alert-circle" size={13} color={t.colors.danger} />
              <Text variant="caption" tone="danger" style={{ flex: 1 }}>
                {alertError}
              </Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* The action bar is pinned, so Apply is reachable without scrolling
          back down through every section. */}
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing.sm,
          paddingHorizontal: GUTTER,
          paddingTop: t.spacing.sm,
          paddingBottom: Math.max(insets.bottom, t.spacing.md),
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.line,
        }}
      >
        <Button
          label="Reset"
          variant="secondary"
          size="lg"
          onPress={handleReset}
          disabled={activeCount === 0 || saving}
        />
        <Button
          label={activeCount > 0 ? `Apply ${activeCount} filter${activeCount === 1 ? '' : 's'}` : 'Show all listings'}
          size="lg"
          onPress={handleApply}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}

// A selectable chip. Selection is shown by fill AND a check mark, not colour
// alone -- a colour-only state disappears for anyone who cannot distinguish
// the two shades.
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xxs,
        paddingHorizontal: t.spacing.sm,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        backgroundColor: selected ? t.colors.brand : t.colors.surface,
        borderWidth: 1,
        borderColor: selected ? t.colors.brand : t.colors.lineStrong,
      }}
    >
      {selected ? <Ionicons name="checkmark" size={13} color={t.colors.onBrand} /> : null}
      <Text variant="captionStrong" style={{ color: selected ? t.colors.onBrand : t.colors.inkSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}
