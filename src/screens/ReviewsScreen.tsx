// Ratings & Reviews screen: shows every review for one property, and lets
// the current user submit a new one. Before saving, we check (on the
// client, by querying Firestore) whether this user already reviewed this
// property, and block a second submission if so.
//
// The header comes from RootNavigator (detailHeader('Reviews')), so this
// screen must not draw one of its own.

import React, { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Review } from '../types';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Rating,
  RatingInput,
  Screen,
  Skeleton,
  Text,
} from '../components/ui';

type ReviewsRouteProp = RouteProp<RootStackParamList, 'Reviews'>;

// Firebase gives us the email as the display name. Showing the whole thing
// puts a stranger's address on screen, so only the part before the @ is used.
function displayName(raw: string): string {
  const local = raw.split('@')[0] ?? raw;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function ReviewsScreen() {
  const t = useTheme();
  const route = useRoute<ReviewsRouteProp>();
  const { propertyId, propertyTitle } = route.params;
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // We only filter in Firestore and sort here in JS. Filtering AND
      // sorting in the same Firestore query would require creating a special
      // "composite index" in the Firebase console, which we don't need for
      // this many reviews.
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('propertyId', '==', propertyId)
      );
      const snapshot = await getDocs(reviewsQuery);
      const loadedReviews = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Review, 'id'>),
      }));
      loadedReviews.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(loadedReviews);

      // A user has already reviewed this property if one of the loaded
      // reviews belongs to them.
      if (user) {
        setHasReviewed(loadedReviews.some((review) => review.userId === user.uid));
      }
    } catch {
      // There was no catch here at all, so a dropped connection left the
      // spinner running with no message and no way to retry.
      setErrorMessage('Could not load reviews. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, user]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  async function handleSubmit() {
    if (!user || isSubmitting) {
      return;
    }

    if (hasReviewed) {
      Alert.alert('Already reviewed', 'You have already left a review for this property.');
      return;
    }

    if (body.trim() === '') {
      setBodyError('Write a sentence or two about your stay.');
      return;
    }
    setBodyError(null);

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        propertyId,
        userId: user.uid,
        userName: user.email || 'Anonymous',
        rating,
        body: body.trim(),
        createdAt: Date.now(),
      });
      setBody('');
      setRating(5);
      await loadReviews();
    } catch {
      Alert.alert('Could not submit', 'Check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const average =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;

  if (isLoading) {
    return (
      <Screen edges={false}>
        <View style={{ padding: GUTTER, gap: t.spacing.sm }}>
          <Skeleton height={72} radius={t.radius.lg} />
          <Skeleton height={140} radius={t.radius.lg} />
          <Skeleton height={80} radius={t.radius.lg} />
        </View>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen edges={false}>
        <ErrorState message={errorMessage} onRetry={loadReviews} />
      </Screen>
    );
  }

  return (
    <Screen edges={false}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.sm,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={{ gap: t.spacing.md, paddingBottom: t.spacing.xs }}>
            {/* The number first: an average is what someone is actually
                looking for when they open this screen. */}
            <Card level="low" style={{ borderRadius: t.radius.lg, flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
              <View style={{ alignItems: 'center' }}>
                <Text variant="display" tone={average > 0 ? 'default' : 'faint'}>
                  {average > 0 ? average.toFixed(1) : '—'}
                </Text>
                <Rating value={average} size={13} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="captionStrong" numberOfLines={2}>
                  {propertyTitle}
                </Text>
                <Text variant="caption" tone="faint">
                  {reviews.length === 0
                    ? 'No reviews yet'
                    : `${reviews.length} review${reviews.length === 1 ? '' : 's'} from tenants`}
                </Text>
              </View>
            </Card>

            {/* Write-a-review form, or the reason it is not shown. */}
            {hasReviewed ? (
              <Card
                level="flat"
                outlined
                style={{
                  borderRadius: t.radius.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.xs,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color={t.colors.success} />
                <Text variant="caption" tone="soft" style={{ flex: 1 }}>
                  You have already reviewed this boarding house. One review per person
                  keeps the average honest.
                </Text>
              </Card>
            ) : user ? (
              <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.sm }}>
                <Text variant="heading">Write a review</Text>

                <View style={{ gap: t.spacing.xxs }}>
                  <Text variant="captionStrong" tone="soft">
                    Your rating
                  </Text>
                  <RatingInput value={rating} onChange={setRating} size={28} />
                </View>

                <Input
                  label="Your review"
                  placeholder="What was it like to live here?"
                  value={body}
                  onChangeText={setBody}
                  onBlur={() =>
                    setBodyError(body.trim() === '' ? 'Write a sentence or two about your stay.' : null)
                  }
                  error={bodyError}
                  multiline
                />

                <Button
                  label="Submit review"
                  icon="send-outline"
                  fullWidth
                  loading={isSubmitting}
                  onPress={handleSubmit}
                />
              </Card>
            ) : null}

            {reviews.length > 0 ? (
              <Text variant="heading">What tenants say</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card level="low" style={{ borderRadius: t.radius.lg, gap: t.spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="micro" tone="brand">
                  {displayName(item.userName).charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="captionStrong" numberOfLines={1}>
                  {displayName(item.userName)}
                </Text>
                <Text variant="micro" tone="faint">
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
              <Rating value={item.rating} size={13} />
            </View>
            <Text variant="caption" tone="soft">
              {item.body}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No reviews yet"
            message={
              hasReviewed
                ? 'Your review is the first one here.'
                : 'Be the first to tell other students what this place is like.'
            }
          />
        }
      />
    </Screen>
  );
}
