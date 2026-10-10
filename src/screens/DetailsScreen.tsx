// Boarding House Details screen: shows everything about one property --
// its info, amenities, a few recent reviews, and buttons to favorite it,
// add it to the comparison list, or get directions to it.
//
// The photo runs full-bleed to the top of the display with the controls
// floating on it, so the picture is the first thing seen rather than being
// boxed under a header bar. Everything below it sits on a sheet that overlaps
// the photo's lower edge -- that overlap is what makes the page read as one
// object instead of two stacked rectangles.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import CompareBar from '../components/CompareBar';
import { useTheme } from '../context/ThemeContext';
import { Property, Review } from '../types';
import { RootStackParamList } from '../navigation/types';
import { recordRecentlyViewed } from '../utils/offlineCache';
import { addFavorite, removeFavorite } from '../utils/favorites';
import { describeFirestoreError } from '../utils/firestoreErrors';
import * as Location from 'expo-location';
import { getDistanceInKm, formatDistance } from '../utils/distance';
import { photosOf } from '../utils/photos';
import { displayName } from '../utils/displayName';
import { GUTTER, spacing } from '../theme';
import { useScreenTour } from '../context/TourContext';
import { DETAILS_TOUR, TOUR } from '../tourSteps';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  PageWash,
  Pill,
  Pressable,
  PhotoGallery,
  TourTarget,
  Rating,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailsRouteProp = RouteProp<RootStackParamList, 'Details'>;

const HERO_HEIGHT = 300;

// How far the content sheet is pulled up over the bottom of the photo. Named
// because two things depend on it and they have to agree: the sheet's own
// negative margin, and how far the gallery lifts its counter and dots so they
// are not hidden underneath it. It was spelled out twice before, and the two
// numbers did not match.
const SHEET_OVERLAP = spacing.lg;

// Amenity names are free text in Firestore, so this maps the ones we know to
// an icon and quietly falls back for anything an owner invents.
const AMENITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  WiFi: 'wifi',
  Aircon: 'snow-outline',
  'Own CR': 'water-outline',
  Kitchen: 'restaurant-outline',
  Laundry: 'shirt-outline',
  Parking: 'car-outline',
  'Study Area': 'book-outline',
};

export default function DetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailsRouteProp>();
  const { propertyId } = route.params;
  const { user } = useAuth();
  const { addToCompare, removeFromCompare, compareList } = useCompare();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [property, setProperty] = useState<Property | null>(null);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  // Runs the first time this account opens any listing. The steps point at
  // the save, directions and compare controls, which are the three things on
  // this screen that do something non-obvious.
  //
  // Held until the listing has actually loaded. Those three controls are only
  // rendered once there is something to render them for, so starting on mount
  // meant the first step hunted for a button that did not exist yet and gave
  // up -- on a slow connection, which is the only time it is noticeable, the
  // tour opened with its arrow pointing at nothing.
  useScreenTour(property ? TOUR.details : '', property ? DETAILS_TOUR : []);
  // How far this place is from the person reading about it -- the one fact
  // the whole application is built around, and the one this screen never
  // showed. Null until we know, and null for ever if we are not allowed to.
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Reads the distance only if location was already allowed, and never asks.
  //
  // Opening a listing is not the moment to interrupt somebody with a
  // permission dialog -- the map and the route guide ask, in their own time,
  // where the answer is the point of the screen. getLastKnownPositionAsync
  // returns the fix the phone already has rather than waking the GPS, so this
  // costs nothing and resolves immediately or not at all.
  useEffect(() => {
    if (!property) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled || !permission.granted) {
          return;
        }
        const position = await Location.getLastKnownPositionAsync({});
        if (cancelled || !position) {
          return;
        }
        setDistanceKm(
          getDistanceInKm(
            position.coords.latitude,
            position.coords.longitude,
            property.latitude,
            property.longitude
          )
        );
      } catch {
        // No distance shown. The rest of the screen is unaffected, which is
        // why this is silent rather than an error state.
      }
    })();
    return () => { cancelled = true; };
  }, [property?.id, property?.latitude, property?.longitude]);

  const loadDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Load the property itself.
      const propertySnap = await getDoc(doc(db, 'properties', propertyId));
      if (propertySnap.exists()) {
        const loaded = { id: propertySnap.id, ...(propertySnap.data() as Omit<Property, 'id'>) };
        setProperty(loaded);

        // Remember it on the phone so it can appear under "Recently Viewed"
        // on the Home screen, with or without a connection.
        if (user) {
          await recordRecentlyViewed(user.uid, loaded);
        }
      } else {
        setProperty(null);
      }

      // Load this property's reviews, then keep the 3 newest as a preview
      // (the full list is on the Reviews screen).
      //
      // Note: we only filter in Firestore and do the sorting here in JS.
      // Asking Firestore to filter AND sort at the same time would require
      // creating a special "composite index" in the Firebase console, which
      // isn't worth it for a handful of reviews.
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('propertyId', '==', propertyId)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      const loadedReviews = reviewsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Review, 'id'>),
      }));
      loadedReviews.sort((a, b) => b.createdAt - a.createdAt);
      setRecentReviews(loadedReviews.slice(0, 3));
      setReviewCount(loadedReviews.length);
      setAverageRating(
        loadedReviews.length > 0
          ? loadedReviews.reduce((total, review) => total + review.rating, 0) /
              loadedReviews.length
          : 0
      );

      // Check whether the current user already favorited this property.
      if (user) {
        const favoritesQuery = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('propertyId', '==', propertyId)
        );
        const favoritesSnap = await getDocs(favoritesQuery);
        setFavoriteDocId(favoritesSnap.empty ? null : favoritesSnap.docs[0].id);
      }
    } catch {
      // The old version had no catch at all here, so a dropped connection
      // left the spinner spinning forever with no way out.
      setErrorMessage('Could not load this listing. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, user]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Refresh whenever the user comes back to this screen (e.g. after
  // submitting a new review), so the preview list stays up to date.
  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  async function toggleFavorite() {
    if (!user || !property || isSavingFavorite) {
      return;
    }

    // Guarded so a double tap cannot create two favourite rows for one
    // listing -- exactly the duplicate-record problem that silent controls
    // cause.
    setIsSavingFavorite(true);
    const previous = favoriteDocId;
    try {
      if (previous) {
        // Already favorited -- remove it.
        await removeFavorite(previous);
        setFavoriteDocId(null);
      } else {
        // Not favorited yet -- add it.
        setFavoriteDocId(await addFavorite(user.uid, property.id));
      }
    } catch (error) {
      // Put the heart back AND say so. Reverting silently looks like the tap
      // simply missed, and the user walks away believing the listing is on
      // their shortlist when it is not. Search says this too -- both places
      // have to behave the same way or the control is untrustworthy.
      setFavoriteDocId(previous);
      Alert.alert('Could not save', describeFirestoreError(error));
    } finally {
      setIsSavingFavorite(false);
    }
  }

  // ---- States --------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.canvas }}>
        <Skeleton height={HERO_HEIGHT} radius={0} />
        <View style={{ padding: GUTTER, gap: t.spacing.sm }}>
          <Skeleton height={26} width="75%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={64} />
          <Skeleton height={100} />
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.canvas, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: GUTTER }}>
          <IconButton icon="chevron-back" label="Go back" onPress={() => navigation.goBack()} />
        </View>
        <ErrorState message={errorMessage} onRetry={loadDetails} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.canvas, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: GUTTER }}>
          <IconButton icon="chevron-back" label="Go back" onPress={() => navigation.goBack()} />
        </View>
        <EmptyState
          icon="help-circle-outline"
          title="Listing not found"
          message="This boarding house may have been removed by its owner or an administrator."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const isFavorite = favoriteDocId !== null;
  const inCompare = compareList.some((listed) => listed.id === property.id);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: t.spacing.xxl + t.spacing.xl }}
      >
        <PhotoGallery
          photos={photosOf(property)}
          title={property.title}
          roomType={property.roomType}
          height={HERO_HEIGHT}
          // The sheet below is pulled up over the photo by this much, so the
          // gallery's counter and dots have to clear it.
          bottomInset={SHEET_OVERLAP}
        />

        {/* Controls float on the photo. They use the onPhoto tone because the
            image behind them is unpredictable -- a pale sky would swallow a
            plain white icon. */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + t.spacing.xs,
            left: GUTTER,
            right: GUTTER,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <IconButton
            icon="chevron-back"
            label="Go back"
            tone="onPhoto"
            onPress={() => navigation.goBack()}
          />
          <TourTarget id="details.favourite">
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              label={isFavorite ? 'Remove from saved' : 'Save this listing'}
              tone="onPhoto"
              onPress={toggleFavorite}
            />
          </TourTarget>
        </View>

        {/* The sheet overlaps the photo, which is what ties them together. */}
        <View
          style={{
            marginTop: -SHEET_OVERLAP,
            backgroundColor: t.colors.canvas,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingHorizontal: GUTTER,
            paddingTop: t.spacing.md,
            gap: t.spacing.md,
            // Clips the wash below to the rounded top corners. Without it the
            // tint squares off the sheet again at the exact point the radius
            // was there to soften.
            overflow: 'hidden',
          }}
        >
          <PageWash variant="sheet" />

          <View style={{ gap: t.spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm }}>
              <View style={{ flex: 1, gap: t.spacing.xxs }}>
                <Text variant="title">{property.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-outline" size={14} color={t.colors.inkFaint} />
                  <Text variant="caption" tone="faint" style={{ flex: 1 }}>
                    {property.address}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="metric" tone="brand">
                  {formatPeso(property.price)}
                </Text>
                <Text variant="micro" tone="faint">
                  per month
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`See all ${reviewCount} reviews`}
              onPress={() =>
                navigation.navigate('Reviews', {
                  propertyId: property.id,
                  propertyTitle: property.title,
                })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}
            >
              <Rating value={averageRating} showValue count={reviewCount} size={15} />
              {reviewCount > 0 ? (
                <Text variant="caption" tone="brand">
                  See all
                </Text>
              ) : null}
            </Pressable>
          </View>

          {/* The three facts somebody decides on, side by side, before any
              prose. Distance only appears once it is known -- an empty slot
              reading "—" would be worse than one fewer column. */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: t.colors.canvasAlt,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.colors.line,
              paddingVertical: t.spacing.sm,
            }}
          >
            {distanceKm !== null ? (
              <Fact
                icon="walk-outline"
                value={formatDistance(distanceKm)}
                label="from you"
                divider={false}
              />
            ) : null}
            <Fact
              icon="bed-outline"
              value={property.roomType}
              label="room type"
              divider={distanceKm !== null}
            />
            <Fact
              icon="star-outline"
              value={reviewCount > 0 ? averageRating.toFixed(1) : '—'}
              label={reviewCount === 1 ? '1 review' : `${reviewCount} reviews`}
              divider
            />
          </View>

          {/* Primary action. One per screen: getting there is what this app
              is for, so Navigate is it, and everything else is quieter. */}
          <View style={{ flexDirection: 'row', gap: t.spacing.xs }}>
            <TourTarget id="details.directions" style={{ flex: 1 }}>
              <Button
                label="Get directions"
                icon="navigate"
                size="lg"
                fullWidth
                onPress={() => navigation.navigate('Navigation', { property })}
              />
            </TourTarget>
            {/* Compare takes you to the next step instead of leaving you on
                this one.
                A comparison needs two places, and this screen is one of them.
                Adding from here used to be the whole interaction: the label
                changed to "Added" and that was all, so the way to reach the
                second place was to go back, find another listing, open it and
                wait for it to load. Three navigations and two waits to use a
                feature that had already started.
                Now the first pick hands you straight to the list, where the
                second can be added from a card without opening it at all.
                Only on the first pick -- once a comparison is under way, the
                bar at the bottom is already offering the way forward, and
                being moved somewhere you did not ask to go is worse than
                being left where you are. */}
            <TourTarget id="details.compare">
              <Button
                label={inCompare ? 'Added' : 'Compare'}
                icon={inCompare ? 'checkmark-circle' : 'git-compare-outline'}
                variant="secondary"
                size="lg"
                onPress={() => {
                  if (inCompare) {
                    removeFromCompare(property.id);
                    return;
                  }
                  const wasEmpty = compareList.length === 0;
                  addToCompare(property);
                  if (wasEmpty) {
                    navigation.navigate('MainTabs', { screen: 'Search' });
                  }
                }}
              />
            </TourTarget>
          </View>

          {/* The contact, directly above the description, because once
              somebody has decided they like a place this is the only thing
              the application can still do for them -- it arranges nothing
              itself. Tapping it opens the dialler with the number in it. */}
          {property.contactNumber ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${property.contactNumber}`}
              onPress={() => Linking.openURL(`tel:${property.contactNumber}`)}
            >
              <Card
                level="low"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.sm,
                  borderRadius: t.radius.lg,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: t.radius.pill,
                    backgroundColor: t.colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="call" size={18} color={t.colors.brand} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="bodyStrong">{property.contactNumber}</Text>
                  <Text variant="micro" tone="faint">Tap to call the owner</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.colors.inkFaint} />
              </Card>
            </Pressable>
          ) : null}

          <Card level="low" style={{ gap: t.spacing.xs, borderRadius: t.radius.lg }}>
            <Text variant="captionStrong" tone="soft" uppercase>
              About this place
            </Text>
            <Text variant="body" tone="soft">
              {property.description || 'The owner has not added a description yet.'}
            </Text>
          </Card>

          <View style={{ gap: t.spacing.xs }}>
            <Text variant="heading">What it offers</Text>
            {property.amenities.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
                <Pill label={property.roomType} tone="brand" icon="bed-outline" />
                {property.amenities.map((amenity) => (
                  <Pill
                    key={amenity}
                    label={amenity}
                    icon={AMENITY_ICONS[amenity] ?? 'checkmark-circle-outline'}
                  />
                ))}
              </View>
            ) : (
              <Text variant="caption" tone="faint">
                No amenities listed for this boarding house.
              </Text>
            )}
          </View>

          <View style={{ gap: t.spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="heading">Reviews</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open all reviews"
                onPress={() =>
                  navigation.navigate('Reviews', {
                    propertyId: property.id,
                    propertyTitle: property.title,
                  })
                }
              >
                <Text variant="captionStrong" tone="brand">
                  {reviewCount > 3 ? `See all ${reviewCount}` : 'Write a review'}
                </Text>
              </Pressable>
            </View>

            {recentReviews.length === 0 ? (
              <Card level="flat" outlined style={{ gap: 2, borderRadius: t.radius.lg }}>
                <Text variant="captionStrong">No reviews yet</Text>
                <Text variant="caption" tone="faint">
                  Be the first to tell other students what this place is like.
                </Text>
              </Card>
            ) : (
              recentReviews.map((review) => (
                <Card key={review.id} level="low" style={{ gap: t.spacing.xxs, borderRadius: t.radius.lg }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {displayName(review.userName)}
                    </Text>
                    <Rating value={review.rating} size={12} />
                  </View>
                  <Text variant="caption" tone="soft">
                    {review.body}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* The only way to reach the Compare screen used to be the bar on Search
          and Favorites. So adding a listing from here put it in the tray with
          no visible route to the tray itself. */}
      <CompareBar />
    </View>
  );
}

// One column of the facts strip. Its own component so the three stay
// identical: a divider drawn per-column rather than between them is how these
// rows end up subtly uneven.
function Fact({
  icon,
  value,
  label,
  divider,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  divider: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: t.colors.line,
      }}
    >
      <Ionicons name={icon} size={16} color={t.colors.brand} />
      <Text variant="captionStrong" numberOfLines={1}>{value}</Text>
      <Text variant="micro" tone="faint" numberOfLines={1}>{label}</Text>
    </View>
  );
}
