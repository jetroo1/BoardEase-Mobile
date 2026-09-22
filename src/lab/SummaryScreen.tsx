// LAB 3 - SCREEN 2: Registration Summary Screen
//
// PART 4: nothing here is typed in by hand. Every value below comes from
// route.params, which is what the Registration Screen sent when the user
// pressed REGISTER.

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LabStackParamList } from './types';
import { colors, font, radius, spacing } from './theme';

type Props = NativeStackScreenProps<LabStackParamList, 'Summary'>;

// if a field was left blank we show a dash instead of an empty gap
function show(value: string) {
  return value.trim().length > 0 ? value : '—';
}

export default function SummaryScreen({ navigation, route }: Props) {
  // <-- the data handed over from Screen 1
  const { student } = route.params;

  // one row of the summary list
  function Row({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{show(value)}</Text>
        </View>
      </View>
    );
  }

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

          <View style={styles.badgeRing}>
            <View style={styles.badge}>
              <Ionicons
                name="document-text-outline"
                size={26}
                color={colors.white}
              />
            </View>
          </View>
          <Text style={styles.title}>Registration Summary</Text>
          <Text style={styles.subtitle}>
            Please review the details you submitted.
          </Text>
        </View>

        <View style={styles.card}>
          {/* little confirmation banner */}
          <View style={styles.banner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.bannerText}>Form submitted successfully</Text>
          </View>

          <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
          <Row icon="person-outline" label="Full Name" value={student.fullName} />
          <Row icon="calendar-outline" label="Age" value={student.age} />
          <Row icon="card-outline" label="Student ID" value={student.studentId} />
          <Row icon="book-outline" label="Course" value={student.course} />
          <Row icon="people-outline" label="Gender" value={student.gender} />

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>CONTACT DETAILS</Text>
          <Row icon="mail-outline" label="Email Address" value={student.email} />
          <Row icon="call-outline" label="Phone Number" value={student.phone} />

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <Row
            icon="notifications-outline"
            label="Receive Notifications"
            value={student.notifications ? 'ON' : 'OFF'}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Terms and Conditions"
            value={student.agreed ? 'Accepted' : 'Not accepted'}
          />

          {/* ---- PART 7 - VIEW PROFILE moves us to the Welcome Screen ---- */}
          <Pressable
            onPress={() => navigation.navigate('Welcome', { student })}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>VIEW PROFILE</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>

          {/* ---- optional extra: go back and edit the form ---- */}
          <Pressable
            onPress={() => navigation.goBack()}
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
  badgeRing: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg - 2,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#047857',
    fontSize: font.label,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },

  sectionLabel: {
    fontSize: font.section,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: { fontSize: font.small, color: colors.muted },
  rowValue: {
    fontSize: font.input,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: font.input,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginRight: spacing.sm,
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
