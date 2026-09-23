// Register screen. Creates a Firebase Auth account through AuthContext, which
// also writes the users/{uid} document carrying the 'tenant' role.
//
// Like Login, AuthContext takes care of switching screens once the new account
// is created and signed in -- there is no navigate() call after success.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { describeAuthError, validateEmail, validatePassword } from '../utils/authErrors';
import {
  Button,
  IconButton,
  Input,
  Pressable,
  Screen,
  ScreenHeader,
  Text,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function checkConfirm(value: string): string | null {
    if (!value) {
      return 'Type your password a second time.';
    }
    if (value !== password) {
      return 'The two passwords do not match.';
    }
    return null;
  }

  async function handleRegister() {
    if (isSubmitting) return;
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextConfirmError = checkConfirm(confirmPassword);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setFormError(null);

    if (nextEmailError || nextPasswordError || nextConfirmError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email.trim(), password);
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader onBack={() => navigation.goBack()} showThemeToggle />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: GUTTER,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.md,
          }}
        >
          <View style={{ gap: t.spacing.xxs, marginTop: t.spacing.sm }}>
            <Text variant="display">Create account</Text>
            <Text variant="body" tone="soft">
              Join BoardEase to start browsing boarding houses near you.
            </Text>
          </View>

          {formError ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.xs,
                backgroundColor: t.colors.dangerSoft,
                borderRadius: t.radius.sm,
                padding: t.spacing.sm,
              }}
            >
              <Ionicons name="alert-circle" size={18} color={t.colors.danger} />
              <Text variant="caption" tone="danger" style={{ flex: 1 }}>
                {formError}
              </Text>
            </View>
          ) : null}

          <View style={{ gap: t.spacing.sm }}>
            <Input
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailError(validateEmail(email))}
              error={emailError}
            />

            <View>
              <Input
                label="Password"
                icon="lock-closed-outline"
                placeholder="At least 6 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                onBlur={() => setPasswordError(validatePassword(password))}
                error={passwordError}
                hint="Use at least 6 characters."
                trailing={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} label={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((current) => !current)} style={{ backgroundColor: 'transparent' }} size={18} />}
              />
            </View>

            <Input
              label="Confirm password"
              icon="lock-closed-outline"
              placeholder="Type it again"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setConfirmError(checkConfirm(confirmPassword))}
              error={confirmError}
              returnKeyType="go"
              onSubmitEditing={handleRegister}
            />
          </View>

          <Button
            label="Create account"
            size="lg"
            fullWidth
            loading={isSubmitting}
            onPress={handleRegister}
            style={{ marginTop: t.spacing.xxs }}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('Login')}
            style={{ alignSelf: 'center', paddingVertical: t.spacing.xs, marginTop: 'auto' }}
          >
            <Text variant="caption" tone="soft">
              Already have an account? <Text variant="captionStrong" tone="brand">Log in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
