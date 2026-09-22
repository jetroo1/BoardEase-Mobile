// Ratings & Reviews screen: shows every review for one property, and lets
// the current user submit a new one. Before saving, we check (on the
// client, by querying Firestore) whether this user already reviewed this
// property, and block a second submission if so.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Review } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';
import StarRating from '../components/StarRating';

type ReviewsRouteProp = RouteProp<RootStackParamList, 'Reviews'>;

export default function ReviewsScreen() {
  const route = useRoute<ReviewsRouteProp>();
  const { propertyId, propertyTitle } = route.params;
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);

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

    setIsLoading(false);
  }, [propertyId, user]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  async function handleSubmit() {
    if (!user) return;

    if (hasReviewed) {
      Alert.alert('Already reviewed', 'You have already left a review for this property.');
      return;
    }
    if (body.trim() === '') {
      Alert.alert('Empty review', 'Please write something before submitting.');
      return;
    }

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
    } catch (error: any) {
      Alert.alert('Could not submit review', error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{propertyTitle}</Text>

            {!hasReviewed && (
              <View style={styles.form}>
                <Text style={styles.formLabel}>Your Rating</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable key={value} onPress={() => setRating(value)}>
                      <Ionicons
                        name={value <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color={colors.amber}
                      />
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.formLabel}>Your Review</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share your experience..."
                  value={body}
                  onChangeText={setBody}
                  multiline
                />

                <Pressable
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  )}
                </Pressable>
              </View>
            )}

            {hasReviewed && (
              <Text style={styles.alreadyReviewedText}>
                You already reviewed this property. Thank you!
              </Text>
            )}

            <Text style={styles.formLabel}>All Reviews ({reviews.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewAuthorRow}>
              <Text style={styles.reviewAuthor}>{item.userName}</Text>
              <StarRating rating={item.rating} />
            </View>
            <Text style={styles.reviewBody}>{item.body}</Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>No reviews yet.</Text> : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  list: { padding: spacing.lg - 4 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: spacing.md, color: colors.ink },
  form: {
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg - 4,
  },
  formLabel: { fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.xs, color: colors.ink },
  starRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm + 4 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: colors.white,
  },
  submitButton: {
    backgroundColor: colors.sky,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.sm + 4,
    ...shadow.card,
  },
  submitButtonText: { color: colors.white, fontWeight: 'bold' },
  alreadyReviewedText: { color: colors.green, marginBottom: spacing.lg - 4, fontWeight: '600' },
  reviewCard: { marginBottom: spacing.md - 2, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm + 4 },
  reviewAuthorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontWeight: '600', color: colors.ink },
  reviewBody: { color: colors.inkSoft, lineHeight: 20 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg - 4 },
});
