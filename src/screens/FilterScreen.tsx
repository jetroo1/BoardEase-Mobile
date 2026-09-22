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

import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { loadAlertSettings, saveFilterAlerts, turnOffFilterAlerts } from '../utils/matchAlerts';
import { Filters } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterRouteProp = RouteProp<RootStackParamList, 'Filter'>;

// These are just example choices for this school project. A real app might
// load these from Firestore instead of hard-coding them.
const ROOM_TYPE_OPTIONS = ['Single', 'Shared', 'Studio'];
const AMENITY_OPTIONS = ['WiFi', 'CR', 'Parking', 'Aircon', 'Kitchen', 'Laundry'];

export default function FilterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FilterRouteProp>();
  const { currentFilters, onApply } = route.params;
  const { user } = useAuth();

  const [maxPriceText, setMaxPriceText] = useState(
    currentFilters.maxPrice !== null ? String(currentFilters.maxPrice) : ''
  );
  const [roomType, setRoomType] = useState<string | null>(currentFilters.roomType);
  const [amenities, setAmenities] = useState<string[]>(currentFilters.amenities);

  // Whether "Save these filters and alert me" is currently switched on for
  // this user. We load the real answer from Firestore when the screen opens.
  const [alertsOn, setAlertsOn] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      const settings = await loadAlertSettings(user.uid);
      setAlertsOn(settings.alertsEnabled);
    })();
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

  async function toggleAlerts() {
    if (!user) {
      return;
    }

    const turningOn = !alertsOn;
    setAlertsOn(turningOn); // update the switch straight away so it feels instant

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
      Alert.alert('Could not save', 'Please check your internet connection and try again.');
    }
  }

  async function handleApply() {
    const newFilters = buildFilters();

    // If alerts are switched on, keep the saved copy in step with whatever
    // the user is applying now.
    if (user && alertsOn) {
      try {
        await saveFilterAlerts(user.uid, newFilters);
      } catch {
        // Updating the saved copy is a bonus. Even if it fails, the filters
        // themselves should still be applied to the search results.
      }
    }

    onApply(newFilters);
    navigation.goBack();
  }

  function handleReset() {
    setMaxPriceText('');
    setRoomType(null);
    setAmenities([]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Ionicons name="options" size={20} color={colors.deep} />
        <Text style={styles.headerTitle}>Filter Results</Text>
      </View>

      <Text style={styles.sectionTitle}>Max Price</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 3500"
        keyboardType="numeric"
        value={maxPriceText}
        onChangeText={setMaxPriceText}
      />

      <Text style={styles.sectionTitle}>Room Type</Text>
      <View style={styles.chipRow}>
        {ROOM_TYPE_OPTIONS.map((option) => {
          const isSelected = roomType === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setRoomType(isSelected ? null : option)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITY_OPTIONS.map((option) => {
          const isSelected = amenities.includes(option);
          return (
            <Pressable
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleAmenity(option)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Match Alerts: saves the choices above to the user's own account so
          the app can check for new listings that fit them. */}
      <Pressable style={styles.alertRow} onPress={toggleAlerts}>
        <Ionicons
          name={alertsOn ? 'checkbox' : 'square-outline'}
          size={22}
          color={alertsOn ? colors.sky : colors.muted}
        />
        <View style={styles.alertTextWrap}>
          <Text style={styles.alertTitle}>Save these filters and alert me</Text>
          <Text style={styles.alertHelp}>
            We'll check for new boarding houses that match every time you open BoardEase, and show
            them on the Notifications tab.
          </Text>
        </View>
      </Pressable>

      <Pressable style={styles.applyButton} onPress={handleApply}>
        <Ionicons name="checkmark" size={18} color={colors.white} />
        <Text style={styles.applyButtonText}>Apply Filters</Text>
      </Pressable>

      <Pressable style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  content: { padding: spacing.lg - 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.ink },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginTop: spacing.lg - 4, marginBottom: spacing.sm + 2, color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipText: { color: colors.inkSoft },
  chipTextSelected: { color: colors.white, fontWeight: '600' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    backgroundColor: colors.paperMint,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    marginTop: spacing.lg,
  },
  alertTextWrap: { flex: 1 },
  alertTitle: { fontWeight: 'bold', color: colors.ink, fontSize: 14 },
  alertHelp: { color: colors.inkSoft, fontSize: 12, marginTop: 4, lineHeight: 17 },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  applyButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  resetButton: { alignItems: 'center', marginTop: spacing.md - 2 },
  resetButtonText: { color: colors.muted, fontWeight: '600' },
});
