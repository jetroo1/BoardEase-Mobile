// Map View screen: shows the search results as pins on a Leaflet map
// (see src/components/LeafletMap.tsx for why we use a WebView for this).
// Tapping a pin takes the user to that property's Details screen.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LeafletMap from '../components/LeafletMap';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MapRouteProp = RouteProp<RootStackParamList, 'Map'>;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MapRouteProp>();
  const { properties } = route.params;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Ask for the user's location again here so this screen also works
    // fine if it's ever opened without coming from the Search screen.
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    })();
  }, []);

  const markers = properties.map((property) => ({
    id: property.id,
    lat: property.latitude,
    lng: property.longitude,
    title: property.title,
  }));

  return (
    <View style={styles.container}>
      <LeafletMap
        markers={markers}
        userLocation={userLocation}
        onMarkerPress={(propertyId) => navigation.navigate('Details', { propertyId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
