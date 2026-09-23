// Loading, empty and error -- the three states that were missing from half the
// app, and the reason several screens looked broken the first time they opened.
//
// Compare, Filter, Map, Profile and Landing had no loading or error state at
// all; Admin and Details had no error handling. A blank rectangle is not an
// empty state, and a screen that shows nothing while it fetches is
// indistinguishable from one that has crashed.
//
// The two kinds of empty need different words, so they are different props:
//   - nothing exists yet  -> say what the screen is for, offer the action
//   - nothing matched     -> echo the query, offer the escape

import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import Button from './Button';
import Text from './Text';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
//
// A shimmering block shaped like the content that is coming. Better than a
// spinner for lists, because the page does not jump when the data lands -- the
// shape is already correct.

export function Skeleton({
  width,
  height,
  radius: r,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 })
      ),
      -1,
      false
    );
  }, [shimmer]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + shimmer.value * 0.45 }));

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: r ?? t.radius.sm,
          backgroundColor: t.colors.skeleton,
        },
        animated,
        style,
      ]}
    />
  );
}

// A skeleton shaped like one PropertyCard, so the Search list keeps its
// rhythm while it loads.
export function PropertyCardSkeleton() {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.md,
        overflow: 'hidden',
        marginBottom: t.spacing.sm,
      }}
    >
      <Skeleton height={168} radius={0} />
      <View style={{ padding: t.spacing.md, gap: t.spacing.xs }}>
        <Skeleton height={18} width="70%" />
        <Skeleton height={13} width="45%" />
        <Skeleton height={22} width="35%" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty / error
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
  style,
}: EmptyStateProps) {
  const t = useTheme();
  const isDanger = tone === 'danger';

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: t.spacing.xl,
          paddingVertical: t.spacing.xxl,
          gap: t.spacing.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDanger ? t.colors.dangerSoft : t.colors.brandSoft,
          marginBottom: t.spacing.xxs,
        }}
      >
        <Ionicons
          name={icon}
          size={28}
          color={isDanger ? t.colors.danger : t.colors.brand}
        />
      </View>

      <Text variant="heading" center>
        {title}
      </Text>
      {/* Held to a readable measure -- a line of text running the full width
          of the screen is genuinely harder to read on the return sweep. */}
      <Text variant="body" tone="soft" center style={{ maxWidth: 300 }}>
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={isDanger ? 'secondary' : 'primary'}
          style={{ marginTop: t.spacing.xs }}
        />
      ) : null}
    </View>
  );
}

// The error state, in the user's terms rather than the exception's.
export function ErrorState({
  message,
  onRetry,
  style,
}: {
  message: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      tone="danger"
      title="Something went wrong"
      message={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      style={style}
    />
  );
}

export default EmptyState;
