// The Terms of Use and the Privacy Notice.
//
// Reachable from the consent line on Register before an account exists, and
// from Profile afterwards, so the documents someone agreed to are never
// something they have to take on trust or go looking for on a website.
//
// Both documents are on one screen behind a pair of tabs rather than on two
// screens. People sent here by the consent line usually want to glance at both
// before they tick the box, and a back-and-forth through the navigator to do
// that is friction in exactly the wrong place.
//
// The words come from src/legal.ts, which also carries the version recorded
// against each account at sign-up.

import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { GUTTER } from '../theme';
import { LEGAL_DOCUMENTS, LEGAL_VERSION, LegalKey } from '../legal';
import { Pressable, Screen, ScreenHeader, Text } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LegalRouteProp = RouteProp<RootStackParamList, 'Legal'>;

const TABS: { key: LegalKey; label: string }[] = [
  { key: 'terms', label: 'Terms of Use' },
  { key: 'privacy', label: 'Privacy Notice' },
];

export default function LegalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LegalRouteProp>();
  const t = useTheme();

  const [active, setActive] = useState<LegalKey>(route.params?.document ?? 'terms');
  const document = LEGAL_DOCUMENTS[active];

  return (
    <Screen>
      <ScreenHeader onBack={() => navigation.goBack()} showThemeToggle />

      <View style={{ paddingHorizontal: GUTTER, gap: t.spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: t.colors.canvasAlt,
            borderRadius: t.radius.pill,
            padding: 4,
          }}
        >
          {TABS.map((tab) => {
            const selected = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActive(tab.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: t.spacing.xs,
                  borderRadius: t.radius.pill,
                  backgroundColor: selected ? t.colors.surface : 'transparent',
                  ...(selected ? t.elevation.low : null),
                }}
              >
                <Text variant="captionStrong" tone={selected ? 'brand' : 'soft'}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: t.spacing.md,
          paddingBottom: t.spacing.xxl,
          gap: t.spacing.md,
        }}
      >
        <View style={{ gap: t.spacing.xxs }}>
          <Text variant="display">{document.title}</Text>
          <Text variant="body" tone="soft">{document.summary}</Text>
          {/* Stated on the page, not only in the database. Somebody asking
              "what did I agree to?" should be able to answer it here. */}
          <Text variant="caption" tone="faint">Version {LEGAL_VERSION}</Text>
        </View>

        {document.sections.map((section) => (
          <View key={section.heading} style={{ gap: t.spacing.xxs }}>
            <Text variant="bodyStrong">{section.heading}</Text>
            <Text variant="body" tone="soft">{section.body}</Text>
          </View>
        ))}

        <View
          style={{
            backgroundColor: t.colors.canvasAlt,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.line,
            padding: t.spacing.md,
            gap: t.spacing.xxs,
          }}
        >
          <Text variant="bodyStrong">Questions about your information</Text>
          <Text variant="caption" tone="soft">
            Ask through the account you signed up with, and we will answer within
            the period the Data Privacy Act allows. You may also raise a concern
            with the National Privacy Commission.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
