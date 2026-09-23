// Notifications screen: the "Match Alerts" part of the proposal's
// "Save to Favorites with Match Alerts" feature.
//
// Every time this screen opens we re-run the alert check in
// src/utils/matchAlerts.ts. That check looks for approved listings posted
// since the last time we looked which match the filters the user saved on
// the Filter screen, and stores each one so it shows up in the list below.
// Tapping an alert opens that listing.
//
// The header comes from RootNavigator (detailHeader('Alerts')), so this
// screen must not draw one of its own.

import React, { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
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
import { GUTTER } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  Card,
  EmptyState,
  Pressable,
  Screen,
  Skeleton,
  Text,
} from '../components/ui';

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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const settings = await loadAlertSettings(user.uid);
      setAlertsOn(settings.alertsEnabled);
      setSavedFilters(settings.savedFilters || EMPTY_FILTERS);
    } catch {
      // Not knowing whether alerts are on is not worth an error screen --
      // the stored list below is still worth showing.
      setAlertsOn(false);
    }

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

  // Destructive, so it says how many it is about to throw away.
  function confirmClearAll() {
    if (!user || notifications.length === 0) {
      return;
    }
    Alert.alert(
      'Clear all alerts?',
      `This removes all ${notifications.length} alert${notifications.length === 1 ? '' : 's'} from this phone. The listings themselves are not affected, and new matches will still appear.`,
      [
        { text: 'Keep them', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            await saveStoredNotifications(user.uid, []);
          },
        },
      ]
    );
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

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <Screen edges={false}>
      {/* Status strip: whether alerts are on, and the two things you can do
          about it. Sits here rather than in a header because the navigator
          owns this screen's header. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.xs,
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.sm,
        }}
      >
        <Ionicons
          name={alertsOn ? 'checkmark-circle' : 'alert-circle-outline'}
          size={15}
          color={alertsOn ? t.colors.success : t.colors.inkFaint}
        />
        <Text variant="caption" tone="soft" style={{ flex: 1 }}>
          {alertsOn ? 'Alerts are on for your saved filters' : 'Alerts are off'}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={alertsOn ? 'Edit alert filters' : 'Turn on alerts'}
          onPress={openFilterScreen}
          style={{ paddingVertical: t.spacing.xxs }}
        >
          <Text variant="captionStrong" tone="brand">
            {alertsOn ? 'Edit' : 'Turn on'}
          </Text>
        </Pressable>

        {notifications.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all alerts"
            onPress={confirmClearAll}
            style={{ paddingVertical: t.spacing.xxs }}
          >
            <Text variant="captionStrong" tone="danger">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.xs }}>
          <Skeleton height={76} radius={t.radius.lg} />
          <Skeleton height={76} radius={t.radius.lg} />
          <Skeleton height={76} radius={t.radius.lg} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.xs,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            unreadCount > 0 ? (
              <Text variant="caption" tone="faint" style={{ paddingBottom: t.spacing.xxs }}>
                {unreadCount} new
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="No alerts yet"
              message={
                alertsOn
                  ? 'New listings that match your saved filters will appear here when you next open BoardEase.'
                  : 'Save a set of filters on the Search screen and BoardEase will tell you when a new listing fits.'
              }
              actionLabel={alertsOn ? 'Edit filters' : 'Set up alerts'}
              onAction={openFilterScreen}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.message}`}
              onPress={() => handleOpenAlert(item)}
            >
              <Card
                level="low"
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.sm,
                  borderRadius: t.radius.lg,
                  // Unread is marked by a brand left edge as well as a tinted
                  // surface, so the state survives a quick glance and does not
                  // depend on telling two close shades apart.
                  borderLeftWidth: item.read ? 0 : 3,
                  borderLeftColor: t.colors.brand,
                  backgroundColor: item.read ? t.colors.surface : t.colors.brandSoft,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: t.radius.pill,
                    backgroundColor: item.read ? t.colors.canvasAlt : t.colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="home"
                    size={16}
                    color={item.read ? t.colors.inkSoft : t.colors.onBrand}
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="captionStrong" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="soft">
                    {item.message}
                  </Text>
                  <Text variant="micro" tone="faint">
                    {formatTimeAgo(item.createdAt)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={t.colors.inkFaint} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
