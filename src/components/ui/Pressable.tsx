// A Pressable that visibly responds to being touched.
//
// "Feedback within 100ms of every action" is the rule this exists for. A tap
// with no response makes people tap again, and on a screen with a submit
// button that is how duplicate records get created.
//
// The scale is deliberately small (0.97). A control that shrinks dramatically
// reads as a toy rather than as a well-made app.

import React, { useCallback } from 'react';
import { Pressable as RNPressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  // Turn the animation off for things that already show their own pressed
  // state, such as a row that highlights.
  animate?: boolean;
  children?: React.ReactNode;
}

export function Pressable({
  style,
  animate = true,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: PressScaleProps) {
  const t = useTheme();
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (animate && !disabled) {
        pressed.value = withTiming(1, { duration: t.motion.fast });
      }
      onPressIn?.(event);
    },
    [animate, disabled, onPressIn, pressed, t.motion.fast]
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      if (animate) {
        pressed.value = withTiming(0, { duration: t.motion.base });
      }
      onPressOut?.(event);
    },
    [animate, onPressOut, pressed, t.motion.base]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressed.value * (1 - t.motion.pressScale) },
    ],
    opacity: 1 - pressed.value * 0.12,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default Pressable;
