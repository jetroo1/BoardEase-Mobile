// Every piece of text in BoardEase goes through this component.
//
// The point is to make the type scale the path of least resistance. The old
// code picked a fontSize per screen and ended up with fifteen of them (10, 11,
// 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 34) and five weights. Nothing
// looked deliberate because nothing was.
//
// Here there is no fontSize prop. You pick a role -- title, body, caption --
// and the size, weight, family and line height come with it.

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Palette } from '../../theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'micro'
  | 'metric';

// Named colour roles rather than raw palette keys, so a screen asks for
// "secondary text" instead of picking a specific grey.
export type TextTone =
  | 'default'
  | 'soft'
  | 'faint'
  | 'brand'
  | 'accent'
  | 'onBrand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'star';

const TONE_TO_COLOR: Record<TextTone, keyof Palette> = {
  default: 'ink',
  soft: 'inkSoft',
  faint: 'inkFaint',
  brand: 'brand',
  accent: 'accent',
  onBrand: 'onBrand',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  star: 'star',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  // Eyebrow labels only -- the one place caps are acceptable, and only at
  // micro size where the letter-spacing keeps them readable.
  uppercase?: boolean;
  center?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'default',
  uppercase = false,
  center = false,
  style,
  ...rest
}: TextProps) {
  const t = useTheme();

  const composed: TextStyle = {
    ...t.type[variant],
    color: t.colors[TONE_TO_COLOR[tone]],
    includeFontPadding: false,
    letterSpacing: 0,
    ...(uppercase ? { textTransform: 'uppercase' } : null),
    ...(center ? { textAlign: 'center' } : null),
  };

  return <RNText {...rest} style={[composed, style]} />;
}

export default Text;
