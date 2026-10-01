// A search field that answers while you type.
//
// The home screen used to show something that looked like a search box and was
// actually a button: tapping it took you to another screen, where you typed,
// and only then saw anything. Two taps and a screen change before the first
// result. This is the box it pretended to be -- type "L" and La Garbosa is
// there, with no Enter and no navigation.
//
// Matching is deliberately not "contains". Somebody typing "la" means a place
// whose name begins with "la"; they do not mean every listing with "la"
// somewhere in the middle of a word. So a match at the start of the name or of
// any word in it ranks first, and a loose match anywhere is kept but ranked
// below, which is what makes the first suggestion usually the right one.

import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Property } from '../../types';
import { coverOf } from '../../utils/photos';
import { searchListings } from '../../utils/search';
import Pressable from './Pressable';
import PropertyPhoto from './PropertyPhoto';
import Text from './Text';
import { formatPeso } from './PropertyCard';

export interface ListingSearchBarProps {
  listings: Property[];
  onSelect: (property: Property) => void;
  // Called when the person wants the full results screen rather than one of
  // the suggestions -- pressing search on the keyboard, or tapping "See all".
  onSubmit?: (term: string) => void;
  placeholder?: string;
  maxSuggestions?: number;
}

// Just the field, with no suggestion list under it.
//
// For the Search screen, where the results are already on screen and filter
// themselves as you type. A dropdown there would cover the very list it is
// describing.
export function SearchField({
  value,
  onChange,
  placeholder = 'Search by name or barangay',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: focused ? t.colors.brand : t.colors.line,
        paddingHorizontal: t.spacing.md,
        height: 44,
      }}
    >
      <Ionicons name="search" size={17} color={focused ? t.colors.brand : t.colors.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={t.colors.inkFaint}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={[t.type.body, { flex: 1, color: t.colors.ink, paddingVertical: 0 }]}
      />
      {value !== '' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={17} color={t.colors.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ListingSearchBar({
  listings,
  onSelect,
  onSubmit,
  placeholder = 'Search boarding houses',
  maxSuggestions = 6,
}: ListingSearchBarProps) {
  const t = useTheme();
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (term.trim() === '') {
      return [];
    }
    return searchListings(listings, term).slice(0, maxSuggestions);
  }, [listings, term, maxSuggestions]);

  // Shown only while the field is in use. Leaving the list up after a
  // selection would cover the screen you just asked to see.
  const showSuggestions = focused && term.trim() !== '';

  return (
    <View style={{ gap: t.spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.pill,
          borderWidth: 1,
          borderColor: focused ? t.colors.brand : t.colors.line,
          paddingHorizontal: t.spacing.md,
          height: 48,
          ...t.elevation.low,
        }}
      >
        <Ionicons name="search" size={18} color={focused ? t.colors.brand : t.colors.inkFaint} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          onFocus={() => setFocused(true)}
          // Delayed, because a tap on a suggestion blurs the field first and
          // an immediate hide would unmount the row before it registers.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          placeholderTextColor={t.colors.inkFaint}
          returnKeyType="search"
          autoCorrect={false}
          onSubmitEditing={() => onSubmit?.(term.trim())}
          accessibilityLabel={placeholder}
          style={[
            t.type.body,
            {
              flex: 1,
              color: t.colors.ink,
              // Android gives a TextInput generous built-in padding that pushes
              // the text off-centre inside a fixed-height pill.
              paddingVertical: 0,
            },
          ]}
        />
        {term !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setTerm('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={t.colors.inkFaint} />
          </Pressable>
        ) : null}
      </View>

      {showSuggestions ? (
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.line,
            overflow: 'hidden',
            ...t.elevation.medium,
          }}
        >
          {suggestions.length === 0 ? (
            <View style={{ padding: t.spacing.md, gap: 2 }}>
              <Text variant="captionStrong">No match for “{term.trim()}”</Text>
              <Text variant="caption" tone="faint">
                Try part of the name, or the barangay.
              </Text>
            </View>
          ) : (
            suggestions.map((property, index) => (
              <Pressable
                key={property.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${property.title}`}
                animate={false}
                onPress={() => {
                  setTerm('');
                  setFocused(false);
                  onSelect(property);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.sm,
                  padding: t.spacing.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: t.colors.line,
                }}
              >
                <PropertyPhoto
                  uri={coverOf(property)}
                  title={property.title}
                  roomType={property.roomType}
                  height={40}
                  radius={t.radius.sm}
                  style={{ width: 40 }}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="captionStrong" numberOfLines={1}>{property.title}</Text>
                  <Text variant="micro" tone="faint" numberOfLines={1}>{property.address}</Text>
                </View>
                <Text variant="captionStrong" tone="brand">{formatPeso(property.price)}</Text>
              </Pressable>
            ))
          )}

          {onSubmit && suggestions.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all results"
              animate={false}
              onPress={() => {
                const submitted = term.trim();
                setFocused(false);
                onSubmit(submitted);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.spacing.xxs,
                paddingVertical: t.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: t.colors.line,
                backgroundColor: t.colors.canvasAlt,
              }}
            >
              <Text variant="captionStrong" tone="brand">See all results</Text>
              <Ionicons name="arrow-forward" size={14} color={t.colors.brand} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
