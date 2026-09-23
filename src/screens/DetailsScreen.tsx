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
import { Alert, ScrollView, View } from 'react-native';
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
import { GUTTER } from '../theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  Pill,
  Pressable,
  PropertyPhoto,
  Rating,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailsRouteProp = RouteProp<RootStackParamList, 'Details'>;

const HERO_HEIGHT = 300;

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
    } catch {
      // Put the heart back AND say so. Reverting silently looks like the tap
      // simply missed, and the user walks away believing the listing is on
      // their shortlist when it is not. Search says this too -- both places
      // have to behave the same way or the control is untrustworthy.
      setFavoriteDocId(previous);
      Alert.alert('Could not save', 'Check your internet connection and try again.');
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
        <PropertyPhoto
          uri={property.imageUrl}
          title={property.title}
          roomType={property.roomType}
          height={HERO_HEIGHT}
          scrim
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
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            label={isFavorite ? 'Remove from saved' : 'Save this listing'}
            tone="onPhoto"
            onPress={toggleFavorite}
          />
        </View>

        {/* The sheet overlaps the photo, which is what ties them together. */}
        <View
          style={{
            marginTop: -t.spacing.lg,
            backgroundColor: t.colors.canvas,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingHorizontal: GUTTER,
            paddingTop: t.spacing.md,
            gap: t.spacing.md,
          }}
        >
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

          {/* Primary action. One per screen: getting there is what this app
              is for, so Navigate is it, and everything else is quieter. */}
          <View style={{ flexDirection: 'row', gap: t.spacing.xs }}>
            <Button
              label="Get directions"
              icon="navigate"
              size="lg"
              onPress={() => navigation.navigate('Navigation', { property })}
              style={{ flex: 1 }}
            />
            {/* Reflects state instead of firing silently. Tapping "Compare"
                used to add the listing with no visible change at all, and
                this screen has no compare bar, so nothing told you it had
                worked or where the comparison lives. */}
            <Button
              label={inCompare ? 'Added' : 'Compare'}
              icon={inCompare ? 'checkmark-circle' : 'git-compare-outline'}
              variant="secondary"
              size="lg"
              onPress={() =>
                inCompare ? removeFromCompare(property.id) : addToCompare(property)
              }
            />
          </View>

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
                      {review.userName}
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
