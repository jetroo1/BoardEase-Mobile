// A listing's photo -- and, when there isn't one, something better than the
// grey "No Photo" box the old build showed.
//
// This matters more than it sounds. The card design is photo-led, so a missing
// image is not a small cosmetic gap: it decides whether the whole screen looks
// finished. Owner-submitted listings can always arrive without a picture, so
// the fallback is permanent furniture, not a stopgap.
//
// The fallback derives its gradient from the listing's own title, so the same
// house is always the same colour -- it reads as a chosen identity rather than
// a random blank.

import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

// Warm, editorial pairs that sit comfortably beside the teal brand without
// competing with it.
const FALLBACK_GRADIENTS: [string, string][] = [
  ['#2C6E7F', '#17414D'],
  ['#8A5A3B', '#5C3A25'],
  ['#4C6B52', '#2E4433'],
  ['#7A5470', '#4D3448'],
  ['#3F5A7D', '#27384E'],
  ['#8A6A3B', '#5A4526'],
];

// Same title -> same gradient, every time.
function gradientFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

const ROOM_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Single: 'bed-outline',
  Shared: 'people-outline',
  Studio: 'home-outline',
};

export interface PropertyPhotoProps {
  uri?: string;
  title: string;
  roomType?: string;
  height: number;
  radius?: number;
  // Darkens the lower half so text laid over the photo stays readable
  // whatever the picture happens to be.
  scrim?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PropertyPhoto({
  uri,
  title,
  roomType,
  height,
  radius: r,
  scrim = false,
  style,
  children,
}: PropertyPhotoProps) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(uri));

  // A URL that 404s has to fall through to the placeholder too, otherwise the
  // card shows a blank hole -- worse than never having tried.
  const showPhoto = Boolean(uri) && !failed;
  const [from, to] = gradientFor(title);

  return (
    <View
      style={[
        {
          height,
          borderRadius: r ?? 0,
          overflow: 'hidden',
          backgroundColor: t.colors.canvasAlt,
        },
        style,
      ]}
    >
      {showPhoto ? (
        <>
          <Image
            source={{ uri }}
            accessibilityLabel={`Photo of ${title}`}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
          />
          {loading ? (
            <View
              style={{
                ...StyleSheetAbsoluteFill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.skeleton,
              }}
            >
              <ActivityIndicator size="small" color={t.colors.inkFaint} />
            </View>
          ) : null}
        </>
      ) : (
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Ionicons
            name={(roomType && ROOM_ICONS[roomType]) || 'home-outline'}
            size={height > 120 ? 30 : 20}
            color="rgba(255,255,255,0.9)"
          />
          {height > 120 ? (
            <Text variant="micro" uppercase style={{ color: 'rgba(255,255,255,0.75)' }}>
              No photo yet
            </Text>
          ) : null}
        </LinearGradient>
      )}

      {scrim ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.45, 1]}
          style={StyleSheetAbsoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {children}
    </View>
  );
}

// Inlined rather than importing StyleSheet just for this one constant.
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export default PropertyPhoto;
