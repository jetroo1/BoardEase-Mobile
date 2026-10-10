// Wraps a control so the tour can point at it.
//
// It hands the view itself to TourContext under an id. It does not measure
// anything -- the overlay does that, at the moment it is about to draw.
//
// Measuring here was the first design and it was wrong in a way that only
// showed up on a device. onLayout fires when this view is laid out, which
// inside a ScrollView happens before the scroll content has settled into its
// final position. The numbers captured then were from an intermediate layout
// and never corrected, so every highlight was drawn around where the control
// had briefly been rather than where it was. Registering the view and asking
// it later removes the question of when to measure: the answer is always
// "now", and "now" is when the ring is about to be drawn.

import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTour } from '../../context/TourContext';

export interface TourTargetProps {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TourTarget({ id, children, style }: TourTargetProps) {
  const { registerTarget } = useTour();
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTarget(id, ref.current);
    // Stop claiming the id once this control leaves the screen, so a step on
    // another screen cannot end up pointing at a view that is gone.
    return () => registerTarget(id, null);
  }, [id, registerTarget]);

  return (
    // collapsable={false} keeps this view in the native hierarchy. Android
    // flattens plain wrapper views that draw nothing, and a flattened view has
    // no native node left to measure.
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

export default TourTarget;
