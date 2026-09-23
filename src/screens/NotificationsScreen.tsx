// Notifications screen: the "Match Alerts" part of the proposal's
// "Save to Favorites with Match Alerts" feature.
//
// Every time this screen opens we re-run the alert check in
// src/utils/matchAlerts.ts. That check looks for approved listings posted
// since the last time we looked which match the filters the user saved on
// the Filter screen, pops a phone notification for each one, and stores it
// so it shows up in the list below. Tapping an alert opens that listing.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import {
  loadAlertSettings,
  runAlertCheck,
  saveStoredNotifications,
} from '../utils/matchAlerts';
import { AppNotification, EMPTY_FILTERS, Filters } from '../types';
import { RootStackParamList } from '../navigation/types';
import { radius, spacing } from '../theme';
import { Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { Screen, ScreenHeader, EmptyState, IconButton } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Turns a timestamp into a short "2 hours ago" style line, so the list
// reads like a real notification feed instead of showing raw dates.
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

export default function NotificationsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alertsOn, setAlertsOn] = useState(false);
  // Kept so the "Set up alerts" button can open the Filter screen already
  // showing whatever the user saved last time.
  const [savedFilters, setSavedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);

    const settings = await loadAlertSettings(user.uid);
    setAlertsOn(settings.alertsEnabled);
    setSavedFilters(settings.savedFilters || EMPTY_FILTERS);

    // This both checks for new matches and gives us back the full list to
    // show. It never throws -- if the phone is offline it just returns the
    // alerts already saved on this device.
    const list = await runAlertCheck(user.uid);
    setNotifications(list);

    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  // Tapping an alert marks it read and opens the listing it is about.
  async function handleOpenAlert(notification: AppNotification) {
    if (!user) {
      return;
    }

    const updated = notifications.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    );
    setNotifications(updated);
    await saveStoredNotifications(user.uid, updated);

    navigation.navigate('Details', { propertyId: notification.propertyId });
  }

  async function clearAll() {
    if (!user) {
      return;
    }

    setNotifications([]);
    await saveStoredNotifications(user.uid, []);
  }

  function openFilterScreen() {
    navigation.navigate('Filter', {
      currentFilters: savedFilters,
      // This screen has no list of search results of its own, so there is
      // nothing for "Apply" to change here -- we send the user to the Filter
      // screen only for the "Save these filters and alert me" switch.
      onApply: () => {},
    });
  }

  return (
    <Screen edges={false}>
      {/* No ScreenHeader here: RootNavigator draws this screen's header via
          detailHeader('Alerts'). Rendering one here too gave two stacked
          headers and a doubled top safe-area inset. The clear-all action
          moved into the status row below. */}

      <View style={styles.statusRow}>
        <Ionicons
          name={alertsOn ? 'checkmark-circle' : 'alert-circle-outline'}
          size={14}
          color={alertsOn ? t.colors.success : t.colors.inkSoft}
        />
        <Text style={styles.statusText}>
          {alertsOn ? 'Alerts are on for your saved filters.' : 'Alerts are off.'}
        </Text>
        <Pressable onPress={openFilterScreen}>
          <Text style={styles.statusLink}>{alertsOn ? 'Edit filters' : 'Turn on'}</Text>
        </Pressable>

        {/* Lives here rather than in a header, because this screen's header
            comes from the navigator. Without it clearAll had no caller at
            all and the alerts list could not be emptied. */}
        {notifications.length > 0 ? (
          <Pressable onPress={clearAll} accessibilityLabel="Clear all alerts">
            <Text style={[styles.statusLink, { color: t.colors.danger }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.colors.brand} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon="notifications-off-outline" title="No alerts yet"
              message={alertsOn ? 'New matches will appear here when you next open BoardEase.' : 'No saved search alerts are active.'}
              actionLabel={alertsOn ? 'Edit filters' : 'Set up alerts'} onAction={openFilterScreen} />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => handleOpenAlert(item)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="home" size={16} color={t.colors.onBrand} />
              </View>

              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>
                <Text style={styles.cardTime}>{formatTimeAgo(item.createdAt)}</Text>
              </View>

              {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const createStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg - 4,
    paddingBottom: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: 'bold', color: t.colors.ink },
  clearLink: { color: t.colors.brand, fontWeight: '600' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: spacing.sm + 2,
  },
  statusText: { flex: 1, color: t.colors.inkSoft, fontSize: 12 },
  statusLink: { color: t.colors.brand, fontSize: 12, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyTitle: { fontWeight: 'bold', color: t.colors.ink, fontSize: 15 },
  emptyText: { color: t.colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: t.colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...t.elevation.low,
  },
  emptyButtonText: { color: t.colors.onBrand, fontWeight: 'bold' },
  list: { paddingHorizontal: spacing.lg - 4, paddingBottom: spacing.lg - 4, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: t.colors.surface,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    marginBottom: spacing.sm + 2,
    gap: spacing.sm + 2,
    ...t.elevation.low,
  },
  cardUnread: { backgroundColor: t.colors.brandSoft },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.brand,
    marginTop: 6,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontWeight: 'bold', marginBottom: 2, color: t.colors.ink },
  cardMessage: { color: t.colors.inkSoft, fontSize: 13, lineHeight: 18 },
  cardTime: { color: t.colors.inkSoft, fontSize: 11, marginTop: 4 },
});
