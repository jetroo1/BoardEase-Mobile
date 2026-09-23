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
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { AppParamList } from '../navigation/types';
import CompareBar from '../components/CompareBar';
import { cacheFavorites, loadCachedFavorites } from '../utils/offlineCache';
import { GUTTER } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Screen, ScreenHeader, EmptyState, PropertyCard, Text } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<AppParamList>;

// A favorited property, along with the id of the favorite record itself
// (needed so we know which document to delete when "unfavoriting").
interface FavoriteProperty extends Property {
  favoriteDocId: string;
}

export default function FavoritesScreen() {
  const t = useTheme();
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

  return (
    <Screen>
      <ScreenHeader title="Saved listings" large />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.brand} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.favoriteDocId}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 80, flexGrow: 1, gap: t.spacing.sm }}
          ListHeaderComponent={isShowingCached ? <Text variant="caption" tone="soft">Offline: showing the saved copy on this phone.</Text> : null}
          ListEmptyComponent={
            <EmptyState icon="heart-outline" title={isShowingCached ? 'No saved copy available' : 'Your shortlist starts here'}
              message={isShowingCached ? 'Reconnect to load your saved listings.' : 'No boarding houses saved yet.'}
              actionLabel={isShowingCached ? 'Try again' : 'Browse listings'}
              onAction={isShowingCached ? loadFavorites : () => navigation.navigate('Search')} />
          }
          renderItem={({ item }) => (
            <PropertyCard property={item} isFavorite onPress={() => navigation.navigate('Details', { propertyId: item.id })}
              onToggleFavorite={isShowingCached ? undefined : () => {
                handleUnfavorite(item.favoriteDocId).catch(() => Alert.alert('Could not remove listing', 'Check your connection and try again.'));
              }} />
          )}
        />
      )}
      <CompareBar />
    </Screen>
  );
}
