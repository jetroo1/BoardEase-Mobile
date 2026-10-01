// Landing screen: the first thing anyone sees, before they have an account.
//
// This screen has one job. Somebody opening BoardEase for the first time has no
// idea what it is, whether it costs anything, or whether it covers the area
// they are moving to. If they have to sign up to find that out, most will not.
// So the whole proposition is answered here, above the Get started button:
// what it does, how it ranks, where it covers, and -- said plainly rather than
// discovered later -- what it deliberately does not do.
//
// Written once and rendered by React Native, so iOS and Android get the same
// screen from the same file.
//
// On the motion and the glass, which are the parts most likely to be ripped out
// later by someone who thinks they are decoration:
//
//   - The hero moves at half the speed of the page and grows when you pull
//     down. That parallax is what makes a phone screen feel like it has depth
//     rather than being a scrolling document.
//   - The top bar and the section tabs are blurred translucency, not opaque
//     bars. Content passing underneath is what makes them read as glass; an
//     opaque bar would simply hide it.
//   - Sections rise and fade as they are reached, staggered, so the eye is led
//     down the page instead of meeting all of it at once.
//   - The tabs appear only once the hero is behind you, and track the section
//     you are in. Before that they would be pointing at content already on
//     screen.
//
// Everything else comes from the design system: no raw colours, sizes or
// spacings, so it follows the theme into dark mode with no second code path.
// The exceptions are the scrim and the glass, which need alpha by definition.

import React, { useCallback, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  runOnJS,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { Button, Pressable, Screen, Text, ThemeToggle } from '../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_HEIGHT = 380;
const TAB_BAR_HEIGHT = 52;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

type Icon = keyof typeof Ionicons.glyphMap;

// The four steps the application is built around -- the same four the ranking,
// the map and the route guide implement. If one is ever dropped, this list is
// wrong and has to change with it.
const STEPS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: 'locate-outline',
    title: 'Find',
    body: 'Reads where you are and lists the boarding houses around you, nearest first.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Rank',
    body: 'Scores every listing out of 100 on distance, your budget and the amenities you need.',
  },
  {
    icon: 'git-compare-outline',
    title: 'Compare',
    body: 'Puts two or three side by side on price, room type, distance, rating and amenities.',
  },
  {
    icon: 'navigate-outline',
    title: 'Navigate',
    body: 'Draws a walking route along real roads and follows you along it, step by step.',
  },
];

const FEATURES: { icon: Icon; label: string; body: string }[] = [
  { icon: 'map-outline', label: 'Price on every pin', body: 'The map shows the monthly rent on the marker itself.' },
  { icon: 'options-outline', label: 'Filters that rank', body: 'Price, room type and amenities feed the score, not just the list.' },
  { icon: 'heart-outline', label: 'A shortlist that keeps', body: 'Save what you like and come back to it on any device.' },
  { icon: 'star-outline', label: 'Reviews from tenants', body: 'Ratings written by people who actually stayed there.' },
  { icon: 'cloud-offline-outline', label: 'Works without signal', body: 'Saved listings stay readable when the connection drops.' },
  { icon: 'moon-outline', label: 'Light and dark', body: 'Follows your phone, or set it yourself.' },
];

const STATS: { value: string; label: string }[] = [
  { value: '100', label: 'Match score' },
  { value: '3 km', label: 'Search radius' },
  { value: 'Free', label: 'To use' },
];

// The sticky tabs. Each one scrolls to its section -- they are a table of
// contents for a long page, not settings.
//
// "Coverage" was the third label and nobody could tell what it meant from the
// word alone. A one-word tab has to survive without its section around it.
const SECTIONS = ['How it works', 'What you get', 'Where'] as const;

// ---------------------------------------------------------------------------
// Glass
// ---------------------------------------------------------------------------
//
// One wrapper so every translucent surface in the screen is built the same way.
//
// Two kinds of surface, because they sit on different things:
//
//   'panel'   -- the top bar, the tabs and the stats card. These sit over the
//                page, and the words underneath must not be readable through
//                them or the bar looks like a rendering fault rather than a
//                bar. That is exactly what happened on Android: the blur never
//                arrived and the feature cards showed straight through the
//                header. So on Android a panel is an opaque surface with a
//                hairline, and only iOS -- where UIVisualEffectView is real --
//                gets the blur.
//   'onPhoto' -- the pill sitting on the hero photograph. A solid fill there
//                would be a white lozenge, so it stays a dark scrim with white
//                type on it, which is legible over any photograph.
//
// Android's experimental blur (dimezisBlurView) is deliberately not used. It
// renders inconsistently across devices and in Expo Go, and a header you can
// read the page through is worse than one that is simply solid.

function Glass({
  children,
  style,
  radius = 0,
  variant = 'panel',
}: {
  // Optional, because the bar behind the header is glass with nothing in it.
  children?: React.ReactNode;
  style?: object;
  radius?: number;
  variant?: 'panel' | 'onPhoto';
}) {
  const t = useTheme();

  if (variant === 'onPhoto') {
    return (
      <View
        style={[
          {
            overflow: 'hidden',
            borderRadius: radius,
            backgroundColor: 'rgba(0,0,0,0.38)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.28)',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // The blur is a layer behind the content rather than a wrapper around it, so
  // both platforms lay out identically: one view, the caller's style on it,
  // children inside. Wrapping in a BlurView instead meant a `flex: 1` passed
  // by the caller landed on the blur and not on the row inside it, and the tab
  // strip lost its vertical centring on iOS only.
  const ios = Platform.OS === 'ios';
  return (
    <View
      style={[
        {
          overflow: 'hidden',
          borderRadius: radius,
          borderWidth: 1,
          borderColor: t.colors.line,
          backgroundColor: ios
            ? 'transparent'
            : t.isDark ? 'rgba(18,26,29,0.92)' : 'rgba(255,255,255,0.94)',
        },
        style,
      ]}
    >
      {ios ? (
        <>
          <BlurView
            intensity={28}
            tint={t.isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: t.isDark
                  ? 'rgba(18,26,29,0.55)'
                  : 'rgba(255,255,255,0.62)',
              },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

// The page's own background, behind everything and not scrolling with it.
//
// Without it the canvas is one flat colour from top to bottom, which is what
// made both themes look unfinished -- dark mode especially, where near-black
// cards on a near-black page have almost nothing between them. Three
// full-bleed gradients give the page a light source without giving it an edge.
//
// Full-bleed is the whole trick. Anything narrower than the display has sides,
// and a tinted shape with visible sides on a plain background reads as a
// mistake. These run wall to wall and fade out along one axis only, so there
// is no boundary anywhere for the eye to catch.
function Backdrop() {
  const t = useTheme();
  // The saturated brand and accent, not their pale tints. The cards on top are
  // translucent, so this is what shows through them -- a tint of a tint shows
  // through as nothing at all, and the glass looks like plain white again.
  //
  // Dark mode carries more of it: the same wash that is plainly visible on an
  // off-white canvas all but disappears against near-black.
  const strong = t.isDark ? 0.26 : 0.13;
  const soft = t.isDark ? 0.16 : 0.07;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[t.colors.brand, 'transparent']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.85, y: 0.75 }}
        style={[StyleSheet.absoluteFill, { opacity: strong }]}
      />
      <LinearGradient
        colors={['transparent', t.colors.accent]}
        start={{ x: 1, y: 0.3 }}
        end={{ x: 0.15, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: soft }]}
      />
      <LinearGradient
        colors={['transparent', 'transparent', t.colors.brand]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: strong }]}
      />
    </View>
  );
}

// A section with its own tint running wall to wall behind it.
//
// The first version of this had a hairline along its top and bottom edge. Two
// horizontal rules crossing the display mid-scroll are exactly what made the
// page look like it was assembled from mismatched pieces: you never see the
// band as a whole, only a line arriving and a line leaving. So it has no edges
// at all now -- the tint fades up out of the page and back down into it, and
// there is never a moment where something starts.
function Band({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  const t = useTheme();
  return (
    <View
      onLayout={onLayout}
      style={{
        marginHorizontal: -GUTTER,
        paddingHorizontal: GUTTER,
        paddingVertical: t.spacing.xl,
        gap: t.spacing.sm,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', t.colors.brandSoft, t.colors.brandSoft, 'transparent']}
        locations={[0, 0.22, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: t.isDark ? 0.5 : 0.7 }]}
      />
      {children}
    </View>
  );
}

// The translucent surface every card on this page sits on.
//
// Android cannot blur a view, so "glass" here is not a blur -- it is a pale
// translucent fill with a bright hairline on it, over a background with enough
// colour in it to show through. That reads as glass at a glance and, unlike
// the real thing, renders identically on both platforms and costs nothing.
//
// The alpha is the whole judgement. Too transparent and body text sits on
// whatever gradient happens to be behind it, which is unreadable; too opaque
// and it is just a white card again. These two values are the point where the
// tint is still visible through the card but the type is not fighting it.
function useGlassCard() {
  const t = useTheme();
  return t.isDark
    ? {
      backgroundColor: 'rgba(255,255,255,0.055)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    }
    : {
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.85)',
    };
}

// ---------------------------------------------------------------------------

export default function LandingScreen() {
  const navigation = useNavigation<Nav>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const glass = useGlassCard();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const [activeSection, setActiveSection] = useState(0);

  // Whether the tab bar has slid into place.
  //
  // This is not cosmetic. The tabs are laid out below the header and animated
  // up behind it, so while they are hidden they sit exactly on top of the
  // theme toggle. An opacity of 0 does not stop a view receiving touches on
  // Android, so the invisible tab strip was swallowing every tap on the
  // sun/moon button. The bar only accepts touches once it is actually shown.
  const [tabsShown, setTabsShown] = useState(false);

  // Where each section starts inside the scroll view, measured as it lays out
  // rather than guessed at build time.
  //
  // onLayout reports a child's position within its own parent, so a section's y
  // is relative to the padded column it sits in, not to the page. Adding the
  // hero height alone was wrong by the height of everything between -- the
  // stats card, its negative margin, the column's own padding. The column
  // reports its own offset and the two are added.
  //
  // The raw y is what gets stored, and the column's offset is added when it is
  // read. Adding it at write time made the result depend on which onLayout
  // fired first, and children report before their parent does -- so every
  // section was recorded short by the height of the hero above it.
  const offsets = useRef<number[]>([0, 0, 0]);
  const columnTop = useRef(0);
  const setSectionOffset = (index: number, y: number) => {
    offsets.current[index] = y;
  };
  const sectionTop = (index: number) => columnTop.current + offsets.current[index];

  // Which section the page is showing. Called from the scroll handler as it
  // runs, not only when the scroll ends -- waiting for the end left the
  // highlight pointing at a section that had long since scrolled past.
  const updateActiveSection = useCallback((y: number, atEnd: boolean) => {
    // The last section could never win this comparison.
    //
    // There is not a screenful of page below "Where it covers", so scrolling
    // to put its top under the tab bar is further than the page can go. The
    // ScrollView clamps at the bottom, the probe stops short of the section,
    // and the tab stayed dark however hard you pressed it -- while the first
    // two, which have plenty below them, worked. Reaching the bottom of the
    // page means you are in the last section, whatever the arithmetic says.
    if (atEnd) {
      setActiveSection(SECTIONS.length - 1);
      setTabsShown(true);
      return;
    }

    const probe = y + TAB_BAR_HEIGHT + insets.top + 24;
    let next = 0;
    offsets.current.forEach((_, index) => {
      const top = sectionTop(index);
      if (top && probe >= top) next = index;
    });
    setActiveSection((current) => (current === next ? current : next));

    // Matches the end of the tabs' entrance, so the strip becomes touchable
    // only once it is fully down.
    const shown = y >= HERO_HEIGHT + 20;
    setTabsShown((current) => (current === shown ? current : shown));
  }, [insets.top]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      // Within a couple of points of the bottom counts as the bottom: the
      // offset at rest is rarely exactly the content height.
      const atEnd =
        event.contentOffset.y + event.layoutMeasurement.height
        >= event.contentSize.height - 4;
      // Hop to the JS thread only to set React state; every transform above
      // stays on the UI thread and never waits for it.
      runOnJS(updateActiveSection)(event.contentOffset.y, atEnd);
    },
  });

  const scrollToSection = (index: number) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionTop(index) - TAB_BAR_HEIGHT - insets.top - 8),
      animated: true,
    });
  };

  // --- animated pieces -----------------------------------------------------

  // Hero: drifts up at half speed, and grows rather than tearing when pulled
  // past the top.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value, [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.5], Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(
          scrollY.value, [-HERO_HEIGHT, 0], [1.6, 1], Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Hero text leaves before the image does, so it never collides with the bar.
  const heroTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_HEIGHT * 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [{
      translateY: interpolate(scrollY.value, [0, HERO_HEIGHT], [0, 60], Extrapolation.CLAMP),
    }],
  }));

  // The top bar is invisible over the photograph and fades in as the page
  // arrives underneath it.
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value, [HERO_HEIGHT - 150, HERO_HEIGHT - 60], [0, 1], Extrapolation.CLAMP
    ),
  }));

  // The tabs slide down out of the top bar once the hero is behind you.
  const tabsStyle = useAnimatedStyle(() => {
    const shown = interpolate(
      scrollY.value, [HERO_HEIGHT - 60, HERO_HEIGHT + 20], [0, 1], Extrapolation.CLAMP
    );
    return {
      opacity: shown,
      transform: [{ translateY: interpolate(shown, [0, 1], [-TAB_BAR_HEIGHT, 0]) }],
    };
  });

  const barHeight = insets.top + 48;

  return (
    <Screen edges={false}>
      <Backdrop />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + t.spacing.xxl }}
      >
        {/* --- Hero ----------------------------------------------------- */}
        <View style={{ height: HERO_HEIGHT, justifyContent: 'flex-end', overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_HEIGHT }, heroStyle]}>
            <Image
              source={require('../../assets/welcome-room.jpg')}
              resizeMode="cover"
              accessibilityLabel="A furnished boarding house room"
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>

          {/* Gradient rather than a flat scrim: the type needs contrast at the
              bottom, the photograph deserves to be seen at the top. */}
          {/* Four stops, not three. With a single mid-point the scrim was still
              nearly clear where the subtitle sits, so that line fell across the
              bright window in the photograph and lost its contrast. The ramp now
              begins above the type rather than at it. */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.50)',
              'rgba(0,0,0,0.06)',
              'rgba(0,0,0,0.58)',
              'rgba(0,0,0,0.88)',
            ]}
            locations={[0, 0.30, 0.64, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <Animated.View style={[{ padding: GUTTER, paddingBottom: t.spacing.lg, gap: t.spacing.xs }, heroTextStyle]}>
            <View style={{ alignSelf: 'flex-start' }}>
              <Glass variant="onPhoto" radius={999} style={{ marginBottom: t.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: t.spacing.sm, paddingVertical: 6 }}>
                  <Ionicons name="location" size={12} color="#FFFFFF" />
                  <Text variant="micro" uppercase style={{ color: '#FFFFFF' }}>Tagum City</Text>
                </View>
              </Glass>
            </View>
            <Text variant="display" style={{ color: '#FFFFFF' }}>BoardEase</Text>
            <Text variant="body" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Find, compare and walk to a boarding house near your campus.
            </Text>
          </Animated.View>
        </View>

        {/* --- Stats, riding the seam ------------------------------------ */}
        <View style={{ paddingHorizontal: GUTTER, marginTop: -t.spacing.lg }}>
          <Animated.View entering={FadeInDown.delay(120).duration(520)}>
            {/* The one card on the page that is NOT glass, and the only one
                that must not be.
                It is pulled up to straddle the bottom edge of the photograph,
                which is the whole reason it reads as sitting on top of the
                hero rather than after it. Translucent, that edge showed
                straight through the middle of the card -- photograph above the
                line, page below it -- and looked like the card had been sliced
                in half. Solid, the card hides the seam it is there to cover. */}
            <View
              style={{
                borderRadius: t.radius.lg,
                overflow: 'hidden',
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.line,
                ...t.elevation.low,
              }}
            >
              <View style={{ flexDirection: 'row', paddingVertical: t.spacing.md }}>
                {STATS.map((stat, index) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 2,
                      borderLeftWidth: index === 0 ? 0 : 1,
                      borderLeftColor: t.colors.line,
                    }}
                  >
                    <Text variant="metric" tone="brand">{stat.value}</Text>
                    <Text variant="micro" tone="faint" uppercase>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* --- Actions -------------------------------------------------- */}
        {/*
            Directly under the hero, not at the foot of the page.
            Somebody who already knows what BoardEase is -- which is everyone
            after their first visit -- should not have to scroll past four
            sections of explanation to reach Log in. The pitch below is for
            people who need it; the buttons are for people who do not.
        */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: t.spacing.lg }}>
          <Animated.View entering={FadeInDown.delay(160).duration(520)} style={{ gap: t.spacing.sm }}>
            <Button
              label="Get started"
              icon="arrow-forward"
              iconPosition="right"
              fullWidth
              onPress={() => navigation.navigate('Register')}
            />
            <Button
              label="Log in"
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate('Login')}
            />
          </Animated.View>
        </View>

        <View
          onLayout={(e) => { columnTop.current = e.nativeEvent.layout.y; }}
          style={{ paddingHorizontal: GUTTER, paddingTop: t.spacing.xl, gap: t.spacing.xl }}
        >
          {/* --- The problem --------------------------------------------- */}
          <Animated.View entering={FadeInDown.delay(180).duration(520)} style={{ gap: t.spacing.xs }}>
            <Text variant="title">Looking for a place should not mean guessing.</Text>
            <Text variant="body" tone="soft">
              Students arriving in Tagum hear about boarding houses by word of mouth.
              There is no reliable way to see what is available, what it costs, or how
              far it really is from campus — so the search becomes a day of walking
              around asking.
            </Text>
            <Text variant="body" tone="soft">BoardEase puts that in one place.</Text>
          </Animated.View>

          {/* --- How it works -------------------------------------------- */}
          <View
            onLayout={(e) => setSectionOffset(0, e.nativeEvent.layout.y)}
            style={{ gap: t.spacing.sm }}
          >
            <Text variant="micro" tone="faint" uppercase>How it works</Text>
            {STEPS.map((step, index) => (
              <Animated.View
                key={step.title}
                entering={FadeInDown.delay(80 * index).duration(480)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    gap: t.spacing.md,
                    alignItems: 'flex-start',
                    borderRadius: t.radius.lg,
                    padding: t.spacing.md,
                    ...glass,
                  }}
                >
                  <LinearGradient
                    colors={[t.colors.brand, t.colors.brandDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 44, height: 44, borderRadius: t.radius.md,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={step.icon} size={21} color={t.colors.onBrand} />
                  </LinearGradient>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
                      <Text variant="micro" tone="faint">{`0${index + 1}`}</Text>
                      <Text variant="bodyStrong">{step.title}</Text>
                    </View>
                    <Text variant="caption" tone="soft">{step.body}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* --- What you get -------------------------------------------- */}
          {/* Banded, so the middle of the page is a different surface from the
              two sections around it. */}
          <Band onLayout={(e) => setSectionOffset(1, e.nativeEvent.layout.y)}>
            <Text variant="micro" tone="faint" uppercase>What you get</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
              {FEATURES.map((feature, index) => (
                <Animated.View
                  key={feature.label}
                  entering={FadeInDown.delay(60 * index).duration(460)}
                  style={{ flexBasis: '47%', flexGrow: 1 }}
                >
                  <View
                    style={{
                      borderRadius: t.radius.lg,
                      padding: t.spacing.md,
                      gap: t.spacing.xs,
                      minHeight: 132,
                      ...glass,
                    }}
                  >
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: t.radius.sm,
                        backgroundColor: t.colors.brandSoft,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={feature.icon} size={17} color={t.colors.brand} />
                    </View>
                    <Text variant="bodyStrong">{feature.label}</Text>
                    <Text variant="caption" tone="soft">{feature.body}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Band>

          {/* --- Coverage and the boundary -------------------------------- */}
          <View
            onLayout={(e) => setSectionOffset(2, e.nativeEvent.layout.y)}
            style={{ gap: t.spacing.sm }}
          >
            <Text variant="micro" tone="faint" uppercase>Where it covers</Text>

            <Animated.View entering={FadeInDown.duration(480)}>
              <LinearGradient
                colors={[t.colors.brand, t.colors.brandDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: t.radius.lg, padding: t.spacing.lg, gap: t.spacing.xs }}
              >
                <Ionicons name="school-outline" size={22} color={t.colors.onBrand} />
                <Text variant="heading" style={{ color: t.colors.onBrand }}>
                  Around University of Mindanao Tagum College
                </Text>
                <Text variant="caption" style={{ color: t.colors.onBrand, opacity: 0.88 }}>
                  Listings cover Visayan Village, Magugpo East and Magugpo Poblacion.
                  Distances are measured from wherever you are standing, not from a
                  fixed point on a map.
                </Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(480)}>
              <View
                style={{
                  borderRadius: t.radius.lg,
                  padding: t.spacing.md,
                  gap: t.spacing.xs,
                  ...glass,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
                  <Ionicons name="information-circle-outline" size={18} color={t.colors.inkSoft} />
                  <Text variant="bodyStrong">A guide, not a booking site</Text>
                </View>
                <Text variant="caption" tone="soft">
                  There is no reservation, no payment and no messaging here. Once you
                  have chosen somewhere you arrange it with the owner directly, the way
                  you would today. Nothing you do in the app commits you to anything.
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* --- Foot ----------------------------------------------------- */}
          {/* The buttons live under the hero now. Somebody who has read all
              the way down here should still be offered the way in rather than
              having to scroll back, but it is a second chance, not the main
              one -- so one button, and the terms with it. */}
          <Animated.View entering={FadeInDown.duration(520)} style={{ gap: t.spacing.sm }}>
            <Button
              label="Get started"
              icon="arrow-forward"
              iconPosition="right"
              fullWidth
              onPress={() => navigation.navigate('Register')}
            />
            <Text variant="caption" tone="faint" center>
              Free to use. Your shortlist and filters stay on your phone, and your
              location is never saved to your account.
            </Text>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* --- Floating top bar ------------------------------------------- */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: barHeight }, topBarStyle]}>
          {/* A bar spanning the display wants one hairline along its bottom
              edge, not an outline boxing it in on four sides. */}
          <Glass style={{ flex: 1, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth }} />
        </Animated.View>

        {/* Above the tab strip in both senses: it paints over it, and it is
            reached first by a touch. The strip spends most of its life parked
            underneath this row. */}
        <View
          style={{
            height: barHeight,
            paddingTop: insets.top,
            paddingHorizontal: GUTTER,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
            elevation: 2,
          }}
        >
          <Animated.View style={topBarStyle}>
            <Text variant="bodyStrong">BoardEase</Text>
          </Animated.View>
          <ThemeToggle onPhoto />
        </View>

        {/* --- Sticky section tabs ------------------------------------- */}
        <Animated.View
          style={[{ height: TAB_BAR_HEIGHT, zIndex: 1, elevation: 1 }, tabsStyle]}
          pointerEvents={tabsShown ? 'box-none' : 'none'}
        >
          <Glass style={{ flex: 1, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: t.spacing.xs,
              }}
            >
              {SECTIONS.map((label, index) => {
                const active = activeSection === index;
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to ${label}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => scrollToSection(index)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: t.spacing.xs,
                      borderRadius: t.radius.pill,
                      backgroundColor: active ? t.colors.brandSoft : 'transparent',
                    }}
                  >
                    <Text variant="captionStrong" tone={active ? 'brand' : 'soft'}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Glass>
        </Animated.View>
      </View>
    </Screen>
  );
}
