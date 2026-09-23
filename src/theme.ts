// BoardEase design system -- the single source of truth for every colour,
// size, gap, radius and shadow in the app.
//
// The rules this file exists to enforce:
//
//   1. No screen ever writes a raw hex colour or a raw pixel gap. If a value
//      is not in here, it does not belong in a StyleSheet.
//   2. Spacing comes from ONE scale (4/8/12/16/24/32/48). No "spacing.md + 2".
//      Gaps that are 2px off from each other are the single most common reason
//      a screen reads as amateur -- the eye catches it long before it catches
//      a bad colour.
//   3. Type comes from SIX named roles, not from picking a number per screen.
//   4. Elevation has three tiers, so things can actually sit above each other.
//
// Colours live in two palettes of the SAME shape (light and dark), so any
// component can read `t.colors.surface` without caring which one is active.
// Use them through useTheme()/useThemedStyles() in src/context/ThemeContext.tsx
// -- never import a palette directly, or that screen will not react to the
// light/dark toggle.

// ---------------------------------------------------------------------------
// Spacing -- the only gaps allowed
// ---------------------------------------------------------------------------
//
// Related things sit closer than the space around their group: a label is 4
// from its input, the field group is 16 from the next one. When those two are
// equal the grouping disappears and a form reads as a pile of loose boxes.

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Standard page gutter. Every screen's content starts here, so the left edges
// line up from one screen to the next.
export const GUTTER = spacing.md;

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------

// Bigger than a stock mobile app on purpose. The soft, generous corner is the
// most recognisable thing about the references this was designed from -- cards
// sit at `lg`, controls at `md`, photos inside cards at `md` so they nest
// visibly inside the corner of their container rather than fighting it.
export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------
//
// Two families: Plus Jakarta Sans for anything display-sized (it has more
// personality at large sizes), Inter for body copy (it was drawn for small
// sizes on screens and stays readable at 13px).
//
// Loaded in src/context/ThemeContext.tsx. Until they load we render nothing,
// so text never visibly reflows from system font to real font.

export const fonts = {
  display: 'PlusJakartaSans_700Bold',
  displayMedium: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

// Six roles. Every piece of text in the app is one of these -- if you find
// yourself wanting a seventh, use the nearest one instead.
//
// lineHeight is always set: RN's default leading is too tight to scan, and
// 1.4-1.5x is what body copy needs.
export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  // Eyebrows and pill labels only. Never for anything a user has to read in
  // a paragraph -- 11px is the floor, and going below it excludes people.
  micro: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  // Prices and dashboard figures. Big enough to be the entry point for the eye.
  metric: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31 },
} as const;

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
//
// Clean and light: a quiet near-white canvas, pure white cards, one teal doing
// all the accent work, and a near-black reserved for the highest-contrast
// buttons. Colour is spent sparingly so the photographs and the data are the
// brightest things on screen.
//
// The canvas is off-white rather than pure white on purpose. White cards on a
// pure white background stop reading as cards, which was the old palette's
// problem from the other direction -- its #f5fcff canvas was 98% white.
//
// Teal rather than the lime in the reference shots: it is already BoardEase's
// colour in the Laravel web app, and having the mobile and web versions of one
// product disagree about their own brand is worse than any palette choice.
//
// Every semantic colour has a matching soft tint. Status pills are dark text on
// the tint, never white text on the full-strength colour: full strength is
// heavier than the information usually deserves and it fights the text on top.

export interface Palette {
  // Surfaces
  canvas: string; // page background
  canvasAlt: string; // recessed areas, grouped rows
  surface: string; // cards
  surfaceAlt: string; // table headers, subtle stripes
  line: string; // hairline borders
  lineStrong: string; // visible dividers, input borders

  // Text
  ink: string; // primary
  inkSoft: string; // secondary
  inkFaint: string; // tertiary, placeholders, disabled
  onBrand: string; // text on a brand-filled surface

  // Brand
  brand: string;
  brandDeep: string;
  brandSoft: string; // tint, for selected rows and badge backgrounds
  accent: string; // warm counterpoint to the teal
  accentSoft: string;

  // Semantic
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  star: string; // ratings

  // Effects
  shadow: string;
  scrim: string; // gradient over photos so text stays readable
  skeleton: string;
  skeletonHighlight: string;
}

export const lightPalette: Palette = {
  canvas: '#F6F9FA',
  canvasAlt: '#EDF2F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F8F9',
  line: '#E6EDEF',
  lineStrong: '#D3DEE1',

  ink: '#101A1D',
  inkSoft: '#4B5C61',
  inkFaint: '#83959B',
  onBrand: '#FFFFFF',

  brand: '#0E7490',
  brandDeep: '#0A5568',
  brandSoft: '#DFF0F5',
  // A muted gold, used only for "featured" style badges. It is the one warm
  // note in an otherwise cool palette, which is what makes it read as a
  // highlight rather than as another colour.
  accent: '#9A6B12',
  accentSoft: '#F7EEDA',

  success: '#1F7A4D',
  successSoft: '#DCF0E5',
  warning: '#9A6614',
  warningSoft: '#F8EEDA',
  danger: '#B03A2B',
  dangerSoft: '#FAE4E0',
  star: '#C08A14',

  shadow: '#0F2126',
  scrim: '#0B1416',
  skeleton: '#E8EEF0',
  skeletonHighlight: '#F4F8F9',
};

// Temporary compatibility layer for screens that have not been moved to
// useTheme() yet. Keep these aliases pointed at the light palette so the
// in-progress redesign can land screen by screen without breaking the app.
export const colors = {
  ink: lightPalette.ink,
  inkSoft: lightPalette.inkSoft,
  muted: lightPalette.inkFaint,
  cyan: lightPalette.brand,
  sky: lightPalette.brand,
  deep: lightPalette.brandDeep,
  green: lightPalette.success,
  amber: lightPalette.star,
  danger: lightPalette.danger,
  mist: lightPalette.canvas,
  paperMint: lightPalette.brandSoft,
  white: lightPalette.surface,
  border: lightPalette.line,
  placeholder: lightPalette.skeleton,
} as const;

export const darkPalette: Palette = {
  canvas: '#0D1214',
  canvasAlt: '#141C1F',
  surface: '#161F22',
  surfaceAlt: '#1D282C',
  line: '#243135',
  lineStrong: '#344449',

  ink: '#ECF2F3',
  inkSoft: '#A6B8BD',
  inkFaint: '#78898E',
  onBrand: '#052027',

  // Lifted off the light-mode teal: #0E7490 on a near-black canvas does not
  // clear 4.5:1, so dark mode gets its own brighter step.
  brand: '#52B6CC',
  brandDeep: '#84D0DF',
  brandSoft: '#0E333D',
  accent: '#D6A742',
  accentSoft: '#33290F',

  success: '#56C089',
  successSoft: '#13301F',
  warning: '#DCA63E',
  warningSoft: '#31250E',
  danger: '#E38271',
  dangerSoft: '#3A1C18',
  star: '#DEAE49',

  shadow: '#000000',
  scrim: '#000000',
  skeleton: '#1D282C',
  skeletonHighlight: '#263338',
};

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------
//
// Three tiers so the interface has a front and a back. The old theme had one
// shadow used for cards, buttons and pills alike, which is why nothing ever
// looked like it sat above anything else.
//
// Shadows are nearly invisible on a dark canvas, so dark mode leans on the
// lighter surface colours above instead and only keeps elevation for Android.

export type Elevation = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export function elevation(palette: Palette, isDark: boolean) {
  const opacity = isDark ? 0.4 : 1;
  return {
    // Resting cards.
    low: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06 * opacity,
      shadowRadius: 3,
      elevation: 1,
    } as Elevation,
    // Cards that are the point of the screen, and the tab bar.
    medium: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1 * opacity,
      shadowRadius: 12,
      elevation: 4,
    } as Elevation,
    // Sheets, floating bars, anything that overlaps content.
    high: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16 * opacity,
      shadowRadius: 24,
      elevation: 12,
    } as Elevation,
  };
}

export const shadow = {
  card: elevation(lightPalette, false).medium,
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------
//
// One set of durations so a press on Search feels the same as a press on
// Profile. Anything under ~120ms reads as instant; anything over ~400ms starts
// to feel like waiting.

export const motion = {
  fast: 140,
  base: 220,
  slow: 360,
  // How far a card lifts when pressed. Small on purpose -- a button that
  // shrinks a lot looks like a toy.
  pressScale: 0.97,
} as const;

// Minimum touch target. Anything interactive is at least this tall, even when
// its visible box is smaller.
export const HIT_SLOP_MIN = 44;
