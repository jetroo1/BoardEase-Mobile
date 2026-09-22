// Login screen: a simple email + password form that calls Firebase Auth
// through our AuthContext. If login succeeds, AuthContext's onAuthStateChanged
// listener notices the new logged-in user automatically, and RootNavigator
// switches us over to the main app -- we don't need to navigate manually.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      // No need to navigate here -- AuthContext will update and
      // RootNavigator will automatically show the main app.
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BoardEase</Text>
      <Text style={styles.subtitle}>Log in to find your next boarding house</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.mist,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.deep,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.muted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md - 4,
    marginBottom: spacing.md - 4,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.card,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: colors.deep,
    textAlign: 'center',
    marginTop: spacing.lg - 4,
    fontWeight: '600',
  },
});
