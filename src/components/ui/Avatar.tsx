// The signed-in person's picture, and what stands in for it when there isn't
// one.
//
// The placeholder is an initial on a tinted disc rather than a generic person
// glyph. A glyph is the same for everybody, so a screen showing it says
// nothing; an initial at least belongs to the account looking at it, and makes
// the difference between "no picture set" and "not signed in" visible at a
// glance.
//
// A URL that 404s falls back to the same placeholder. Cloudinary links are
// durable, but a picture that fails to load must not leave a hole where a face
// should be.

import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

export interface AvatarProps {
  uri?: string | null;
  // What the placeholder takes its initial from. The email is what every
  // account has.
  name?: string | null;
  size?: number;
  // Shows a spinner over the picture while a new one is uploading.
  busy?: boolean;
  // Draws the small camera disc at the bottom-right that says this can be
  // changed. Off by default, because most places that show an avatar only
  // display it.
  editable?: boolean;
}

export function Avatar({ uri, name, size = 52, busy = false, editable = false }: AvatarProps) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);

  // Reset the failure when a new picture arrives, otherwise replacing a broken
  // URL with a good one would keep showing the placeholder.
  const [lastUri, setLastUri] = useState(uri);
  if (uri !== lastUri) {
    setLastUri(uri);
    setFailed(false);
  }

  const showPhoto = Boolean(uri) && !failed;
  const initial = (name ?? '').trim().charAt(0).toUpperCase();
  const badge = Math.round(size * 0.34);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: t.colors.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showPhoto ? (
          <Image
            source={{ uri: uri as string }}
            accessibilityLabel="Profile picture"
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
            onError={() => setFailed(true)}
          />
        ) : initial ? (
          <Text
            variant="title"
            style={{ color: t.colors.brand, fontSize: Math.round(size * 0.4), lineHeight: undefined }}
          >
            {initial}
          </Text>
        ) : (
          <Ionicons name="person" size={Math.round(size * 0.46)} color={t.colors.brand} />
        )}

        {busy ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {editable ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: t.colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            // The ring is the canvas colour, not a grey, so the badge reads as
            // sitting on the page rather than having its own outline.
            borderWidth: 2,
            borderColor: t.colors.surface,
          }}
        >
          <Ionicons name="camera" size={Math.round(badge * 0.5)} color={t.colors.onBrand} />
        </View>
      ) : null}
    </View>
  );
}

export default Avatar;
