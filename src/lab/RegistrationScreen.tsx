// LAB 3 - SCREEN 1: Registration Screen
//
// This is the same form design from Lab 2, with one important change:
// every TextInput is now "controlled" (its text is kept in useState).
// In Lab 2 the boxes were uncontrolled because we only had to LOOK right.
// Now we have to send what the user typed to the Summary Screen, and we
// can only send values we are actually holding on to.

import React, { useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LabStackParamList } from './types';
import { colors, font, radius, spacing } from './theme';

const GENDERS = ['Male', 'Female', 'Other'];

type Props = NativeStackScreenProps<LabStackParamList, 'Registration'>;

export default function RegistrationScreen({ navigation }: Props) {
  // one piece of state per field - simple and easy to follow
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // PART 4 - bundle everything up and hand it to the Summary Screen.
  // The second argument of navigate() is the "navigation parameter".
  function handleRegister() {
    navigation.navigate('Summary', {
      student: {
        fullName,
        age,
        studentId,
        course,
        phone,
        email,
        gender,
        notifications,
        agreed,
      },
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Header band ---- */}
          <View style={styles.header}>
            <View style={styles.badgeRing}>
              <View style={styles.badge}>
                <Ionicons name="school" size={26} color={colors.white} />
              </View>
            </View>
            <Text style={styles.title}>Student Registration Form</Text>
            <Text style={styles.subtitle}>
              Fill in your details to create your student account.
            </Text>
          </View>

          {/* ---- The form card ---- */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Juan Dela Cruz"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* two short fields side by side keeps the form compact */}
            <View style={styles.row}>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="18"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={3}
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={styles.gap} />
              <View style={[styles.field, styles.flexWide]}>
                <Text style={styles.label}>Student ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-0001"
                  placeholderTextColor={colors.placeholder}
                  value={studentId}
                  onChangeText={setStudentId}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Course</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. BS Information Technology"
                placeholderTextColor={colors.placeholder}
                value={course}
                onChangeText={setCourse}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="09XX XXX XXXX"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                maxLength={13}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* ---- Gender: Pressable chips instead of a plain dropdown ---- */}
            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((item) => {
                  const selected = gender === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setGender(item)}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[styles.chipText, selected && styles.chipTextSelected]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="juan@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>PREFERENCES</Text>

            {/* ---- Switch: ON/OFF notifications ---- */}
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.switchTitle}>Receive Notifications</Text>
                <Text style={styles.switchHint}>
                  Get updates about enrollment and grades.
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#D1D5DB', true: colors.primaryBorder }}
                thumbColor={notifications ? colors.primary : colors.inputBg}
                ios_backgroundColor="#D1D5DB"
              />
            </View>

            {/* ---- Terms: a checkbox built with Pressable ---- */}
            <Pressable
              onPress={() => setAgreed(!agreed)}
              style={({ pressed }) => [
                styles.termsRow,
                agreed && styles.termsRowChecked,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.link}>Terms and Conditions</Text>{' '}
                and the Privacy Policy.
              </Text>
            </Pressable>

            {/* ---- PART 7 - REGISTER moves us to the Summary Screen ---- */}
            <View style={styles.buttonWrap}>
              <Button
                title="REGISTER"
                color={colors.primary}
                onPress={handleRegister}
              />
            </View>

            <Pressable style={styles.footerLink} onPress={() => {}}>
              <Text style={styles.footerText}>
                Already registered? <Text style={styles.link}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexWide: { flex: 1.6 },
  gap: { width: spacing.md },
  pressed: { opacity: 0.7 },

  screen: { flex: 1, backgroundColor: colors.primary },
  scrollBody: { paddingBottom: 40, backgroundColor: colors.screen },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: 46,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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

  sectionLabel: {
    fontSize: font.section,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: spacing.lg - 2,
  },

  field: { marginBottom: spacing.lg },
  row: { flexDirection: 'row' },

  label: {
    fontSize: font.label,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 7,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg - 2,
    fontSize: font.input,
    color: colors.text,
  },

  chipRow: { flexDirection: 'row' },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    marginRight: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: font.body, color: colors.muted, fontWeight: '600' },
  chipTextSelected: { color: colors.primaryDark },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.placeholder,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 18,
    marginTop: 2,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg - 2,
    marginBottom: spacing.md,
  },
  switchTitle: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: font.small, color: colors.placeholder, marginTop: 3 },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg - 2,
    marginBottom: 22,
  },
  termsRowChecked: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.placeholder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: font.body,
    fontWeight: '900',
    lineHeight: 17,
  },
  termsText: {
    flex: 1,
    fontSize: font.label,
    color: '#4B5563',
    lineHeight: 18,
  },
  link: { color: colors.primary, fontWeight: '700' },

  // the built-in Button cannot take a borderRadius, so we round the
  // wrapper and clip the button inside it
  buttonWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    backgroundColor: Platform.OS === 'ios' ? colors.primary : 'transparent',
  },

  footerLink: { alignItems: 'center', marginTop: spacing.lg },
  footerText: { fontSize: font.label, color: colors.muted },
});
