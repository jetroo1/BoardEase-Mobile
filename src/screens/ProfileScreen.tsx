// Profile / Settings: the account screen and everything the user can actually
// change about how the app behaves.
//
// Ground rule for this screen: every row does something real. A settings page
// full of switches that are not wired to anything is worse than a short one,
// because the user changes something, nothing happens, and now they do not
// trust any of the others either.
//
// So there is no "notifications" master switch (the app has no push), no
// language picker (there is one language), and no currency selector (rent in
// Tagum is quoted in pesos). What is here is what exists.

import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, useThemeContext } from '../context/ThemeContext';
import { AppParamList } from '../navigation/types';
import { GUTTER, HIT_SLOP_MIN } from '../theme';
import { clearOfflineCache } from '../utils/offlineCache';
import { loadAlertSettings, turnOffFilterAlerts } from '../utils/matchAlerts';
import { useCompare } from '../context/CompareContext';
import {
  Button,
  Card,
  Pill,
  Pressable,
  Screen,
  ScreenHeader,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<AppParamList>;

export default function ProfileScreen() {
  const { user, role, logout } = useAuth();
  const { theme: t, mode, setMode } = useThemeContext();
  const { compareList, clearCompare } = useCompare();
  const navigation = useNavigation<NavigationProp>();

  const [busy, setBusy] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  // Re-read on every focus, because both of these can be changed outside the
  // app -- location in the phone's settings, alerts on the Filter screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      Location.getForegroundPermissionsAsync()
        .then((result) => {
          if (!cancelled) {
            setLocationGranted(result.status === 'granted');
          }
        })
        .catch(() => undefined);

      if (user) {
        loadAlertSettings(user.uid)
          .then((settings) => {
            if (!cancelled) {
              setAlertsOn(settings.alertsEnabled);
            }
          })
          .catch(() => undefined);
      }

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  // Turning alerts ON needs a set of filters to match against, and those are
  // chosen on the Filter screen -- so from here the switch can only turn them
  // off, and sends you to Search to turn them back on.
  async function handleAlertsChange(next: boolean) {
    if (!user) {
      return;
    }

    if (next) {
      navigation.navigate('Search');
      Alert.alert(
        'Choose your filters first',
        'Open Filter on the Search screen, set the price and amenities you want, then switch on "Alert me about new matches".'
      );
      return;
    }

    setAlertsOn(false);
    try {
      await turnOffFilterAlerts(user.uid);
    } catch {
      setAlertsOn(true);
      Alert.alert('Could not save', 'Check your internet connection and try again.');
    }
  }

  async function handlePasswordReset() {
    if (!user?.email || busy) {
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert(
        'Check your email',
        `We sent a password reset link to ${user.email}. It may take a minute to arrive.`
      );
    } catch {
      Alert.alert('Could not send', 'Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  // Names what it destroys, rather than asking "Are you sure?".
  function handleClearCache() {
    if (!user) {
      return;
    }
    Alert.alert(
      'Clear offline data?',
      'This removes your saved copies of favourites and recently viewed listings from this phone. Your account and your favourites in the cloud are not touched, but those sections will be blank until you are online again.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearOfflineCache(user.uid);
              Alert.alert('Cleared', 'Offline data has been removed from this phone.');
            } catch {
              Alert.alert('Could not clear', 'Please try again.');
            }
          },
        },
      ]
    );
  }

  function handleLogout() {
    Alert.alert(
      'Log out?',
      'You will need your email and password to get back in.',
      [
        { text: 'Stay logged in', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await logout();
            } catch {
              Alert.alert('Could not log out', 'Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <ScreenHeader title="Profile" large showThemeToggle />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        {/* --- Account ---------------------------------------------------- */}
        <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={24} color={t.colors.brand} />
            </View>
            <View style={{ flex: 1, gap: t.spacing.xxs }}>
              <Text variant="bodyStrong" numberOfLines={1} selectable>
                {user?.email ?? 'Not signed in'}
              </Text>
              <Pill
                label={role === 'admin' ? 'Administrator' : 'Tenant'}
                tone={role === 'admin' ? 'brand' : 'neutral'}
                icon={role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'}
              />
            </View>
          </View>

          <Row
            icon="key-outline"
            title="Change password"
            subtitle="Sends a reset link to your email"
            onPress={handlePasswordReset}
            disabled={busy || !user?.email}
          />
        </Card>

        {/* --- Appearance ------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Appearance</Text>
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: 'row',
              gap: t.spacing.xxs,
              padding: t.spacing.xxs,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.canvasAlt,
            }}
          >
            {(['system', 'light', 'dark'] as ThemeMode[]).map((value) => {
              const selected = mode === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${value} theme`}
                  onPress={() => setMode(value)}
                  style={{
                    flex: 1,
                    minHeight: HIT_SLOP_MIN,
                    paddingVertical: t.spacing.xs,
                    borderRadius: t.radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: t.spacing.xxs,
                    backgroundColor: selected ? t.colors.surface : 'transparent',
                    ...(selected ? t.elevation.low : null),
                  }}
                >
                  <Ionicons
                    name={
                      value === 'system'
                        ? 'phone-portrait-outline'
                        : value === 'light'
                          ? 'sunny-outline'
                          : 'moon-outline'
                    }
                    size={18}
                    color={selected ? t.colors.brand : t.colors.inkSoft}
                  />
                  <Text variant="captionStrong" tone={selected ? 'brand' : 'soft'}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* --- Alerts & permissions --------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Alerts &amp; permissions</Text>

          <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
              <RowIcon icon="notifications-outline" />
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="captionStrong">Match alerts</Text>
                <Text variant="caption" tone="faint">
                  {alertsOn
                    ? 'On — new listings matching your saved filters appear under Alerts'
                    : 'Off — turn on from the Filter screen'}
                </Text>
              </View>
              <Switch
                value={alertsOn}
                onValueChange={handleAlertsChange}
                disabled={!user}
                accessibilityLabel="Match alerts"
                trackColor={{ false: t.colors.lineStrong, true: t.colors.brand }}
                thumbColor={t.colors.surface}
              />
            </View>

            <Divider />

            <Row
              icon="location-outline"
              title="Location access"
              subtitle={
                locationGranted === null
                  ? 'Checking…'
                  : locationGranted
                    ? 'Granted — listings are sorted by distance'
                    : 'Denied — distances and the nearest sort are unavailable'
              }
              trailing={
                <Pill
                  label={locationGranted ? 'On' : 'Off'}
                  tone={locationGranted ? 'success' : 'warning'}
                />
              }
              onPress={() => Linking.openSettings()}
            />
          </Card>
        </View>

        {/* --- Data ------------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Data</Text>
          <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
            <Row
              icon="git-compare-outline"
              title="Clear comparison list"
              subtitle={
                compareList.length === 0
                  ? 'Nothing selected'
                  : `${compareList.length} listing${compareList.length === 1 ? '' : 's'} selected`
              }
              onPress={clearCompare}
              disabled={compareList.length === 0}
            />
            <Divider />
            <Row
              icon="trash-outline"
              title="Clear offline data"
              subtitle="Removes cached favourites and recently viewed from this phone"
              onPress={handleClearCache}
              danger
            />
          </Card>
        </View>

        {/* --- Admin ------------------------------------------------------ */}
        {role === 'admin' ? (
          <View style={{ gap: t.spacing.sm }}>
            <Text variant="heading">Administration</Text>
            <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
              <Row
                icon="shield-checkmark-outline"
                title="Admin panel"
                subtitle="Approve or reject submitted listings"
                onPress={() => navigation.navigate('Admin')}
              />
              <Divider />
              <Row
                icon="add-circle-outline"
                title="Add a listing"
                subtitle="Publish a new boarding house"
                onPress={() => navigation.navigate('AddListing')}
              />
            </Card>
          </View>
        ) : null}

        {/* --- About ------------------------------------------------------ */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">About</Text>
          <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.xs }}>
            <Text variant="captionStrong">BoardEase {version}</Text>
            <Text variant="caption" tone="soft">
              A guide for finding, comparing and navigating to boarding houses in Tagum
              City. CCE106/L · University of Mindanao Tagum.
            </Text>
            {/* Stated plainly so nobody expects to pay rent through the app. */}
            <Text variant="caption" tone="faint">
              BoardEase does not handle booking, payments or messaging. Arrange those
              directly with the owner.
            </Text>
          </Card>
        </View>

        <Button
          label="Log out"
          icon="log-out-outline"
          variant="secondary"
          fullWidth
          loading={busy}
          onPress={handleLogout}
        />
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function RowIcon({ icon }: { icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const { theme: t } = useThemeContext();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: t.radius.sm,
        backgroundColor: t.colors.canvasAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={17} color={t.colors.inkSoft} />
    </View>
  );
}

function Divider() {
  const { theme: t } = useThemeContext();
  return <View style={{ height: 1, backgroundColor: t.colors.line }} />;
}

// One settings row: icon, title, explanation, and either a trailing element or
// a chevron. The subtitle is not decoration -- it is where the row says what
// it will actually do, which is the difference between a settings screen you
// can use and one you have to experiment with.
function Row({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  disabled = false,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { theme: t } = useThemeContext();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        minHeight: HIT_SLOP_MIN,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <RowIcon icon={icon} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="captionStrong" tone={danger ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="faint">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={17} color={t.colors.inkFaint} />}
    </Pressable>
  );
}
