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
//
// Validation is inline, next to each field. It used to fire an Alert on the
// first problem, which meant fixing four mistakes took four save attempts and
// four dialogs -- and the dialog covered the field it was complaining about.
//
// The header comes from RootNavigator (detailHeader('Add listing')).

import React, { useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
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
import { GUTTER } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Pressable,
  Screen,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// The same option lists the Filter screen uses, so what an admin can create
// always matches what a tenant can search for.
const ROOM_TYPE_OPTIONS = ['Single', 'Shared', 'Studio'];
const AMENITY_OPTIONS = ['WiFi', 'CR', 'Parking', 'Aircon', 'Kitchen', 'Laundry'];

interface FieldErrors {
  title?: string;
  address?: string;
  price?: string;
  coordinates?: string;
}

export default function AddListingScreen() {
  const t = useTheme();
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

  const [errors, setErrors] = useState<FieldErrors>({});
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
      setErrors((current) => ({ ...current, coordinates: undefined }));
    } catch {
      Alert.alert('Could not get location', 'Please type the coordinates instead.');
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

  // Collects EVERY problem at once rather than stopping at the first, so the
  // admin can fix them all in one pass.
  function validateForm(): FieldErrors {
    const next: FieldErrors = {};

    if (title.trim() === '') {
      next.title = 'Give this boarding house a name.';
    }
    if (address.trim() === '') {
      next.address = 'Enter the address.';
    }

    // Number('abc') gives NaN ("not a number"), so this catches typos as well
    // as zero and negative prices.
    const price = Number(priceText);
    if (priceText.trim() === '') {
      next.price = 'Enter the monthly rent.';
    } else if (!Number.isFinite(price) || price <= 0) {
      next.price = 'Enter a number greater than zero, like 2500.';
    }

    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (latitudeText.trim() === '' || longitudeText.trim() === '') {
      next.coordinates = 'Tap "Use my current location", or type both numbers.';
    } else if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      next.coordinates = 'Latitude must be a number between -90 and 90.';
    } else if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      next.coordinates = 'Longitude must be a number between -180 and 180.';
    }

    return next;
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
    } catch {
      Alert.alert('Could not save listing', 'Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!user || isSaving) return;

    const found = validateForm();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }

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
    } catch {
      // The upload failed. We deliberately do NOT clear the form here, so the
      // admin keeps everything they typed and can either fix Storage and try
      // again, or save the listing without a photo for now.
      setIsSaving(false);
      Alert.alert(
        'Photo upload failed',
        'The photo could not be uploaded. Firebase Storage may not be enabled for this project yet -- in the Firebase console go to Build > Storage > Get started, then try again.\n\nYou can also save this listing now without a photo.',
        [
          { text: 'Back to form', style: 'cancel' },
          { text: 'Save without photo', onPress: () => saveListing('') },
        ]
      );
      return;
    }

    await saveListing(imageUrl);
  }

  if (role !== 'admin') {
    return (
      <Screen edges={false}>
        <EmptyState
          icon="lock-closed-outline"
          tone="danger"
          title="Administrators only"
          message="This account does not have permission to add listings."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        {/* --- Identity ---------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">The basics</Text>

          <Input
            label="Name"
            icon="home-outline"
            placeholder="e.g. Sunrise Boarding House"
            value={title}
            onChangeText={setTitle}
            onBlur={() =>
              setErrors((c) => ({
                ...c,
                title: title.trim() === '' ? 'Give this boarding house a name.' : undefined,
              }))
            }
            error={errors.title}
          />

          <Input
            label="Address"
            icon="location-outline"
            placeholder="e.g. Visayan Village, Tagum City"
            value={address}
            onChangeText={setAddress}
            onBlur={() =>
              setErrors((c) => ({
                ...c,
                address: address.trim() === '' ? 'Enter the address.' : undefined,
              }))
            }
            error={errors.address}
          />

          <Input
            label="Monthly rent"
            icon="cash-outline"
            placeholder="2500"
            keyboardType="number-pad"
            value={priceText}
            onChangeText={setPriceText}
            error={errors.price}
            hint="In pesos, numbers only."
          />

          <Input
            label="Description"
            placeholder="What is this place like to live in?"
            value={description}
            onChangeText={setDescription}
            multiline
            optional
          />
        </View>

        {/* --- Room type --------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Room type</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing.xs }}>
            {ROOM_TYPE_OPTIONS.map((option) => (
              <Choice
                key={option}
                label={option}
                selected={roomType === option}
                onPress={() => setRoomType(option)}
              />
            ))}
          </View>
        </View>

        {/* --- Amenities --------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Amenities</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
            {AMENITY_OPTIONS.map((option) => (
              <Choice
                key={option}
                label={option}
                selected={amenities.includes(option)}
                onPress={() => toggleAmenity(option)}
              />
            ))}
          </View>
        </View>

        {/* --- Location ---------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Location on the map</Text>
          <Text variant="caption" tone="faint">
            These coordinates are what the distance sorting and the route guide
            use, so they matter more than the written address.
          </Text>

          <Button
            label={isLocating ? 'Reading GPS…' : 'Use my current location'}
            icon="locate-outline"
            variant="secondary"
            fullWidth
            loading={isLocating}
            onPress={handleUseCurrentLocation}
          />

          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Input
              label="Latitude"
              placeholder="7.4478"
              keyboardType="numbers-and-punctuation"
              value={latitudeText}
              onChangeText={setLatitudeText}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Longitude"
              placeholder="125.8078"
              keyboardType="numbers-and-punctuation"
              value={longitudeText}
              onChangeText={setLongitudeText}
              containerStyle={{ flex: 1 }}
            />
          </View>

          {errors.coordinates ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}>
              <Ionicons name="alert-circle" size={13} color={t.colors.danger} />
              <Text variant="caption" tone="danger" style={{ flex: 1 }}>
                {errors.coordinates}
              </Text>
            </View>
          ) : null}
        </View>

        {/* --- Photo ------------------------------------------------------- */}
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="heading">Photo</Text>

          {photoUri ? (
            <View>
              <Image
                source={{ uri: photoUri }}
                accessibilityLabel="Selected listing photo"
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: t.radius.md,
                  backgroundColor: t.colors.canvasAlt,
                }}
              />
              <IconButton
                icon="close"
                label="Remove photo"
                tone="onPhoto"
                onPress={() => setPhotoUri('')}
                style={{ position: 'absolute', top: t.spacing.xs, right: t.spacing.xs }}
              />
            </View>
          ) : (
            <Card
              level="flat"
              outlined
              style={{
                borderRadius: t.radius.md,
                alignItems: 'center',
                gap: t.spacing.xxs,
                paddingVertical: t.spacing.lg,
              }}
            >
              <Ionicons name="image-outline" size={24} color={t.colors.inkFaint} />
              <Text variant="caption" tone="faint" center>
                No photo yet. Listings without one show a placeholder.
              </Text>
            </Card>
          )}

          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Button
              label="Take photo"
              icon="camera-outline"
              variant="secondary"
              onPress={handleTakePhoto}
              style={{ flex: 1 }}
            />
            <Button
              label="Choose photo"
              icon="images-outline"
              variant="secondary"
              onPress={handleChooseFromGallery}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={{ gap: t.spacing.sm }}>
          <Button
            label="Publish listing"
            icon="checkmark-circle-outline"
            size="lg"
            fullWidth
            loading={isSaving}
            onPress={handleSave}
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            disabled={isSaving}
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

// Selection shown by fill AND a tick, never colour alone.
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xxs,
        paddingHorizontal: t.spacing.sm,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        backgroundColor: selected ? t.colors.brand : t.colors.surface,
        borderWidth: 1,
        borderColor: selected ? t.colors.brand : t.colors.lineStrong,
      }}
    >
      {selected ? <Ionicons name="checkmark" size={13} color={t.colors.onBrand} /> : null}
      <Text variant="captionStrong" style={{ color: selected ? t.colors.onBrand : t.colors.inkSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}
