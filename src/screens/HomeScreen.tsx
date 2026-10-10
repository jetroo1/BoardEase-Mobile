// Home dashboard: the very first screen after logging in. What it shows
// depends on the user's role:
//   - A tenant sees a simple, search-focused welcome screen.
//   - An admin sees a quick preview of listings waiting for approval.
// (The full approve/reject tools live on the separate Admin screen --
// this is just a dashboard-style preview of the same information.)

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { runAlertCheck } from '../utils/matchAlerts';
import { loadRecentlyViewed } from '../utils/offlineCache';
import { Property } from '../types';
import { AppParamList } from '../navigation/types';
import { coverOf } from '../utils/photos';
import { useScreenTour } from '../context/TourContext';
import { ADMIN_HOME_TOUR, HOME_TOUR, TOUR } from '../tourSteps';
import { GUTTER } from '../theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pressable,
  PropertyPhoto,
  Screen,
  ScreenHeader,
  ListingSearchBar,
  SectionHeader,
  TourTarget,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

// This screen needs to navigate both to other tabs (Search) and to a
// screen outside the tabs (Admin), so we type it with the combined
// AppParamList that lists every screen name in the app.
type NavigationProp = NativeStackNavigationProp<AppParamList>;

// "j.martin.147292.tc@umindanao.edu.ph" is not a greeting. Take the part
// before the @, drop the dots and numbers, and capitalise it.
function friendlyName(email: string | null | undefined): string {
  if (!email) {
    return 'there';
  }
  const localPart = email.split('@')[0] ?? '';
  const firstWord = localPart.split(/[._-]/)[0] ?? '';
  if (!firstWord) {
    return 'there';
  }
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

export default function HomeScreen() {
  const { user, role } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();

  // The listings this user opened most recently. They are read from the
  // phone (utils/offlineCache.ts), not from Firestore, so this section
  // still fills in with no connection.
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);

  // Every approved listing, held here so the search box can answer as the
  // person types instead of asking Firestore on each keystroke. There are a
  // few dozen boarding houses in a city, not a few million -- loading them
  // once is cheaper than a query per letter, and it means suggestions appear
  // instantly rather than after a round trip.
  const [allListings, setAllListings] = useState<Property[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // Run the saved-filter match check once, when the app opens on this
  // screen. Any brand-new listing that fits the user's saved filters lands
  // on the Notifications tab -- see src/utils/matchAlerts.ts. We don't need
  // the result here, so we just let it run; runAlertCheck handles its own
  // errors and never throws.
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
  // Read before anything is decided about what to show.
  //
  // recentlyViewed starts empty, which is indistinguishable from "this person
  // has not opened anything yet" -- so the screen rendered "Nothing viewed
  // yet" the instant it appeared and only corrected itself once the read came
  // back. Storage is fast, but the read is queued behind whatever else the
  // JavaScript thread is doing, and on this screen that is a Firestore query;
  // on a slow connection the wrong answer was on display for seconds, which is
  // exactly long enough to be reported as a bug.
  //
  // The flag separates "nothing to show" from "do not know yet".
  const [recentLoaded, setRecentLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user || role !== 'tenant') {
        return;
      }

      let cancelled = false;
      loadRecentlyViewed(user.uid)
        .then((items) => {
          if (cancelled) return;
          setRecentlyViewed(items);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setRecentLoaded(true);
        });

      return () => {
        cancelled = true;
      };
    }, [user, role])
  );

  // Reloaded on focus too, so a listing an admin just added is searchable
  // here without restarting the app.
  useFocusEffect(
    useCallback(() => {
      if (!user || role !== 'tenant') {
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const snapshot = await getDocs(
            query(collection(db, 'properties'), where('isApproved', '==', true))
          );
          if (cancelled) return;
          setAllListings(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Property, 'id'>),
            }))
          );
        } catch {
          // The search box simply finds nothing; the rest of the screen, which
          // reads from the phone, still works offline. An error banner here
          // would be shouting about a feature the person has not used yet.
        } finally {
          // Cleared whether or not this run was superseded.
          //
          // It used to be guarded by the cancelled flag, like the write above
          // it, and that is the difference between discarding a stale result
          // and refusing to admit the request ever ended. Leaving the screen
          // while the query was in flight left the search box reading
          // "Loading boarding houses..." for the rest of the session -- the
          // next focus started a fresh request, but nothing ever turned the
          // first one off.
          setIsLoadingListings(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user, role])
  );

  // Offered to tenants only, and only once per account. The admin dashboard
  // has its own, further down -- it is a different screen explaining different
  // controls, so one tour could not have covered both.
  //
  // Like every other hook here, this has to sit above the admin early-return.
  useScreenTour(role === 'tenant' ? TOUR.home : '', role === 'tenant' ? HOME_TOUR : []);

  if (role === 'admin') {
    return <AdminHome navigation={navigation} />;
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Good to see you, ${friendlyName(user?.email)}`}
        title="Find your next room"
        large
        showThemeToggle
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: t.spacing.xl }}
      >
        <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.sm }}>
          {/* A real search field, not a button dressed as one. The previous
              version navigated to Search and made you type there, so the
              first result was two taps and a screen change away. */}
          <TourTarget id="home.search">
            <ListingSearchBar
              listings={allListings}
              placeholder={
                isLoadingListings ? 'Loading boarding houses…' : 'Search boarding houses'
              }
              onSelect={(property) => navigation.navigate('Details', { propertyId: property.id })}
              onSubmit={() => navigation.navigate('Search')}
            />
          </TourTarget>

          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            {/* Each wrapper carries the flex the QuickLink inside it had, or
                the three cards stop sharing the row evenly. */}
            <TourTarget id="home.map" style={{ flex: 1 }}>
              <QuickLink
                icon="map-outline"
                label="Map"
                hint="See them all"
                onPress={() => navigation.navigate('Map')}
              />
            </TourTarget>
            <TourTarget id="home.saved" style={{ flex: 1 }}>
              <QuickLink
                icon="heart-outline"
                label="Saved"
                hint="Your shortlist"
                onPress={() => navigation.navigate('Favorites')}
              />
            </TourTarget>
            <TourTarget id="home.alerts" style={{ flex: 1 }}>
              <QuickLink
                icon="notifications-outline"
                label="Alerts"
                hint="New matches"
                onPress={() => navigation.navigate('Notifications')}
              />
            </TourTarget>
          </View>
        </View>

        {/* --- Nearby ---------------------------------------------------- */}
        {/* The screen used to be a search box and nothing else until you had
            viewed something, so a new account saw an empty page and had to
            guess what the app was for. Showing the cheapest few listings
            gives it something to be on first open. */}
        {allListings.length > 0 ? (
          <View style={{ marginTop: t.spacing.xl }}>
            <View style={{ paddingHorizontal: GUTTER }}>
              <SectionHeader
                title="Most affordable"
                icon="pricetag-outline"
                actionLabel="See all"
                onAction={() => navigation.navigate('Search')}
              />
            </View>
            <FlatList
              horizontal
              data={[...allListings].sort((a, b) => a.price - b.price).slice(0, 6)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: GUTTER,
                paddingTop: t.spacing.sm,
                gap: t.spacing.sm,
              }}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  onPress={() => navigation.navigate('Details', { propertyId: item.id })}
                  style={{ width: 180 }}
                >
                  <Card level="low" padded={false} style={{ overflow: 'hidden' }}>
                    <PropertyPhoto
                      uri={coverOf(item)}
                      title={item.title}
                      roomType={item.roomType}
                      height={110}
                    />
                    <View style={{ padding: t.spacing.sm, gap: 2 }}>
                      <Text variant="captionStrong" numberOfLines={1}>{item.title}</Text>
                      <Text variant="micro" tone="faint" numberOfLines={1}>{item.address}</Text>
                      <Text variant="captionStrong" tone="brand">{formatPeso(item.price)}</Text>
                    </View>
                  </Card>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {recentlyViewed.length > 0 ? (
          <View style={{ marginTop: t.spacing.xl }}>
            <View style={{ paddingHorizontal: GUTTER }}>
              <SectionHeader title="Recently viewed" icon="time-outline" />
            </View>

            {/* Horizontal, so a short list does not leave a tall gap and a
                long one does not push everything else off the screen. */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentlyViewed}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: GUTTER, gap: t.spacing.sm }}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${formatPeso(item.price)} per month`}
                  onPress={() => navigation.navigate('Details', { propertyId: item.id })}
                  style={{ width: 190 }}
                >
                  <Card level="low" padded={false} style={{ overflow: 'hidden' }}>
                    <PropertyPhoto
                      uri={coverOf(item)}
                      title={item.title}
                      roomType={item.roomType}
                      height={104}
                    />
                    <View style={{ padding: t.spacing.sm, gap: 2 }}>
                      <Text variant="captionStrong" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text variant="caption" tone="faint" numberOfLines={1}>
                        {item.address}
                      </Text>
                      <Text variant="bodyStrong" tone="brand">
                        {formatPeso(item.price)}
                        <Text variant="caption" tone="faint">
                          {' '}
                          /mo
                        </Text>
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              )}
            />
          </View>
        ) : recentLoaded ? (
          // The "nothing yet" empty state, which is where a new user gets
          // told what this screen is for. Shown only once the phone has
          // actually been asked -- see recentLoaded above.
          <View style={{ paddingHorizontal: GUTTER, marginTop: t.spacing.lg }}>
            <Card level="flat" outlined style={{ alignItems: 'center', gap: t.spacing.xxs }}>
              <Ionicons name="compass-outline" size={24} color={t.colors.inkFaint} />
              <Text variant="captionStrong" center>
                Nothing viewed yet
              </Text>
              <Text variant="caption" tone="faint" center>
                Recently viewed boarding houses
              </Text>
            </Card>
          </View>
        ) : (
          <View style={{ paddingHorizontal: GUTTER, marginTop: t.spacing.lg }}>
            <Skeleton height={92} radius={t.radius.md} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function QuickLink({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    // flex: 1 twice, deliberately. The outer one claims an equal share of the
    // row; the inner one makes the card fill that share top to bottom.
    //
    // Without the inner one the three cards are as tall as their own text, and
    // "See them all" fits on one line where "Your shortlist" and "New matches"
    // wrap onto two -- so one card ended up shorter than its neighbours and the
    // row looked misaligned. It also made the tour's highlight look wrong: the
    // ring is drawn around the full share, so around a short card it enclosed a
    // band of empty space above it.
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Card level="low" style={{ flex: 1, gap: t.spacing.xxs }}>
        <Ionicons name={icon} size={19} color={t.colors.brand} />
        <Text variant="captionStrong">{label}</Text>
        <Text variant="micro" tone="faint">
          {hint}
        </Text>
      </Card>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
//
// Shown instead of the tenant view when the logged-in user is an admin.
// A dashboard leads with the number that answers "is anything waiting for me?"
// -- and that number needs a denominator to mean anything, so it is shown as
// "3 of 12 listings", not a bare 3.

function AdminHome({ navigation }: { navigation: NavigationProp }) {
  const t = useTheme();
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  // Every listing, approved or not. The dashboard already reads them to count
  // them, so searching them costs nothing extra -- and an admin looking for
  // one particular house needs to find the unapproved ones too, which is
  // exactly what the tenant-side search must never show.
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const pendingQuery = query(collection(db, 'properties'), where('isApproved', '==', false));
      const [pendingSnapshot, allSnapshot] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(collection(db, 'properties')),
      ]);

      setPendingProperties(
        pendingSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Property, 'id'>),
        }))
      );
      setAllProperties(
        allSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Property, 'id'>),
        }))
      );
    } catch {
      // The old version had no error branch here at all, so a failed read
      // left the spinner up forever and looked like a hang.
      setErrorMessage('Could not load listings. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useScreenTour(TOUR.adminHome, ADMIN_HOME_TOUR);
  return (
    <Screen>
      <ScreenHeader eyebrow="Administrator" title="Dashboard" large showThemeToggle />

      {isLoading ? (
        <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.md }}>
          <Skeleton height={48} radius={t.radius.pill} />
          <Skeleton height={96} radius={t.radius.md} />
          <Skeleton height={64} radius={t.radius.md} />
          <Skeleton height={64} radius={t.radius.md} />
        </View>
      ) : errorMessage ? (
        <View style={{ paddingHorizontal: GUTTER }}>
          <ErrorState message={errorMessage} onRetry={load} />
        </View>
      ) : (
        // One scrolling list for the whole dashboard, rather than a column
        // with a list in the middle of it.
        //
        // The column version put a FlatList between a card and a button inside
        // a flex: 1 box. A list with no height of its own takes whatever is
        // left over, so the gaps above and below it changed with the number of
        // listings in the queue -- five pending looked nothing like none, and
        // neither looked deliberate. Spacing came from four places as well
        // (marginBottom here, gap there, the section header's own margin, the
        // list's padding), so nothing lined up with anything else.
        //
        // As a list with a header and a footer there is one scroll container,
        // one gap between every pair of rows, and the rhythm no longer depends
        // on what the data happens to be.
        <FlatList
          data={pendingProperties.slice(0, 5)}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.xs,
          }}
          ListHeaderComponent={
            <View style={{ gap: t.spacing.md, marginBottom: t.spacing.xs }}>
              {/* The same live search the tenants get. An admin checking
                  whether a house is already listed was otherwise left
                  scrolling the admin panel, which is the long way round to a
                  yes or no. */}
              <TourTarget id="adminHome.search">
                <ListingSearchBar
                  listings={allProperties}
                  placeholder="Search every listing"
                  onSelect={(property) =>
                    navigation.navigate('Details', { propertyId: property.id })
                  }
                  onSubmit={() => navigation.navigate('Admin')}
                />
              </TourTarget>

              <TourTarget id="adminHome.pending">
                <Card
                  level="medium"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}
                >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="micro" tone="faint" uppercase>
                    Waiting for approval
                  </Text>
                  <Text
                    variant="display"
                    tone={pendingProperties.length > 0 ? 'warning' : 'success'}
                  >
                    {pendingProperties.length}
                  </Text>
                  <Text variant="caption" tone="soft">
                    of {allProperties.length} listing
                    {allProperties.length === 1 ? '' : 's'} in total
                  </Text>
                </View>
                <Ionicons
                  name={
                    pendingProperties.length > 0
                      ? 'hourglass-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={40}
                  color={pendingProperties.length > 0 ? t.colors.warning : t.colors.success}
                />
                </Card>
              </TourTarget>

              <SectionHeader title="Next in the queue" icon="list-outline" />
            </View>
          }
          renderItem={({ item }) => (
            <Card
              level="low"
              style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
            >
              <PropertyPhoto
                uri={coverOf(item)}
                title={item.title}
                roomType={item.roomType}
                height={44}
                radius={t.radius.sm}
                style={{ width: 44 }}
              />
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="captionStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" tone="faint" numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <Text variant="captionStrong" tone="brand">
                {formatPeso(item.price)}
              </Text>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title="Queue is clear"
              message="Every listing has been reviewed. New submissions will appear here."
            />
          }
          ListFooterComponent={
            <TourTarget id="adminHome.panel" style={{ marginTop: t.spacing.md }}>
              <Button
                label="Open admin panel"
                icon="shield-checkmark"
                size="lg"
                fullWidth
                onPress={() => navigation.navigate('Admin')}
              />
            </TourTarget>
          }
        />
      )}
    </Screen>
  );
}
