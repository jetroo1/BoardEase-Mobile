// Admin screen: the moderation dashboard from our proposal. It has two
// tabs:
//   - "Listings" lists every property that hasn't been approved yet and
//     lets an admin approve or reject it.
//   - "Reviews" lists every review left anywhere in the app and lets an
//     admin remove one (for spam or offensive text).
//
// Only an admin should ever reach this screen -- ProfileScreen only shows
// the button that opens it when role === 'admin', and we double-check the
// role again here just in case.
//
// The header comes from RootNavigator (detailHeader('Admin panel')).

import React, { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Property, Review } from '../types';
import { RootStackParamList } from '../navigation/types';
import { GUTTER, HIT_SLOP_MIN } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pill,
  Pressable,
  PropertyPhoto,
  Rating,
  Screen,
  Skeleton,
  Text,
  formatPeso,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Which of the two tabs is showing.
type AdminTab = 'listings' | 'reviews';

// A review plus the title of the listing it was written about. The reviews
// collection only stores a propertyId, so we look the title up separately.
interface ReviewWithProperty extends Review {
  propertyTitle: string;
}

export default function AdminScreen() {
  const t = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('listings');
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingsError, setListingsError] = useState('');
  const [reviews, setReviews] = useState<ReviewWithProperty[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPendingProperties = useCallback(async () => {
    setIsLoading(true);
    setListingsError('');
    try {
      const pendingQuery = query(
        collection(db, 'properties'),
        where('isApproved', '==', false)
      );
      const snapshot = await getDocs(pendingQuery);
      setPendingProperties(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Property, 'id'>),
        }))
      );
    } catch {
      // No catch existed here, so a dropped connection left the spinner
      // running with nothing to act on.
      setListingsError('Could not load the approval queue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    setReviewsError('');
    try {
      // Fetch every review in the app, then sort newest-first here in JS.
      // Sorting inside the Firestore query instead would need a manually
      // created index in the Firebase console, which this project avoids.
      const snapshot = await getDocs(collection(db, 'reviews'));
      const loadedReviews: Review[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Review, 'id'>),
      }));
      loadedReviews.sort((a, b) => b.createdAt - a.createdAt);

      // Each review only knows its propertyId, so go and fetch the listing
      // titles. We remember every title we've already fetched in `titles`, so
      // a property with five reviews is only read from Firestore once.
      const titles: Record<string, string> = {};
      const reviewsWithTitles: ReviewWithProperty[] = [];

      for (const review of loadedReviews) {
        if (!titles[review.propertyId]) {
          const propertySnap = await getDoc(doc(db, 'properties', review.propertyId));
          titles[review.propertyId] = propertySnap.exists()
            ? (propertySnap.data().title as string)
            : 'Deleted listing';
        }
        reviewsWithTitles.push({ ...review, propertyTitle: titles[review.propertyId] });
      }

      setReviews(reviewsWithTitles);
    } catch {
      setReviewsError('Could not load reviews.');
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPendingProperties();
      loadReviews();
    }, [loadPendingProperties, loadReviews])
  );

  async function handleApprove(property: Property) {
    if (busyId) {
      return;
    }
    setBusyId(property.id);
    try {
      await updateDoc(doc(db, 'properties', property.id), { isApproved: true });
      setPendingProperties((current) => current.filter((item) => item.id !== property.id));
    } catch {
      Alert.alert('Could not approve', 'Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  // Names the listing it is about to delete rather than asking "Continue?".
  function handleReject(property: Property) {
    Alert.alert(
      'Reject this listing?',
      `"${property.title}" will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setBusyId(property.id);
            try {
              await deleteDoc(doc(db, 'properties', property.id));
              setPendingProperties((current) =>
                current.filter((item) => item.id !== property.id)
              );
            } catch {
              Alert.alert('Could not reject', 'Check your connection and try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  function handleRemoveReview(review: ReviewWithProperty) {
    Alert.alert(
      'Remove this review?',
      `${review.userName}'s review of "${review.propertyTitle}" will be permanently deleted.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyId(review.id);
            try {
              await deleteDoc(doc(db, 'reviews', review.id));
              // Take it out of our own list too, so the screen updates right
              // away without needing to re-fetch everything from Firestore.
              setReviews((current) => current.filter((item) => item.id !== review.id));
            } catch {
              Alert.alert('Could not remove', 'Check your connection and try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  // Belt and braces: ProfileScreen already hides the entry point, but a
  // moderation screen should refuse on its own rather than trust its caller.
  if (role !== 'admin') {
    return (
      <Screen edges={false}>
        <EmptyState
          icon="lock-closed-outline"
          tone="danger"
          title="Administrators only"
          message="This account does not have permission to moderate listings or reviews."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={false}>
      {/* Both counts are on the tabs, so an admin can see what is waiting
          without opening each one. */}
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing.xxs,
          marginHorizontal: GUTTER,
          marginBottom: t.spacing.sm,
          padding: t.spacing.xxs,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.canvasAlt,
        }}
      >
        {(['listings', 'reviews'] as AdminTab[]).map((tab) => {
          const active = activeTab === tab;
          const count = tab === 'listings' ? pendingProperties.length : reviews.length;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab}, ${count}`}
              animate={false}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.spacing.xxs,
                minHeight: HIT_SLOP_MIN - t.spacing.sm,
                paddingVertical: t.spacing.xs,
                borderRadius: t.radius.pill,
                backgroundColor: active ? t.colors.surface : 'transparent',
                ...(active ? t.elevation.low : null),
              }}
            >
              <Text variant="captionStrong" tone={active ? 'brand' : 'faint'}>
                {tab === 'listings' ? 'Pending' : 'Reviews'}
              </Text>
              <Text variant="micro" tone={active ? 'brand' : 'faint'}>
                {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'listings' ? (
        isLoading ? (
          <LoadingList />
        ) : listingsError ? (
          <ErrorState message={listingsError} onRetry={loadPendingProperties} />
        ) : (
          <FlatList
            data={pendingProperties}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: GUTTER,
              paddingBottom: t.spacing.xl,
              gap: t.spacing.sm,
              flexGrow: 1,
            }}
            ListHeaderComponent={
              <Button
                label="Add a new listing"
                icon="add-circle-outline"
                fullWidth
                onPress={() => navigation.navigate('AddListing')}
                style={{ marginBottom: t.spacing.xs }}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="checkmark-done-outline"
                title="Queue is clear"
                message="Every listing has been reviewed. New submissions will appear here."
              />
            }
            renderItem={({ item }) => (
              <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                  <PropertyPhoto
                    uri={item.imageUrl}
                    title={item.title}
                    roomType={item.roomType}
                    height={60}
                    radius={t.radius.sm}
                    style={{ width: 60 }}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="captionStrong" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="caption" tone="faint" numberOfLines={1}>
                      {item.address}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}>
                      <Text variant="captionStrong" tone="brand">
                        {formatPeso(item.price)}
                      </Text>
                      <Pill label={item.roomType} tone="neutral" />
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: t.spacing.xs }}>
                  <Button
                    label="Approve"
                    icon="checkmark"
                    size="sm"
                    loading={busyId === item.id}
                    onPress={() => handleApprove(item)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Reject"
                    icon="close"
                    variant="danger"
                    size="sm"
                    disabled={busyId === item.id}
                    onPress={() => handleReject(item)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            )}
          />
        )
      ) : isLoadingReviews ? (
        <LoadingList />
      ) : reviewsError ? (
        <ErrorState message={reviewsError} onRetry={loadReviews} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.xs,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No reviews yet"
              message="Reviews left by tenants anywhere in the app will show up here for moderation."
            />
          }
          renderItem={({ item }) => (
            <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="captionStrong" numberOfLines={1}>
                    {item.userName}
                  </Text>
                  <Text variant="micro" tone="faint" numberOfLines={1}>
                    on {item.propertyTitle}
                  </Text>
                </View>
                <Rating value={item.rating} size={12} />
              </View>

              <Text variant="caption" tone="soft">
                {item.body}
              </Text>

              <Button
                label="Remove review"
                icon="trash-outline"
                variant="secondary"
                size="sm"
                disabled={busyId === item.id}
                onPress={() => handleRemoveReview(item)}
              />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function LoadingList() {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.sm }}>
      <Skeleton height={112} radius={t.radius.lg} />
      <Skeleton height={112} radius={t.radius.lg} />
      <Skeleton height={112} radius={t.radius.lg} />
    </View>
  );
}
