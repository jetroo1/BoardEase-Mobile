// What the tour actually looks like: the rest of the screen goes dark, the
// control being explained stays lit, and a message with an arrow points at it.
//
// The dark part is four rectangles, not one view with a hole in it. React
// Native has no cut-out: masking needs either a native masked view or an SVG,
// and both are a dependency and a new way for the demo to fail. Four opaque
// rectangles meeting at the edges of the target leave the target uncovered,
// which is the same picture by simpler means, and they cost nothing to draw.
//
// Not blurred, dimmed. expo-blur's Android implementation never rendered in
// this application -- the landing page went through exactly this and ended up
// solid as well. A blur that works on one platform and silently does nothing
// on the other is worse than a dim that works on both, and dimming is what
// actually does the job here: it is the contrast that moves the eye to the lit
// control, not the blur.
//
// Drawn as an absolutely positioned view at the root of the app, not as a
// Modal.
//
// A Modal looks like the obvious choice and was the first attempt, and every
// highlight came out exactly one status bar too high. A Modal opened with
// statusBarTranslucent measures its contents from the top of the *screen*,
// while measureInWindow -- which is how TourTarget reports where a control is
// -- returns coordinates relative to the *window*. On Android those two
// origins differ by the height of the status bar, so every ring sat above the
// thing it was describing: the ring for the avatar landed on the screen title,
// the ring for the heart landed in the status bar.
//
// Rendering in the same tree as the screens removes the mismatch rather than
// correcting for it. There is no constant to add, nothing that needs to know
// whether the status bar is translucent, and nothing to go wrong again on a
// phone with a differently sized one.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, useWindowDimensions, View } from 'react-native';
import { TargetRect } from '../../context/TourContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useTour } from '../../context/TourContext';
import Button from './Button';
import Pressable from './Pressable';
import Text from './Text';

const SCRIM = 'rgba(8, 18, 21, 0.82)';
// How far the lit area extends past the control itself, so the highlight
// reads as a halo around it rather than as a tight crop of it.
const PADDING = 8;
const BUBBLE_GAP = 14;
const BUBBLE_MAX_WIDTH = 340;

export function TourOverlay() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeStep, activeIndex, stepCount, getTarget, next, skip } = useTour();

  // Measured here, when the step opens, rather than reported by the control
  // when it was laid out. See the note in TourTarget.
  const rootRef = useRef<View>(null);
  const [activeRect, setActiveRect] = useState<TargetRect | null>(null);

  const targetId = activeStep?.target;

  // Both the control and this overlay are measured, and the overlay's own
  // position is subtracted from the control's.
  //
  // That subtraction is the point. measureInWindow answers in window
  // coordinates, and the overlay draws in its parent's coordinates; whether
  // those two agree depends on the status bar, the safe area and what the
  // overlay is nested in. Rather than work out the difference and hope it
  // holds on the next phone, both are measured the same way and the
  // difference cancels. If the two origins do agree, the subtraction is zero
  // and nothing changes.
  const measure = useCallback(
    (onDone: (rect: TargetRect | null) => void) => {
      const root = rootRef.current;
      const target = targetId ? getTarget(targetId) : null;
      if (!root || !target) {
        onDone(null);
        return;
      }

      root.measureInWindow((rootX, rootY) => {
        target.measureInWindow((x, y, width, height) => {
          // A view that has not been laid out measures as zero. A zero-sized
          // hole would light nothing and point nowhere, so the step falls back
          // to a centred message instead.
          if (width <= 0 || height <= 0) {
            onDone(null);
            return;
          }
          onDone({ x: x - rootX, y: y - rootY, width, height });
        });
      });
    },
    [targetId, getTarget]
  );

  // Re-measured a few times after the step opens, not once.
  //
  // A control can still be settling when its step arrives -- a screen that has
  // just pushed, an image that has just loaded and pushed the layout down, a
  // list that has not drawn its rows yet. Reading once would freeze whatever
  // happened to be true in that first frame, which is the bug this whole
  // measurement path exists to avoid. Each pass overwrites the last, so the
  // ring settles onto the control rather than guessing where it will end up.
  useEffect(() => {
    if (!targetId) {
      setActiveRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const read = () => {
      if (cancelled) return;
      measure((rect) => {
        if (cancelled) return;
        if (rect) setActiveRect(rect);
        attempts += 1;
        // Roughly a second of settling, then stop: a control that has not
        // appeared by now is not going to.
        if (attempts < 8) {
          setTimeout(read, 120);
        }
      });
    };

    setActiveRect(null);
    read();

    return () => {
      cancelled = true;
    };
  }, [targetId, measure]);
  // Reactive, so a rotation mid-tour re-places the highlight: Dimensions.get
  // is read once at render and would leave the hole where the screen used to
  // be.
  //
  // Every hook stays above the early return below. This one sat underneath it
  // at first, which meant it ran only while a tour was open -- the hook count
  // changed from one render to the next and React refused to render anything
  // at all.
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Back ends the tour instead of leaving the screen underneath it.
  //
  // A Modal did this for nothing through onRequestClose. Without one, back
  // goes to the navigator, which would walk away from the screen the tour is
  // describing and leave the overlay on display over the wrong one.
  const touring = activeStep !== null;
  useEffect(() => {
    if (!touring) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      skip();
      // Handled here; the navigator must not also act on it.
      return true;
    });
    return () => subscription.remove();
  }, [touring, skip]);

  if (!activeStep) {
    return null;
  }

  const isLast = activeIndex + 1 >= stepCount;

  // A control the person would have to scroll to reach is measured where it
  // actually is, which may be past the bottom of the display. Cutting a hole
  // there lights nothing and aims the arrow off the edge of the screen, so a
  // target that is not substantially visible is treated as no target at all:
  // the step becomes a centred message, which says the same thing without
  // pointing confidently at something nobody can see.
  const visible =
    activeRect !== null &&
    activeRect.y + activeRect.height > 0 &&
    activeRect.y < screenH - 24 &&
    activeRect.x + activeRect.width > 0 &&
    activeRect.x < screenW;

  // A step with no target, or one whose target has not reported a position,
  // becomes a centred card on a plain scrim. That is the opening and closing
  // message by design, and the honest fallback when something could not be
  // found -- better than an arrow pointing confidently at the wrong place.
  const hole =
    activeRect && visible
      ? {
          x: Math.max(0, activeRect.x - PADDING),
          y: Math.max(0, activeRect.y - PADDING),
          width: activeRect.width + PADDING * 2,
          height: activeRect.height + PADDING * 2,
        }
      : null;

  // Below the highlight if there is room, otherwise above it. Measured against
  // a generous estimate of the bubble's height rather than its real one: the
  // bubble cannot be measured before it is placed, and being wrong by a few
  // pixels is invisible, while being on the wrong side of the screen is not.
  const BUBBLE_ESTIMATE = 210;
  const roomBelow = hole ? screenH - (hole.y + hole.height) : 0;
  const placeBelow = hole ? roomBelow > BUBBLE_ESTIMATE + insets.bottom : true;

  const bubbleTop = hole
    ? placeBelow
      ? hole.y + hole.height + BUBBLE_GAP
      : undefined
    : undefined;
  const bubbleBottom = hole && !placeBelow ? screenH - hole.y + BUBBLE_GAP : undefined;

  const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, screenW - 32);
  const bubbleLeft = (screenW - bubbleWidth) / 2;

  // The arrow sits on the bubble's edge, horizontally over the middle of the
  // highlight, so it reads as coming from the message and landing on the
  // control. Clamped inside the bubble's corners, or a control near the edge
  // of the screen would push it off the end of its own bubble.
  const arrowCentre = hole ? hole.x + hole.width / 2 : screenW / 2;
  const arrowLeft = Math.min(
    bubbleLeft + bubbleWidth - 34,
    Math.max(bubbleLeft + 18, arrowCentre - 9)
  );

  return (
    <View
      ref={rootRef}
      collapsable={false}
      // Covers the tab bar as well as the screen. zIndex orders it against its
      // siblings; elevation is what Android actually honours, and the tab bar
      // carries elevation of its own, so both are set and set high.
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 24,
      }}
    >
      <View style={{ flex: 1 }}>
        {hole ? (
          <>
            {/* above */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: hole.y,
                backgroundColor: SCRIM,
              }}
            />
            {/* below */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: hole.y + hole.height,
                bottom: 0,
                backgroundColor: SCRIM,
              }}
            />
            {/* left */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: hole.y,
                width: hole.x,
                height: hole.height,
                backgroundColor: SCRIM,
              }}
            />
            {/* right */}
            <View
              style={{
                position: 'absolute',
                left: hole.x + hole.width,
                right: 0,
                top: hole.y,
                height: hole.height,
                backgroundColor: SCRIM,
              }}
            />
            {/* The ring. Without it a pale control on a dark scrim has no edge
                of its own and the lit area looks like a gap rather than a
                thing being pointed at. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: hole.x,
                top: hole.y,
                width: hole.width,
                height: hole.height,
                borderRadius: t.radius.md,
                borderWidth: 2,
                borderColor: t.colors.brand,
              }}
            />
          </>
        ) : (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: SCRIM,
            }}
          />
        )}

        <View
          style={{
            position: 'absolute',
            left: bubbleLeft,
            width: bubbleWidth,
            ...(bubbleTop !== undefined ? { top: bubbleTop } : null),
            ...(bubbleBottom !== undefined ? { bottom: bubbleBottom } : null),
            ...(bubbleTop === undefined && bubbleBottom === undefined
              ? { top: screenH / 2 - BUBBLE_ESTIMATE / 2 }
              : null),
          }}
        >
          {/* A rotated square with two of its sides hidden behind the bubble.
              Cheaper and sharper than a bordered triangle, which fringes on
              Android at anything but exact pixel sizes. */}
          {hole ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: arrowLeft - bubbleLeft,
                width: 18,
                height: 18,
                backgroundColor: t.colors.surface,
                transform: [{ rotate: '45deg' }],
                ...(placeBelow ? { top: -8 } : { bottom: -8 }),
              }}
            />
          ) : null}

          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.lg,
              padding: t.spacing.md,
              gap: t.spacing.sm,
              ...t.elevation.high,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: t.colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="bulb-outline" size={15} color={t.colors.brand} />
              </View>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {activeStep.title}
              </Text>
              <Text variant="micro" tone="faint">
                {activeIndex + 1} of {stepCount}
              </Text>
            </View>

            <Text variant="caption" tone="soft">
              {activeStep.body}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
              {/* Skip stays available on every step, including the last.
                  A tour you cannot leave is a dialog. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip the tour"
                onPress={skip}
                hitSlop={8}
                style={{ paddingVertical: 6, paddingRight: t.spacing.sm }}
              >
                <Text variant="captionStrong" tone="faint">
                  Skip
                </Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Button
                label={isLast ? 'Got it' : 'Next'}
                icon={isLast ? 'checkmark' : 'arrow-forward'}
                iconPosition="right"
                size="md"
                onPress={next}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default TourOverlay;
