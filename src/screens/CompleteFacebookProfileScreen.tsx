import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { describeAuthError } from '../utils/authErrors';
import { Button, Checkbox, Pressable, Screen, ScreenHeader, Text } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CompleteFacebookProfileScreen() {
  const { completeFacebookProfile, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (isSaving) return;
    if (!acceptedTerms) {
      setError('Please accept the Terms of Use and Privacy Notice to continue.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await completeFacebookProfile();
    } catch (nextError) {
      setError(describeAuthError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader showThemeToggle />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: t.spacing.lg, gap: t.spacing.md }}>
        <View style={{ gap: t.spacing.sm }}>
          <Ionicons name="logo-facebook" size={40} color={t.colors.brand} />
          <Text variant="display">Finish your account</Text>
          <Text variant="body" tone="soft">Accept the terms to use BoardEase with Facebook.</Text>
        </View>
        <Checkbox checked={acceptedTerms} onChange={(next) => { setAcceptedTerms(next); if (next) setError(null); }} accessibilityLabel="I accept the Terms of Use and Privacy Notice" error={error}>
          <Text variant="caption" tone="soft">
            I accept the <Text variant="captionStrong" tone="brand" accessibilityRole="link" onPress={() => navigation.navigate('Legal', { document: 'terms' })}>Terms of Use</Text> and <Text variant="captionStrong" tone="brand" accessibilityRole="link" onPress={() => navigation.navigate('Legal', { document: 'privacy' })}>Privacy Notice</Text>.
          </Text>
        </Checkbox>
        <Button label="Continue" size="lg" fullWidth loading={isSaving} onPress={handleContinue} />
        <Pressable accessibilityRole="button" onPress={() => void logout()} style={{ alignSelf: 'center', paddingVertical: t.spacing.sm }}>
          <Text variant="captionStrong" tone="brand">Use another account</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
