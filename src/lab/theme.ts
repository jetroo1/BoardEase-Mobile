// LAB 3 - shared design tokens.
//
// All three screens import their colours, spacing and font sizes from this
// one file. That is what keeps the Registration, Summary and Welcome screens
// looking like the same app instead of three different designs.

export const colors = {
  primary: '#4338CA',
  primaryDark: '#3730A3',
  primaryLight: '#6366F1',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',

  screen: '#EEF2FF',
  card: '#FFFFFF',
  inputBg: '#F9FAFB',
  border: '#E5E7EB',
  divider: '#F3F4F6',

  text: '#111827',
  label: '#374151',
  muted: '#6B7280',
  placeholder: '#9CA3AF',
  white: '#FFFFFF',
  headerSub: '#C7D2FE',

  success: '#059669',
  successSoft: '#ECFDF5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 7,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 24,
};

export const font = {
  title: 25,
  heading: 19,
  section: 11,
  body: 14,
  label: 13,
  input: 15,
  small: 12,
};
