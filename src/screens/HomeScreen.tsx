// Home dashboard: the very first screen after logging in. What it shows
// depends on the user's role:
//   - A tenant sees a simple, search-focused welcome screen.
//   - An admin sees a quick preview of listings waiting for approval.
// (The full approve/reject tools live on the separate Admin screen --
// this is just a dashboard-style preview of the same information.)

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { runAlertCheck } from '../utils/matchAlerts';
import { loadRecentlyViewed } from '../utils/offlineCache';
import { Property } from '../types';
import { AppParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

// This screen needs to navigate both to other tabs (Search) and to a
// screen outside the tabs (Admin), so we type it with the combined
// AppParamList that lists every screen name in the app.
type NavigationProp = NativeStackNavigationProp<AppParamList>;

export default function HomeScreen() {
  const { user, role } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  // The listings this user opened most recently. They are read from the
  // phone (utils/offlineCache.ts), not from Firestore, so this section
  // still fills in with no connection.
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);

  // Run the saved-filter match check once, when the app opens on this
  // screen. Any brand-new listing that fits the user's saved filters turns
  // into a phone notification and lands on the Notifications tab -- see
  // src/utils/matchAlerts.ts. We don't need the result here, so we just let
  // it run; runAlertCheck handles its own errors and never throws.
  //
  // Note: this useEffect has to sit ABOVE the "if (role === 'admin')" line
  // below, because React requires every hook to run on every render.
  useEffect(() => {
    if (!user || role !== 'tenant') {
      return;
    }

    runAlertCheck(user.uid);
  }, [user, role]);

  // Refresh the list every time we come back to this tab, so a listing the
  // user just opened shows up here immediately. Like the effect above, this
  // hook has to sit before the admin early-return.
  useFocusEffect(
    useCallback(() => {
      if (!user || role !== 'tenant') {
        return;
      }

      loadRecentlyViewed(user.uid).then(setRecentlyViewed);
    }, [user, role])
  );

  if (role === 'admin') {
    return <AdminHome navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome back{user?.email ? `, ${user.email}` : ''}!</Text>
      <Text style={styles.subtitle}>Find a boarding house near you in a few taps.</Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search" size={18} color={colors.white} />
        <Text style={styles.primaryButtonText}>Find Nearby Boarding Houses</Text>
      </Pressable>

      <View style={styles.quickLinks}>
        <Pressable style={styles.quickLink} onPress={() => navigation.navigate('Favorites')}>
          <Ionicons name="heart" size={18} color={colors.sky} />
          <Text style={styles.quickLinkText}>My Favorites</Text>
        </Pressable>
        <Pressable style={styles.quickLink} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications" size={18} color={colors.sky} />
          <Text style={styles.quickLinkText}>Notifications</Text>
        </Pressable>
      </View>

      {recentlyViewed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recently Viewed</Text>
          <FlatList
            data={recentlyViewed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.previewCard}
                onPress={() => navigation.navigate('Details', { propertyId: item.id })}
              >
                <Text style={styles.previewCardTitle}>{item.title}</Text>
                <Text style={styles.previewCardAddress}>
                  ₱{item.price} / month · {item.address}
                </Text>
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
}

// Shown instead of the tenant view when the logged-in user is an admin.
function AdminHome({ navigation }: { navigation: NavigationProp }) {
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setIsLoading(true);
        const pendingQuery = query(collection(db, 'properties'), where('isApproved', '==', false));
        const snapshot = await getDocs(pendingQuery);
        setPendingProperties(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Property, 'id'>),
          }))
        );
        setIsLoading(false);
      })();
    }, [])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>
        {pendingProperties.length} listing{pendingProperties.length === 1 ? '' : 's'} waiting for
        approval.
      </Text>

      <FlatList
        data={pendingProperties.slice(0, 5)}
        keyExtractor={(item) => item.id}
        style={styles.previewList}
        renderItem={({ item }) => (
          <View style={styles.previewCard}>
            <Text style={styles.previewCardTitle}>{item.title}</Text>
            <Text style={styles.previewCardAddress}>{item.address}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.subtitle}>Nothing to review right now.</Text>
        }
      />

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Admin')}>
        <Ionicons name="shield-checkmark" size={18} color={colors.white} />
        <Text style={styles.primaryButtonText}>Open Admin Panel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist, padding: spacing.lg - 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcome: { fontSize: 22, fontWeight: 'bold', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md - 4,
    ...shadow.card,
  },
  primaryButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  quickLinks: { flexDirection: 'row', gap: spacing.sm + 4, marginTop: spacing.md },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    ...shadow.card,
  },
  quickLinkText: { color: colors.inkSoft, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  previewList: { maxHeight: 260 },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  previewCardTitle: { fontWeight: 'bold', color: colors.ink },
  previewCardAddress: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
