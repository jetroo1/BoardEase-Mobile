// Landing screen: the first thing people see, before logging in.
// This mirrors the Laravel web app's welcome page (resources/views/welcome.blade.php)
// -- same BoardEase branding and message, just rebuilt as a simple RN screen
// instead of an HTML page. Booking/messaging mentions from the web copy are
// left out here since this mobile app is discovery-only (no booking/chat).
//
// This is the only screen where a first impression is the entire job, so it
// gets a full-bleed gradient hero. The rest of the app is restrained by
// comparison, which is what makes this one land.
import React from 'react';
import { ImageBackground, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { Button, Screen, Text, ThemeToggle } from '../components/ui';

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const t = useTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: GUTTER, paddingVertical: t.spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="captionStrong" tone="brand">Tagum City</Text>
          <ThemeToggle />
        </View>
        <ImageBackground source={require('../../assets/welcome-room.jpg')} resizeMode="cover"
          accessibilityLabel="A furnished room interior"
          style={{ minHeight: 240, justifyContent: 'flex-end' }}>
          <View style={{ padding: GUTTER, backgroundColor: 'rgba(0,0,0,0.52)', gap: t.spacing.xxs }}>
            <Text variant="display" style={{ color: '#FFFFFF' }}>BoardEase</Text>
            <Text variant="body" style={{ color: '#FFFFFF' }}>Boarding houses in Tagum City</Text>
          </View>
        </ImageBackground>
        <View style={{ padding: GUTTER, gap: t.spacing.md }}>
          <Text variant="heading">Find a place that fits your budget.</Text>
          <Button label="Get started" icon="arrow-forward" iconPosition="right" fullWidth onPress={() => navigation.navigate('Register')} />
          <Button label="Log in" variant="secondary" fullWidth onPress={() => navigation.navigate('Login')} />
          <Text variant="caption" tone="soft" center>Booking and payments are arranged directly with the owner.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
