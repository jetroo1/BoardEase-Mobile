// Add Listing screen: the form an admin uses to create a brand-new boarding
// house listing straight from the phone. It collects the listing details,
// lets the admin pin the location (either by using the phone's GPS or by
// typing the coordinates by hand), lets them attach a photo taken with the
// camera or picked from the gallery, and finally saves everything as one new
// document in the Firestore "properties" collection.
//
// Only an admin should reach this screen (the button that opens it lives on
// the Admin screen), but we double-check the role here as well, exactly like
// AdminScreen does.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db, storage } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { radius, spacing } from '../theme';
import { Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { Screen, ScreenHeader } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// The same option lists the Filter screen uses, so what an admin can create
// always matches what a tenant can search for.
const ROOM_TYPE_OPTIONS = ['Single', 'Shared', 'Studio'];
const AMENITY_OPTIONS = ['WiFi', 'CR', 'Parking', 'Aircon', 'Kitchen', 'Laundry'];

export default function AddListingScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const { user, role } = useAuth();

  // One piece of state per form field. Numbers (price, latitude, longitude)
  // are kept as text while typing, and only turned into real numbers when we
  // validate and save -- that is how a TextInput naturally works.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [priceText, setPriceText] = useState('');
  const [roomType, setRoomType] = useState('Single'); // starts on the most common choice
  const [amenities, setAmenities] = useState<string[]>([]);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [photoUri, setPhotoUri] = useState(''); // the photo on THIS phone, not uploaded yet

  const [isLocating, setIsLocating] = useState(false); // true while the GPS is working
  const [isSaving, setIsSaving] = useState(false); // true while uploading / saving

  function toggleAmenity(amenity: string) {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((item) => item !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  }

  // "Use my current location": reads the phone's GPS and drops the numbers
  // into the latitude / longitude boxes. The admin can still edit them after.
  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Please allow location access, or type the latitude and longitude by hand.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      setLatitudeText(String(position.coords.latitude));
      setLongitudeText(String(position.coords.longitude));
    } catch (error: any) {
      Alert.alert('Could not get location', error.message || 'Please type the coordinates instead.');
    } finally {
      setIsLocating(false);
    }
  }

  // Take a new photo with the camera.
  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access in your phone settings to take a listing photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5, // smaller file so the upload is quick
    });

    // result.canceled is true when the user backs out without taking a photo.
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  // Pick an existing photo from the phone's gallery.
  async function handleChooseFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Gallery permission needed',
        'Please allow photo access in your phone settings to choose a listing photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // photos only, no videos
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  // Checks every rule before we are allowed to save. Returns true when the
  // form is good, or shows an Alert and returns false on the first problem.
  function validateForm(): boolean {
    if (title.trim() === '') {
      Alert.alert('Title required', 'Please enter a name for this boarding house.');
      return false;
    }
    if (address.trim() === '') {
      Alert.alert('Address required', 'Please enter the address of this boarding house.');
      return false;
    }
    if (priceText.trim() === '') {
      Alert.alert('Price required', 'Please enter the monthly price.');
      return false;
    }

    // Number('abc') gives NaN ("not a number"), so this catches typos as well
    // as zero and negative prices.
    const price = Number(priceText);
    if (Number.isNaN(price) || price <= 0) {
      Alert.alert('Invalid price', 'Price must be a number greater than 0.');
      return false;
    }

    if (latitudeText.trim() === '' || longitudeText.trim() === '') {
      Alert.alert(
        'Location required',
        'Tap "Use my current location", or type the latitude and longitude yourself.'
      );
      return false;
    }

    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      Alert.alert('Invalid latitude', 'Latitude must be a number between -90 and 90.');
      return false;
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      Alert.alert('Invalid longitude', 'Longitude must be a number between -180 and 180.');
      return false;
    }

    return true;
  }

  // Sends the picked photo to Firebase Storage and returns the public URL we
  // can save on the property. This can fail (for example if Storage has not
  // been turned on in the Firebase console), so the caller wraps it.
  async function uploadPhotoToStorage(localUri: string): Promise<string> {
    // The picker gives us a file path on this phone. fetch() + .blob() turns
    // that file into raw data that Firebase Storage knows how to accept.
    const response = await fetch(localUri);
    const fileBlob = await response.blob();

    // Timestamp + random number keeps every uploaded file name unique.
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 100000)}.jpg`;
    const storageRef = ref(storage, `property-images/${fileName}`);

    await uploadBytes(storageRef, fileBlob);
    return await getDownloadURL(storageRef);
  }

  // Writes the actual document into Firestore. Called once the form is valid
  // and we know what to put in imageUrl (either a real URL or an empty string).
  async function saveListing(imageUrl: string) {
    if (!user) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'properties'), {
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        price: Number(priceText),
        roomType,
        amenities,
        latitude: Number(latitudeText),
        longitude: Number(longitudeText),
        imageUrl,
        ownerId: user.uid,
        // An admin is the one adding this listing, and admins are exactly the
        // people who approve listings -- so it is already verified and can go
        // straight into the search results instead of the pending queue.
        isApproved: true,
        createdAt: Date.now(),
      });

      Alert.alert('Listing added', 'The new boarding house is now live in the app.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not save listing', error.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    if (!validateForm()) return;

    // No photo picked? Then there is nothing to upload -- save right away
    // with an empty imageUrl.
    if (photoUri === '') {
      await saveListing('');
      return;
    }

    setIsSaving(true);
    let imageUrl = '';
    try {
      imageUrl = await uploadPhotoToStorage(photoUri);
    } catch (error) {
      // The upload failed. We deliberately do NOT clear the form here, so the
      // admin keeps everything they typed and can either fix Storage and try
      // again, or save the listing without a photo for now.
      setIsSaving(false);
      Alert.alert(
        'Photo upload failed',
        'The photo could not be uploaded. Firebase Storage may not be enabled for this project yet -- in the Firebase console go to Build > Storage > Get started, then try again.\n\nYou can also save this listing now without a photo.',
        [
          { text: 'Back to Form', style: 'cancel' },
          { text: 'Save Without Photo', onPress: () => saveListing('') },
        ]
      );
      return;
    }

    await saveListing(imageUrl);
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text>You do not have access to this screen.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Ionicons name="add-circle" size={20} color={t.colors.brandDeep} />
        <Text style={styles.headerTitle}>New Boarding House</Text>
      </View>

      <Text style={styles.sectionTitle}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sunrise Boarding House"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.sectionTitle}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell tenants what makes this place good..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Visayan Village, Tagum City"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.sectionTitle}>Monthly Price (₱)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 3500"
        keyboardType="numeric"
        value={priceText}
        onChangeText={setPriceText}
      />

      <Text style={styles.sectionTitle}>Room Type</Text>
      <View style={styles.chipRow}>
        {ROOM_TYPE_OPTIONS.map((option) => {
          const isSelected = roomType === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setRoomType(option)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITY_OPTIONS.map((option) => {
          const isSelected = amenities.includes(option);
          return (
            <Pressable
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleAmenity(option)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Location</Text>
      <Pressable
        style={styles.secondaryButton}
        onPress={handleUseCurrentLocation}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color={t.colors.brandDeep} />
        ) : (
          <>
            <Ionicons name="locate" size={18} color={t.colors.brandDeep} />
            <Text style={styles.secondaryButtonText}>Use my current location</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.helperText}>
        {latitudeText !== '' && longitudeText !== ''
          ? `Pinned at: ${latitudeText}, ${longitudeText}`
          : 'No coordinates set yet.'}
      </Text>

      <View style={styles.coordinateRow}>
        <View style={styles.coordinateColumn}>
          <Text style={styles.smallLabel}>Latitude</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7.4478"
            keyboardType="numeric"
            value={latitudeText}
            onChangeText={setLatitudeText}
          />
        </View>
        <View style={styles.coordinateColumn}>
          <Text style={styles.smallLabel}>Longitude</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 125.8078"
            keyboardType="numeric"
            value={longitudeText}
            onChangeText={setLongitudeText}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Photo</Text>
      <View style={styles.photoButtonRow}>
        <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
          <Ionicons name="camera" size={18} color={t.colors.brandDeep} />
          <Text style={styles.photoButtonText}>Take Photo</Text>
        </Pressable>
        <Pressable style={styles.photoButton} onPress={handleChooseFromGallery}>
          <Ionicons name="images" size={18} color={t.colors.brandDeep} />
          <Text style={styles.photoButtonText}>Choose from Gallery</Text>
        </Pressable>
      </View>

      {photoUri !== '' ? (
        <View>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <Pressable onPress={() => setPhotoUri('')}>
            <Text style={styles.removePhotoText}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.helperText}>No photo chosen yet (a listing can be saved without one).</Text>
      )}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color={t.colors.onBrand} />
        ) : (
          <>
            <Ionicons name="save" size={18} color={t.colors.onBrand} />
            <Text style={styles.saveButtonText}>Save Listing</Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  content: { padding: spacing.lg - 4, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.colors.ink },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: spacing.lg - 4,
    marginBottom: spacing.sm + 2,
    color: t.colors.ink,
  },
  smallLabel: { fontSize: 13, color: t.colors.inkSoft, marginBottom: spacing.xs },
  helperText: { color: t.colors.inkSoft, fontSize: 13, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    backgroundColor: t.colors.surface,
    color: t.colors.ink,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    backgroundColor: t.colors.surface,
  },
  chipSelected: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  chipText: { color: t.colors.inkSoft },
  chipTextSelected: { color: t.colors.onBrand, fontWeight: '600' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: t.colors.brandSoft,
  },
  secondaryButtonText: { color: t.colors.brandDeep, fontWeight: '600' },
  coordinateRow: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.sm + 4 },
  coordinateColumn: { flex: 1 },
  photoButtonRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: t.colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: t.colors.brandSoft,
  },
  photoButtonText: { color: t.colors.brandDeep, fontWeight: '600', fontSize: 13, flexShrink: 1, textAlign: 'center' },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.sm + 4,
    backgroundColor: t.colors.skeleton,
  },
  removePhotoText: {
    color: t.colors.danger,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: t.colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...t.elevation.low,
  },
  saveButtonText: { color: t.colors.onBrand, fontWeight: 'bold', fontSize: 16 },
  cancelButton: { alignItems: 'center', marginTop: spacing.md - 2 },
  cancelButtonText: { color: t.colors.inkSoft, fontWeight: '600' },
});
