// The listing card -- the single most repeated object in the app, so it earns
// the most attention.
//
// Built to match the reference designs: the photo sits INSET inside the card
// with its own rounded corners, rather than bleeding to the card's edge. That
// one detail is most of what separates these layouts from a default list --
// the card reads as a small framed object instead of a band across the screen.
//
// Layout reasoning:
//   - The photo leads and is wide, because people choose a place to live with
//     their eyes first. A 64x64 thumbnail, which is what this used to be,
//     cannot do that job.
//   - Title and price share the top line, price right-aligned. It is the
//     number every user is actually comparing.
//   - Facts become chips, so they scan as a row rather than as a sentence.
//   - Favourite and compare float on the photo, so they never push text around.

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Property } from '../../types';
import Card from './Card';
import Pressable from './Pressable';
import PropertyPhoto from './PropertyPhoto';
import Text from './Text';
import { IconButton } from './Button';

export interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  distanceLabel?: string;
  matchScore?: number;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCompare?: () => void;
  inCompare?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PropertyCard({
  property,
  onPress,
  distanceLabel,
  matchScore,
  rating,
  reviewCount,
  isFavorite,
  onToggleFavorite,
  onCompare,
  inCompare = false,
  style,
}: PropertyCardProps) {
  const t = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${formatPeso(property.price)} per month`}
      onPress={onPress}
      style={style}
    >
      <Card
        level="medium"
        padded={false}
        style={{ padding: t.spacing.xs, borderRadius: t.radius.lg }}
      >
        <PropertyPhoto
          uri={property.imageUrl}
          title={property.title}
          roomType={property.roomType}
          height={168}
          radius={t.radius.md}
        >
          {/* The app's own recommendation, top-left, where the eye lands
              first on a left-to-right scan. */}
          {matchScore != null ? (
            <View
              style={{
                position: 'absolute',
                top: t.spacing.xs,
                left: t.spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: t.colors.surface,
                paddingHorizontal: t.spacing.xs,
                paddingVertical: 5,
                borderRadius: t.radius.pill,
              }}
            >
              <Ionicons name="sparkles" size={11} color={t.colors.brand} />
              <Text variant="micro" tone="brand">
                {matchScore}% match
              </Text>
            </View>
          ) : null}

          <View
            style={{
              position: 'absolute',
              top: t.spacing.xs,
              right: t.spacing.xs,
              gap: t.spacing.xxs,
            }}
          >
            {onToggleFavorite ? (
              <IconButton
                icon={isFavorite ? 'heart' : 'heart-outline'}
                label={
                  isFavorite
                    ? `Remove ${property.title} from saved`
                    : `Save ${property.title}`
                }
                onPress={onToggleFavorite}
                tone="onPhoto"
                size={17}
              />
            ) : null}
            {onCompare ? (
              // Deliberately NOT a plus. A "+" on a listing card reads as
              // "save this", so people tapped it expecting a shortlist and
              // got the comparison tray instead. The heart above is the save
              // action; this one has to look like comparing.
              <IconButton
                icon={inCompare ? 'git-compare' : 'git-compare-outline'}
                label={
                  inCompare
                    ? `Remove ${property.title} from compare`
                    : `Add ${property.title} to compare`
                }
                onPress={onCompare}
                tone="onPhoto"
                size={17}
              />
            ) : null}
          </View>
        </PropertyPhoto>

        <View style={{ padding: t.spacing.sm, gap: t.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.xs }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {property.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="location-outline" size={12} color={t.colors.inkFaint} />
                <Text variant="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
                  {property.address}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodyStrong" tone="brand">
                {formatPeso(property.price)}
              </Text>
              <Text variant="micro" tone="faint">
                per month
              </Text>
            </View>
          </View>

          {/* Facts as a chip row. Three at most from amenities, so the row
              stays one line and the card stays scannable. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xxs }}>
            <Fact icon="bed-outline" label={property.roomType} />
            {distanceLabel ? <Fact icon="walk-outline" label={distanceLabel} /> : null}
            {rating != null && rating > 0 ? (
              <Fact
                icon="star"
                label={`${rating.toFixed(1)}${reviewCount ? ` (${reviewCount})` : ''}`}
                starred
              />
            ) : null}
            {property.amenities.slice(0, 2).map((amenity) => (
              <Fact key={amenity} label={amenity} />
            ))}
            {property.amenities.length > 2 ? (
              <Fact label={`+${property.amenities.length - 2}`} />
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// One fact chip. Outlined rather than filled, so a row of five does not turn
// the card into a block of colour.
function Fact({
  icon,
  label,
  starred = false,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  starred?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: t.spacing.xs,
        paddingVertical: 5,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.canvasAlt,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={11}
          color={starred ? t.colors.star : t.colors.inkSoft}
        />
      ) : null}
      <Text variant="micro" tone="soft">
        {label}
      </Text>
    </View>
  );
}

// Thousands separators, no decimals. Rent is never quoted to the centavo, and
// "₱3,500" is read correctly at a glance where "₱3500" is not.
export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

export default PropertyCard;
