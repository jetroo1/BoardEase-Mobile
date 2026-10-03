// The photographs at the top of a listing, swiped through one at a time.
//
// A boarding house is not one picture. Somebody deciding whether to live
// somewhere wants the room, the CR, the kitchen and what the place looks like
// from the street, and a single hero photo lets a listing show only its best
// angle. This is where the other nine go.
//
// It degrades all the way down without a second code path: ten photos paginate
// with a counter and dots, one photo renders exactly as the old single hero
// did, and none falls through to PropertyPhoto's generated gradient. Listings
// seeded before galleries existed take the middle case, which is why nothing
// had to be migrated.

import React, { useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import PropertyPhoto from './PropertyPhoto';
import Text from './Text';

export interface PhotoGalleryProps {
  photos: string[];
  title: string;
  roomType?: string;
  height: number;
  // How much of the bottom of the gallery something else is drawn over --
  // Details slides its content sheet up over the photo to tie the two
  // together. The counter and the dots are pushed above it.
  //
  // Passed in rather than assumed, because the gallery cannot see what is
  // stacked on top of it. Leaving it to a guess is what put the counter
  // underneath the sheet: it sat 16px from the bottom of a photo whose last
  // 24px were covered, so it was sliced in half and the dots disappeared
  // entirely.
  bottomInset?: number;
}

export default function PhotoGallery({
  photos,
  title,
  roomType,
  height,
  bottomInset = 0,
}: PhotoGalleryProps) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // One photo, or none at all: no pager, no dots, nothing to swipe. Rendering
  // a single-item FlatList here would add a scroll view that swallows
  // horizontal drags for no benefit.
  if (photos.length <= 1) {
    return (
      <PropertyPhoto
        uri={photos[0]}
        title={title}
        roomType={roomType}
        height={height}
        scrim
      />
    );
  }

  return (
    <View style={{ height }}>
      <FlatList
        data={photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Told rather than measured. Without it the list guesses at offsets
        // and a fling can land between two photos.
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(event) => {
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <PropertyPhoto uri={item} title={title} roomType={roomType} height={height} scrim />
          </View>
        )}
      />

      {/* A count as well as dots. Past about six, dots stop being countable at
          a glance and stop answering "how many more are there?". */}
      <View
        style={{
          position: 'absolute',
          bottom: bottomInset + t.spacing.sm,
          right: t.spacing.md,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: t.radius.pill,
          paddingHorizontal: t.spacing.sm,
          paddingVertical: 4,
        }}
      >
        <Text variant="micro" style={{ color: '#FFFFFF' }}>
          {index + 1} / {photos.length}
        </Text>
      </View>

      {/* Sat level with the counter rather than a few pixels above it. Two
          overlays on the same baseline read as one strip; staggered, they read
          as a mistake. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: bottomInset + t.spacing.sm + 6,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {photos.map((uri, i) => (
          <View
            key={`${uri}-dot-${i}`}
            style={{
              width: i === index ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            }}
          />
        ))}
      </View>
    </View>
  );
}
