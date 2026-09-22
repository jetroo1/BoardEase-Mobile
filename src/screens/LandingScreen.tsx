// Landing screen: the first thing people see, before logging in.
// This mirrors the Laravel web app's welcome page (resources/views/welcome.blade.php)
// -- same BoardEase branding and message, just rebuilt as a simple RN screen
// instead of an HTML page. Booking/messaging mentions from the web copy are
// left out here since this mobile app is discovery-only (no booking/chat).

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STEPS = [
  { number: '1', title: 'Search', text: 'Find boarding houses near you by location, price, and room type.' },
  { number: '2', title: 'View Details', text: 'Check photos, price, amenities, and reviews from other tenants.' },
  { number: '3', title: 'Get Directions', text: 'Open the map and get walking directions to the boarding house.' },
];

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.kicker}>
        <Ionicons name="location" size={13} color={colors.sky} />
        <Text style={styles.kickerText}>Tagum City boarding house finder</Text>
      </View>

      <Text style={styles.brand}>BoardEase</Text>
      <Text style={styles.headline}>Find Your Perfect Boarding House in Tagum</Text>
      <Text style={styles.subtext}>
        Discover, compare, and get directions to safe, affordable boarding houses near
        your school or workplace.
      </Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.white} />
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.secondaryButtonText}>I already have an account</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>How it works</Text>
      {STEPS.map((step) => (
        <View key={step.number} style={styles.stepCard}>
          <View style={styles.stepNumberCircle}>
            <Text style={styles.stepNumberText}>{step.number}</Text>
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  content: { padding: spacing.lg, paddingTop: 60, paddingBottom: 48 },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  kickerText: { color: colors.sky, fontSize: 12, fontWeight: '600' },
  brand: { fontSize: 34, fontWeight: 'bold', color: colors.deep },
  headline: { fontSize: 24, fontWeight: 'bold', color: colors.ink, marginTop: spacing.sm },
  subtext: { fontSize: 15, color: colors.muted, marginTop: spacing.sm + 2, lineHeight: 22 },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl - 4,
    ...shadow.card,
  },
  primaryButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { alignItems: 'center', marginTop: spacing.md - 2 },
  secondaryButtonText: { color: colors.deep, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: spacing.xl + 8, marginBottom: spacing.md, color: colors.ink },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: spacing.md + 2,
  },
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.white, fontWeight: 'bold' },
  stepTextWrap: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: 'bold', color: colors.ink },
  stepText: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
