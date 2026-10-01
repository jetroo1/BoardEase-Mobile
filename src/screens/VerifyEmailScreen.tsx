import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { describeAuthError } from '../utils/authErrors';
import { Button, Pressable, Screen, ScreenHeader, Text } from '../components/ui';

export default function VerifyEmailScreen() {
  const { user, resendVerificationEmail, refreshUser, logout } = useAuth();
  const t = useTheme();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (isChecking) return;
    setIsChecking(true);
    setError(null);
    setMessage(null);
    try {
      await refreshUser();
      setMessage('Your email is not verified yet. Open the latest BoardEase email, use its verification link, then check again.');
    } catch (nextError) {
      setError(describeAuthError(nextError));
    } finally {
      setIsChecking(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setMessage('A new verification email was sent. Check your inbox and spam folder.');
    } catch (nextError) {
      setError(describeAuthError(nextError));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader showThemeToggle />
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: t.spacing.lg,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <View style={{ gap: t.spacing.sm }}>
          <Ionicons name="mail-unread-outline" size={40} color={t.colors.brand} />
          <Text variant="display">Verify your email</Text>
          <Text variant="body" tone="soft">
            We sent a verification link to {user?.email ?? 'your email address'}. Open it, then return here.
          </Text>
        </View>

        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text variant="caption" tone="soft" accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}

        <Button
          label="I verified my email"
          icon="checkmark-circle-outline"
          size="lg"
          fullWidth
          loading={isChecking}
          onPress={handleCheck}
        />
        <Button
          label="Resend verification email"
          icon="reload-outline"
          variant="secondary"
          fullWidth
          loading={isResending}
          onPress={handleResend}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void logout()}
          style={{ alignSelf: 'center', paddingVertical: t.spacing.sm }}
        >
          <Text variant="captionStrong" tone="brand">Use another account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
