// Single source of truth for BoardEase's brand colors, spacing, and corner
// radius. Pulled from the Laravel web app's CSS variables (see
// resources/views/welcome.blade.php) so the mobile app matches the brand
// instead of using generic default colors.
//
// Plain objects on purpose -- no theming library, just values you can
// import and use directly in StyleSheet.create({...}).

export const colors = {
  // Text
  ink: '#102236', // main text
  inkSoft: '#31465d', // secondary text
  muted: '#69798b', // tertiary / helper text

  // Brand accents
  cyan: '#06b6d4', // primary accent
  sky: '#0ea5e9', // primary buttons / links
  deep: '#075985', // dark accent

  // Status
  green: '#10b981', // success / positive
  amber: '#f59e0b', // ratings / stars / warnings
  danger: '#dc2626', // errors / destructive actions

  // Backgrounds
  mist: '#f5fcff', // light background
  paperMint: '#effdf8', // alt light background
  white: '#ffffff',

  // Neutrals for borders, placeholders, disabled states
  border: '#e2e8f0',
  placeholder: '#f0f0f0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
};

// A simple, reusable shadow for cards so they don't look flat.
// Spread this into a style object, e.g. style={[styles.card, shadow.card]}
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
};
