// The listing form: one screen that both creates a boarding house listing and
// edits an existing one, straight from the phone. It collects the details,
// lets the admin place the location (drop a pin on the map, take the phone's
// GPS, or type the coordinates), lets them select up to six photographs from
// their phone (or add a public link), and writes the result to the Firestore
// "properties" collection -- adding a document, or updating one.
//
// Create and edit are the same screen because they are the same fields. Two
// screens would be two copies of this form, and the copies would drift: a
// field added to one, a validation rule fixed in the other.
//
// Which one it is comes from route.params.propertyId, and nothing else
// branches on it beyond loading, the button label and add-versus-update.
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

import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { requestLocation } from '../utils/locationAccess';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { RootStackParamList } from '../navigation/types';
import { photosOf } from '../utils/photos';
import { uploadListingPhoto } from '../utils/photoUpload';
import { setCallback } from '../utils/navigationCallbacks';
import { GUTTER } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Pressable,
  Screen,
  Skeleton,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddListingRouteProp = RouteProp<RootStackParamList, 'AddListing'>;

// The same option lists the Filter screen uses, so what an admin can create
// always matches what a tenant can search for.
const ROOM_TYPE_OPTIONS = ['Single', 'Shared', 'Studio'];
const AMENITY_OPTIONS = ['WiFi', 'CR', 'Parking', 'Aircon', 'Kitchen', 'Laundry'];

// How many photographs one listing can carry.
//
// Six is enough for the room, the CR, the kitchen, the frontage and a few
// angles besides, without making a listing gallery slow to scan.
const MAX_PHOTOS = 6;

// Not enforced -- a listing with one photo still publishes. It is a nudge
// shown while the count is below it, because the difference between one
// photograph and five is most of what makes a listing useful.
const SUGGESTED_PHOTOS = 5;

interface FieldErrors {
  title?: string;
  address?: string;
  price?: string;
  coordinates?: string;
  photoUrl?: string;
}

export default function AddListingScreen() {
  const t = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddListingRouteProp>();
  const { user, role } = useAuth();

  // Editing an existing listing, or creating a new one. Everything below
  // branches on this one value rather than on a second screen.
  const propertyId = route.params?.propertyId;
  const isEditing = !!propertyId;

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
  // Public HTTPS image URLs. The first link is the cover on cards and the map.
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');

  // The coordinates as a point, when the two fields currently hold a usable
  // pair. The map picker opens on it so reopening the map returns you to the
  // pin you already placed instead of starting over. Half-typed or nonsense
  // input simply reads as "nothing chosen yet".
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const pickedPoint =
    latitudeText.trim() !== ''
    && longitudeText.trim() !== ''
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
      ? { lat: latitude, lng: longitude }
      : undefined;

  // Loading the listing being edited. A brand-new listing has nothing to load,
  // so it starts ready.
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!propertyId) {
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingExisting(true);
      setLoadError('');
      try {
        const snapshot = await getDoc(doc(db, 'properties', propertyId));
        if (cancelled) {
          return;
        }
        if (!snapshot.exists()) {
          setLoadError('That listing no longer exists.');
          return;
        }
        const existing = { id: snapshot.id, ...(snapshot.data() as Omit<Property, 'id'>) };
        setTitle(existing.title ?? '');
        setDescription(existing.description ?? '');
        setAddress(existing.address ?? '');
        setPriceText(existing.price != null ? String(existing.price) : '');
        setRoomType(existing.roomType || 'Single');
        setAmenities(existing.amenities ?? []);
        setLatitudeText(existing.latitude != null ? String(existing.latitude) : '');
        setLongitudeText(existing.longitude != null ? String(existing.longitude) : '');
        // Existing gallery URLs stay in their saved order, with the first one
        // continuing to be the cover image.
        setPhotoUris(photosOf(existing));
      } catch {
        if (!cancelled) {
          setLoadError('Could not load that listing. Check your connection.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExisting(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLocating, setIsLocating] = useState(false); // true while the GPS is working
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  // Which photo of how many is going up, so picking five does not look like a
  // frozen button while they upload one at a time.
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      // The explanation and the Settings route are handled in one place; this
      // screen only has to say what to do instead when there is no position.
      const located = await requestLocation('pin');
      if (!located.ok) {
        if (located.reason !== 'declined') {
          Alert.alert(
            'Could not read your position',
            'Type the latitude and longitude by hand instead.'
          );
        }
        return;
      }

      setLatitudeText(String(located.coords.lat));
      setLongitudeText(String(located.coords.lng));
      setErrors((current) => ({ ...current, coordinates: undefined }));
    } catch {
      Alert.alert('Could not get location', 'Please type the coordinates instead.');
    } finally {
      setIsLocating(false);
    }
  }

  function handleAddPhotoLink() {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('That is enough photos', `A listing can hold ${MAX_PHOTOS}.`);
      return;
    }

    const candidate = photoUrl.trim();
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error('invalid');
      }
    } catch {
      setErrors((current) => ({
        ...current,
        photoUrl: 'Enter a public HTTPS image link.',
      }));
      return;
    }

    if (photoUris.includes(candidate)) {
      setErrors((current) => ({ ...current, photoUrl: 'This photo link is already added.' }));
      return;
    }

    setPhotoUris((current) => [...current, candidate]);
    setPhotoUrl('');
    setErrors((current) => ({ ...current, photoUrl: undefined }));
  }

  // Uploads what was just picked or taken, and puts the resulting links on the
  // listing. Shared by the camera and the gallery because the only difference
  // between them is where the file came from.
  //
  // Whatever uploaded before a failure is kept. Losing four good photographs
  // because the fifth timed out would mean starting the whole set again.
  async function uploadAndAppend(assets: { uri: string; mimeType?: string | null }[]) {
    setIsUploadingPhotos(true);
    const uploaded: string[] = [];
    try {
      for (const asset of assets) {
        setUploadProgress({ done: uploaded.length, total: assets.length });
        uploaded.push(await uploadListingPhoto(asset.uri, asset.mimeType ?? undefined));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Could not upload photo', message);
    } finally {
      if (uploaded.length > 0) {
        setPhotoUris((current) => [...current, ...uploaded].slice(0, MAX_PHOTOS));
      }
      setUploadProgress(null);
      setIsUploadingPhotos(false);
    }
  }

  // Photograph the place while standing in front of it. The reason an admin
  // has a phone in their hand at all.
  async function handleTakePhoto() {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('That is enough photos', `A listing can hold ${MAX_PHOTOS}.`);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access to photograph a boarding house from this phone.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      // Base64 inflates a photo by about a third on the wire, and percent-
      // encoding it inflates it again, so a 12-megapixel phone photo at 0.8
      // can approach the free tier's per-image ceiling. 0.6 is still well
      // beyond what a listing card or a phone gallery can show.
      quality: 0.6,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }
    await uploadAndAppend(result.assets);
  }

  async function handleChoosePhotos() {
    const availableSlots = MAX_PHOTOS - photoUris.length;
    if (availableSlots <= 0) {
      Alert.alert('That is enough photos', `A listing can hold ${MAX_PHOTOS}.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo access to add boarding house pictures from this phone.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
      // Base64 inflates a photo by about a third on the wire, and percent-
      // encoding it inflates it again, so a 12-megapixel phone photo at 0.8
      // can approach the free tier's per-image ceiling. 0.6 is still well
      // beyond what a listing card or a phone gallery can show.
      quality: 0.6,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }
    await uploadAndAppend(result.assets.slice(0, availableSlots));
  }

  function removePhoto(index: number) {
    setPhotoUris((current) => current.filter((_, i) => i !== index));
  }

  // Promotes a photo to the front, which is what makes it the cover. Simpler
  // than drag-to-reorder and covers the only reordering anybody actually wants
  // here: "no, use THAT one on the card".
  function makeCover(index: number) {
    setPhotoUris((current) => {
      if (index <= 0 || index >= current.length) {
        return current;
      }
      const next = [...current];
      const [chosen] = next.splice(index, 1);
      return [chosen, ...next];
    });
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

  // Writes public image URLs directly into the listing document. Image files
  // remain with the host that supplied each URL, so this needs no Storage bucket.
  async function saveListing(images: string[]) {
    if (!user) return;

    setIsSaving(true);
    try {
      // The fields the form owns. Everything else on the document -- who
      // created it, when, whether it is approved -- belongs to the listing's
      // history and is deliberately not in here, so editing cannot silently
      // reset it.
      const fields = {
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        price: Number(priceText),
        roomType,
        amenities,
        latitude: Number(latitudeText),
        longitude: Number(longitudeText),
        images,
        imageUrl: images[0] ?? '',
      };

      if (propertyId) {
        await updateDoc(doc(db, 'properties', propertyId), fields);
        Alert.alert('Listing updated', 'Your changes are live in the app.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // images and imageUrl are both written, on purpose. images is the
      // gallery; imageUrl repeats its first entry because every card, marker
      // popup and offline cache in the app already reads imageUrl, and the
      // listings seeded before galleries existed have nothing else. Writing
      // only images would leave new listings blank everywhere except the
      // details screen.
      await addDoc(collection(db, 'properties'), {
        ...fields,
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
    if (!user || isSaving || isUploadingPhotos) return;

    const found = validateForm();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    await saveListing(photoUris);
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

  // Editing, and the listing has not arrived yet. Showing the empty form first
  // and filling it in a moment later would look like the fields were clearing
  // themselves.
  if (isLoadingExisting) {
    return (
      <Screen edges={false}>
        <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.sm }}>
          <Skeleton height={56} radius={t.radius.md} />
          <Skeleton height={56} radius={t.radius.md} />
          <Skeleton height={120} radius={t.radius.md} />
          <Skeleton height={180} radius={t.radius.md} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen edges={false}>
        <ErrorState message={loadError} onRetry={() => navigation.goBack()} />
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

          {/* Two ways in, because there are two situations. Standing at the
              gate, the GPS is the accurate one. Anywhere else -- adding a
              house you visited last week, or fixing one that was put in the
              wrong street -- you need to look at the map and point at it. */}
          <Button
            label="Drop a pin on the map"
            icon="map-outline"
            fullWidth
            onPress={() => {
              setCallback<{ lat: number; lng: number }>('pickLocation', (point) => {
                setLatitudeText(String(point.lat));
                setLongitudeText(String(point.lng));
                setErrors((c) => ({ ...c, coordinates: undefined }));
              });
              navigation.navigate('PickLocation', { initial: pickedPoint });
            }}
          />

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

        {/* --- Photos ------------------------------------------------------ */}
        <View style={{ gap: t.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
            <Text variant="heading" style={{ flex: 1 }}>Photos</Text>
            <Text variant="caption" tone="faint">{photoUris.length} of {MAX_PHOTOS}</Text>
          </View>
          <Text variant="caption" tone="faint">
            Choose from this phone, or add a public link. The first photo is shown on the listing card and map.
          </Text>

          {photoUris.length > 0 ? (
            <>
              {/* The cover, big, because it is the one that does the work. */}
              <View>
                <Image
                  source={{ uri: photoUris[0] }}
                  accessibilityLabel="Cover photo for this listing"
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: t.radius.md,
                    backgroundColor: t.colors.canvasAlt,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: t.spacing.xs,
                    top: t.spacing.xs,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.spacing.sm,
                    paddingVertical: 4,
                  }}
                >
                  <Text variant="micro" uppercase style={{ color: '#FFFFFF' }}>Cover</Text>
                </View>
                <IconButton
                  icon="close"
                  label="Remove the cover photo"
                  tone="onPhoto"
                  onPress={() => removePhoto(0)}
                  style={{ position: 'absolute', top: t.spacing.xs, right: t.spacing.xs }}
                />
              </View>

              {/* The rest stay in a compact row so the Publish button remains
                  reachable even with a full gallery. */}
              {photoUris.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: t.spacing.sm, paddingVertical: 2 }}
                >
                  {photoUris.slice(1).map((uri, index) => (
                    <View key={`${uri}-${index}`}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Make photo ${index + 2} the cover`}
                        onPress={() => makeCover(index + 1)}
                      >
                        <Image
                          source={{ uri }}
                          accessibilityLabel={`Listing photo ${index + 2}`}
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: t.radius.sm,
                            backgroundColor: t.colors.canvasAlt,
                          }}
                        />
                      </Pressable>
                      <IconButton
                        icon="close"
                        label={`Remove photo ${index + 2}`}
                        tone="onPhoto"
                        size={14}
                        onPress={() => removePhoto(index + 1)}
                        style={{ position: 'absolute', top: 4, right: 4 }}
                      />
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {photoUris.length > 1 ? (
                <Text variant="micro" tone="faint">
                  Tap any of the smaller photos to make it the cover.
                </Text>
              ) : null}

              {photoUris.length < SUGGESTED_PHOTOS ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs }}>
                  <Ionicons name="information-circle-outline" size={13} color={t.colors.inkFaint} />
                  <Text variant="caption" tone="faint" style={{ flex: 1 }}>
                    {SUGGESTED_PHOTOS} or more gives people enough to judge the place.
                  </Text>
                </View>
              ) : null}
            </>
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
                No photos yet. Listings without one show a placeholder.
              </Text>
            </Card>
          )}

          {/* Two sources, because there are two situations: standing at the
              gate with the place in front of you, and sorting out photographs
              you already took. */}
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Button
              label="Take photo"
              icon="camera-outline"
              variant="secondary"
              loading={isUploadingPhotos}
              disabled={isUploadingPhotos || photoUris.length >= MAX_PHOTOS}
              onPress={handleTakePhoto}
              style={{ flex: 1 }}
            />
            <Button
              label={
                uploadProgress
                  ? `Uploading ${uploadProgress.done + 1} of ${uploadProgress.total}…`
                  : 'Choose photos'
              }
              icon="images-outline"
              variant="secondary"
              loading={isUploadingPhotos}
              disabled={isUploadingPhotos || photoUris.length >= MAX_PHOTOS}
              onPress={handleChoosePhotos}
              style={{ flex: 1 }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-end' }}>
            <Input
              label="Public photo link"
              placeholder="https://example.com/boarding-house.jpg"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={photoUrl}
              onChangeText={(value) => {
                setPhotoUrl(value);
                setErrors((current) => ({ ...current, photoUrl: undefined }));
              }}
              error={errors.photoUrl}
              containerStyle={{ flex: 1 }}
            />
            <Button
              label="Add link"
              icon="link-outline"
              variant="secondary"
              disabled={isUploadingPhotos || photoUris.length >= MAX_PHOTOS}
              onPress={handleAddPhotoLink}
            />
          </View>
        </View>

        <View style={{ gap: t.spacing.sm }}>
          <Button
            label={isEditing ? 'Save changes' : 'Publish listing'}
            icon="checkmark-circle-outline"
            size="lg"
            fullWidth
            loading={isSaving || isUploadingPhotos}
            disabled={isUploadingPhotos}
            onPress={handleSave}
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            disabled={isSaving || isUploadingPhotos}
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
