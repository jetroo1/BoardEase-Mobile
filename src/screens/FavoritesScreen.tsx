// Favorites screen: shows every property the current user has favorited.
//
// The "favorites" collection only stores { userId, propertyId }, so for
// each favorite we also fetch the matching property document -- that's
// what "joined with property data" means here: combining two collections
// in plain JS instead of a database JOIN.
//
// Every successful load is also copied to the phone with AsyncStorage
// (see utils/offlineCache.ts). If Firestore cannot be reached later, we
// show that copy plus an "offline" note instead of an empty list.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { RootStackParamList } from '../navigation/types';
import CompareBar from '../components/CompareBar';
import { cacheFavorites, loadCachedFavorites } from '../utils/offlineCache';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// A favorited property, along with the id of the favorite record itself
// (needed so we know which document to delete when "unfavoriting").
interface FavoriteProperty extends Property {
  favoriteDocId: string;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // True when what's on screen came from the phone's cache because
  // Firestore could not be reached.
  const [isShowingCached, setIsShowingCached] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const favoritesQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const favoritesSnap = await getDocs(favoritesQuery);

      // For every favorite record, go fetch the actual property it points to.
      const results: FavoriteProperty[] = [];
      for (const favoriteDoc of favoritesSnap.docs) {
        const propertyId = favoriteDoc.data().propertyId as string;
        const propertySnap = await getDoc(doc(db, 'properties', propertyId));
        if (propertySnap.exists()) {
          results.push({
            id: propertySnap.id,
            ...(propertySnap.data() as Omit<Property, 'id'>),
            favoriteDocId: favoriteDoc.id,
          });
        }
      }

      setFavorites(results);
      setIsShowingCached(false);
      // Keep the phone's copy in step with what we just loaded.
      await cacheFavorites(user.uid, results);
    } catch {
      // No connection (or Firestore is unreachable). Fall back to the copy
      // saved the last time this screen loaded successfully.
      const cached = await loadCachedFavorites<FavoriteProperty>(user.uid);
      setFavorites(cached);
      setIsShowingCached(true);
    }

    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  async function handleUnfavorite(favoriteDocId: string) {
    // Removing a favorite is a write, so it needs a connection. While we are
    // showing the cached list there is nothing to write to -- do nothing
    // rather than let the tap throw.
    if (isShowingCached) return;

    await deleteDoc(doc(db, 'favorites', favoriteDocId));
    const remaining = favorites.filter((item) => item.favoriteDocId !== favoriteDocId);
    setFavorites(remaining);
    if (user) {
      await cacheFavorites(user.uid, remaining);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.favoriteDocId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>My Favorites</Text>
            {isShowingCached && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.deep} />
                <Text style={styles.offlineBannerText}>
                  You're offline — showing your saved copy.
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="heart-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyText}>
              {isShowingCached
                ? "You're offline and nothing is saved on this phone yet."
                : "You haven't favorited any properties yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Details', { propertyId: item.id })}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            <View style={styles.info}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardAddress}>{item.address}</Text>
              <Text style={styles.cardPrice}>₱{item.price} / month</Text>
            </View>
            <Pressable
              style={styles.unfavoriteButton}
              onPress={() => handleUnfavorite(item.favoriteDocId)}
            >
              <Ionicons name="heart" size={16} color={colors.danger} />
            </Pressable>
          </Pressable>
        )}
      />
      <CompareBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  list: { padding: spacing.md },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: spacing.md, color: colors.ink },
  emptyText: { color: colors.muted, textAlign: 'center' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  offlineBannerText: { flex: 1, color: colors.deep, fontSize: 12, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 4,
    gap: spacing.sm + 2,
    ...shadow.card,
  },
  image: { width: 60, height: 60, borderRadius: radius.sm },
  imagePlaceholder: { backgroundColor: colors.placeholder },
  info: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: colors.ink },
  cardAddress: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardPrice: { fontSize: 12, color: colors.sky, marginTop: 4 },
  unfavoriteButton: {
    backgroundColor: colors.mist,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
  },
});
