// LAB 3 - SCREEN 3: Welcome / Profile Screen
//
// Reached from the Summary Screen by pressing VIEW PROFILE. It greets the
// student by the first name they typed on Screen 1, so the data has now
// travelled across all three screens.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LabStackParamList } from './types';
import { colors, font, radius, spacing } from './theme';

type Props = NativeStackScreenProps<LabStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation, route }: Props) {
  const { student } = route.params;

  // "Juan Dela Cruz" -> "Juan"   (blank name falls back to "Student")
  const firstName = student.fullName.trim().split(' ')[0] || 'Student';

  // first letters of the name, used for the round avatar
  const initials =
    student.fullName
      .trim()
      .split(' ')
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header with a working Back button ---- */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome, {firstName}!</Text>
          <Text style={styles.subtitle}>Welcome to the Student Portal.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.banner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.bannerText}>
              Your registration has been successfully submitted.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>STUDENT PROFILE</Text>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Ionicons name="card-outline" size={19} color={colors.primary} />
              <Text style={styles.tileLabel}>Student ID</Text>
              <Text style={styles.tileValue} numberOfLines={1}>
                {student.studentId.trim() || '—'}
              </Text>
            </View>
            <View style={styles.gap} />
            <View style={styles.tile}>
              <Ionicons name="calendar-outline" size={19} color={colors.primary} />
              <Text style={styles.tileLabel}>Age</Text>
              <Text style={styles.tileValue} numberOfLines={1}>
                {student.age.trim() || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.wideTile}>
            <Ionicons name="book-outline" size={19} color={colors.primary} />
            <View style={styles.tileTextWrap}>
              <Text style={styles.tileLabel}>Course</Text>
              <Text style={styles.tileValue}>{student.course.trim() || '—'}</Text>
            </View>
          </View>

          <View style={styles.wideTile}>
            <Ionicons name="mail-outline" size={19} color={colors.primary} />
            <View style={styles.tileTextWrap}>
              <Text style={styles.tileLabel}>Email Address</Text>
              <Text style={styles.tileValue}>{student.email.trim() || '—'}</Text>
            </View>
          </View>

          {/* ---- PART 7 - VIEW REGISTRATION goes back to the Summary ---- */}
          <Pressable
            onPress={() => navigation.navigate('Summary', { student })}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>VIEW REGISTRATION</Text>
          </Pressable>

          {/* ---- back to the very first screen ---- */}
          <Pressable
            onPress={() => navigation.popTo('Registration')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryBtnText}>BACK TO REGISTRATION</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { width: spacing.md },
  pressed: { opacity: 0.7 },

  screen: { flex: 1, backgroundColor: colors.primary },
  scrollBody: { paddingBottom: 40, backgroundColor: colors.screen },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: 46,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  backText: {
    color: colors.white,
    fontSize: font.body,
    fontWeight: '600',
    marginLeft: 4,
  },

  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg - 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },

  title: {
    color: colors.white,
    fontSize: font.title,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.headerSub,
    fontSize: 13.5,
    marginTop: 6,
    lineHeight: 19,
  },

  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: -28,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    shadowColor: '#312E81',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg - 2,
    marginBottom: spacing.xl,
  },
  bannerText: {
    flex: 1,
    color: '#047857',
    fontSize: font.label,
    fontWeight: '700',
    marginLeft: spacing.sm,
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: font.section,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },

  tileRow: { flexDirection: 'row', marginBottom: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
  },
  wideTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    marginBottom: spacing.md,
  },
  tileTextWrap: { flex: 1, marginLeft: spacing.md },
  tileLabel: { fontSize: font.small, color: colors.muted, marginTop: 6 },
  tileValue: {
    fontSize: font.input,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: font.input,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: spacing.sm,
  },

  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontSize: font.label,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
