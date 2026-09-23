// Login screen: a simple email + password form that calls Firebase Auth
// through our AuthContext. If login succeeds, AuthContext's onAuthStateChanged
// listener notices the new logged-in user automatically, and RootNavigator
// switches us over to the main app -- we don't need to navigate manually.
//
// Errors are shown inline rather than in an Alert. An Alert has to be
// dismissed before the user can see the field it is complaining about, and it
// throws away the connection between the message and the input.

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

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-field errors appear on blur; the form-level one appears after a failed
  // submit. Keeping them separate is what stops an old server error from
  // sitting on screen while the user is busy fixing a field.
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLogin() {
    if (isSubmitting) return;
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // No need to navigate here -- AuthContext will update and
      // RootNavigator will automatically show the main app.
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      // In a finally so a thrown error cannot leave the button dead.
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
            <Text variant="display">Welcome back</Text>
            <Text variant="body" tone="soft">
              Log in to find your next boarding house.
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
              returnKeyType="next"
            />

            <View>
              <Input
                label="Password"
                icon="lock-closed-outline"
                placeholder="Your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onBlur={() => setPasswordError(validatePassword(password))}
                error={passwordError}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                trailing={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} label={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((current) => !current)} style={{ backgroundColor: 'transparent' }} size={18} />}
              />
              {/* Lets someone check what they typed instead of guessing at
                  dots -- the most common reason a correct password gets
                  reported as wrong. */}
            </View>
          </View>

          <Button
            label="Log in"
            size="lg"
            fullWidth
            loading={isSubmitting}
            onPress={handleLogin}
            style={{ marginTop: t.spacing.xxs }}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('Register')}
            style={{ alignSelf: 'center', paddingVertical: t.spacing.xs, marginTop: 'auto' }}
          >
            <Text variant="caption" tone="soft">
              New here? <Text variant="captionStrong" tone="brand">Create an account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
