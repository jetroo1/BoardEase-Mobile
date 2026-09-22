// Boarding House Details screen: shows everything about one property --
// its info, amenities, a few recent reviews, and buttons to favorite it,
// add it to the comparison list, or get directions to it.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { Property, Review } from '../types';
import { RootStackParamList } from '../navigation/types';
import { recordRecentlyViewed } from '../utils/offlineCache';
import { colors, radius, shadow, spacing } from '../theme';
import StarRating from '../components/StarRating';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailsRouteProp = RouteProp<RootStackParamList, 'Details'>;

export default function DetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailsRouteProp>();
  const { propertyId } = route.params;
  const { user } = useAuth();
  const { addToCompare } = useCompare();

  const [property, setProperty] = useState<Property | null>(null);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    setIsLoading(true);

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

    setIsLoading(false);
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
    if (!user || !property) return;

    if (favoriteDocId) {
      // Already favorited -- remove it.
      await deleteDoc(doc(db, 'favorites', favoriteDocId));
      setFavoriteDocId(null);
    } else {
      // Not favorited yet -- add it.
      const newDoc = await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        propertyId: property.id,
        createdAt: Date.now(),
      });
      setFavoriteDocId(newDoc.id);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text>This property could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {property.imageUrl ? (
        <Image source={{ uri: property.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No Photo Available</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.address}>{property.address}</Text>
        <Text style={styles.price}>₱{property.price} / month · {property.roomType}</Text>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{property.description}</Text>

        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenityRow}>
          {property.amenities.length === 0 && (
            <Text style={styles.description}>No amenities listed.</Text>
          )}
          {property.amenities.map((amenity) => (
            <View key={amenity} style={styles.amenityChip}>
              <Text style={styles.amenityChipText}>{amenity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, favoriteDocId && styles.actionButtonFavorited]}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={favoriteDocId ? 'heart' : 'heart-outline'}
              size={16}
              color={favoriteDocId ? colors.amber : colors.white}
            />
            <Text style={styles.actionButtonText}>
              {favoriteDocId ? 'Favorited' : 'Favorite'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => addToCompare(property)}
          >
            <Ionicons name="git-compare-outline" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Compare</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate('Navigation', { property })}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Navigate</Text>
          </Pressable>
        </View>

        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Pressable
            onPress={() =>
              navigation.navigate('Reviews', {
                propertyId: property.id,
                propertyTitle: property.title,
              })
            }
          >
            <Text style={styles.seeAllLink}>See all</Text>
          </Pressable>
        </View>

        {recentReviews.length === 0 && (
          <Text style={styles.description}>No reviews yet. Be the first to review!</Text>
        )}
        {recentReviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewAuthorRow}>
              <Text style={styles.reviewAuthor}>{review.userName}</Text>
              <StarRating rating={review.rating} />
            </View>
            <Text style={styles.description}>{review.body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 220 },
  imagePlaceholder: { backgroundColor: colors.placeholder, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.muted },
  content: { padding: spacing.lg - 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.ink },
  address: { fontSize: 14, color: colors.muted, marginTop: 4 },
  price: { fontSize: 16, color: colors.sky, fontWeight: '600', marginTop: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: spacing.lg - 4, marginBottom: spacing.sm, color: colors.ink },
  description: { fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: {
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
  },
  amenityChipText: { color: colors.deep, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.lg },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadow.card,
  },
  actionButtonFavorited: { backgroundColor: colors.deep },
  actionButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllLink: { color: colors.sky, fontSize: 13, fontWeight: '600' },
  reviewCard: { marginBottom: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm + 4 },
  reviewAuthorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontWeight: '600', color: colors.ink },
});
