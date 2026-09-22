// Profile / Settings screen: shows the logged-in user's basic Firebase
// Auth info and lets them log out. If they are an admin, a button here
// takes them to the Admin screen.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const { user, role, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={colors.white} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{role}</Text>

        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{user?.uid}</Text>
      </View>

      {role === 'admin' && (
        <Pressable style={styles.adminButton} onPress={() => navigation.navigate('Admin')}>
          <Ionicons name="shield-checkmark" size={18} color={colors.deep} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </Pressable>
      )}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={colors.white} />
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist, padding: spacing.lg - 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: spacing.md, color: colors.ink },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg - 4 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  label: { fontSize: 12, color: colors.muted, marginTop: spacing.sm + 2 },
  value: { fontSize: 15, fontWeight: '600', color: colors.ink },
  adminButton: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm + 4,
  },
  adminButtonText: { color: colors.deep, fontWeight: 'bold' },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  logoutButtonText: { color: colors.white, fontWeight: 'bold' },
});
