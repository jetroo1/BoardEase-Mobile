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

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { colors, radius, shadow, spacing } from '../theme';
import StarRating from '../components/StarRating';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Which of the two tabs is showing.
type AdminTab = 'listings' | 'reviews';

// A review plus the title of the listing it was written about. The reviews
// collection only stores a propertyId, so we look the title up separately.
interface ReviewWithProperty extends Review {
  propertyTitle: string;
}

export default function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('listings');
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewWithProperty[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  const loadPendingProperties = useCallback(async () => {
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
  }, []);

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);

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
    setIsLoadingReviews(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPendingProperties();
      loadReviews();
    }, [loadPendingProperties, loadReviews])
  );

  async function handleApprove(propertyId: string) {
    await updateDoc(doc(db, 'properties', propertyId), { isApproved: true });
    setPendingProperties(pendingProperties.filter((item) => item.id !== propertyId));
  }

  function handleReject(propertyId: string) {
    Alert.alert('Reject listing', 'This will permanently delete the listing. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'properties', propertyId));
          setPendingProperties(pendingProperties.filter((item) => item.id !== propertyId));
        },
      },
    ]);
  }

  // Deleting a review is permanent, so we ask first -- same pattern as
  // rejecting a listing above.
  function handleRemoveReview(reviewId: string) {
    Alert.alert('Remove review', 'This will permanently delete this review. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'reviews', reviewId));
          // Take it out of our own list too, so the screen updates right
          // away without needing to re-fetch everything from Firestore.
          setReviews(reviews.filter((item) => item.id !== reviewId));
        },
      },
    ]);
  }

  // The "Listings" tab: the approve / reject queue.
  function renderListingsTab() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      );
    }

    return (
      <FlatList
        style={styles.container}
        data={pendingProperties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Entry point to the form that creates a brand-new listing. */}
            <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddListing')}>
              <Ionicons name="add-circle" size={18} color={colors.white} />
              <Text style={styles.addButtonText}>Add New Listing</Text>
            </Pressable>

            <Text style={styles.title}>Pending Listings</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No listings waiting for approval.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardAddress}>{item.address}</Text>
            <Text style={styles.cardMeta}>₱{item.price} · {item.roomType}</Text>

            <View style={styles.actionRow}>
              <Pressable style={styles.approveButton} onPress={() => handleApprove(item.id)}>
                <Ionicons name="checkmark-circle" size={16} color={colors.white} />
                <Text style={styles.approveButtonText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.rejectButton} onPress={() => handleReject(item.id)}>
                <Ionicons name="close-circle" size={16} color={colors.white} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    );
  }

  // The "Reviews" tab: every review in the app, newest first, each with a
  // Remove button.
  function renderReviewsTab() {
    if (isLoadingReviews) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      );
    }

    return (
      <FlatList
        style={styles.container}
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>All Reviews ({reviews.length})</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nobody has written a review yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.cardTitle}>{item.userName}</Text>
              <StarRating rating={item.rating} />
            </View>
            <Text style={styles.reviewProperty}>on {item.propertyTitle}</Text>
            <Text style={styles.reviewBody}>{item.body}</Text>

            <Pressable style={styles.removeButton} onPress={() => handleRemoveReview(item.id)}>
              <Ionicons name="trash" size={16} color={colors.white} />
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text>You do not have access to this screen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* A simple two-tab switcher: tapping one just changes which list we
          render below. */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'listings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('listings')}
        >
          <Ionicons
            name="home"
            size={14}
            color={activeTab === 'listings' ? colors.white : colors.inkSoft}
          />
          <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
            Listings
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Ionicons
            name="star"
            size={14}
            color={activeTab === 'reviews' ? colors.white : colors.inkSoft}
          />
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            Reviews
          </Text>
        </Pressable>
      </View>

      {activeTab === 'listings' ? renderListingsTab() : renderReviewsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.muted, textAlign: 'center' },
  list: { padding: spacing.lg - 4 },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md - 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    ...shadow.card,
  },
  tabButtonActive: { backgroundColor: colors.sky },
  tabText: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.white },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: spacing.md, color: colors.ink },
  addButton: {
    flexDirection: 'row',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg - 4,
    ...shadow.card,
  },
  addButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    marginBottom: spacing.sm + 4,
    ...shadow.card,
  },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: colors.ink },
  cardAddress: { color: colors.muted, fontSize: 13, marginTop: 2 },
  cardMeta: { color: colors.sky, fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.sm + 4 },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  approveButtonText: { color: colors.white, fontWeight: '600' },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  rejectButtonText: { color: colors.white, fontWeight: '600' },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewProperty: { color: colors.muted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  reviewBody: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  removeButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 2,
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm + 4,
  },
  removeButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
});
