// The bottom tab bar shown once the user is logged in. Each tab is one of
// our main "hub" screens. Screens that aren't in this list (Details, Map,
// Filter, Compare, Navigation, Reviews, Admin) are opened on top of the
// tabs from RootNavigator instead -- see that file for why.
//
// Drawn by hand as a floating pill rather than left at its defaults. A stock
// tab bar is one of the clearest tells that an app was never designed: system
// font, system grey, a hairline nobody chose. This one detaches from the
// bottom edge, rounds fully, and marks the active tab with a filled brand
// circle so the current position is obvious from shape as well as colour.
//
// Icon-only, like the reference designs. That is only acceptable because every
// tab carries an accessibilityLabel -- an unlabelled icon is ambiguous to a
// screen reader and often to a person too.

import React from 'react';
import { View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MapScreen from '../screens/MapScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { GUTTER, HIT_SLOP_MIN } from '../theme';
import { Pressable } from '../components/ui';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// `centre: true` marks the raised hero button in the middle of the bar -- the
// standout circle every one of the reference designs has. Only one tab gets
// it, because its whole job is to be the single most reachable action.
const TAB_META: Record<
  keyof MainTabParamList,
  { active: IoniconName; inactive: IoniconName; label: string; centre?: boolean }
> = {
  Home: { active: 'home', inactive: 'home-outline', label: 'Home' },
  Search: { active: 'search', inactive: 'search-outline', label: 'Search' },
  Map: { active: 'map', inactive: 'map-outline', label: 'Map of nearby boarding houses', centre: true },
  Favorites: { active: 'heart', inactive: 'heart-outline', label: 'Saved listings' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function BoardEaseTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      // Reserve the bar's actual height so content cannot sit underneath it.
      style={{
        paddingHorizontal: GUTTER,
        paddingTop: t.spacing.xs,
        paddingBottom: Math.max(insets.bottom, t.spacing.sm),
        backgroundColor: t.colors.canvas,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.pill,
          paddingHorizontal: t.spacing.xs,
          paddingVertical: t.spacing.xs,
          // In dark mode a shadow against a near-black canvas does nothing,
          // so the bar is separated from the page by a border instead.
          borderWidth: t.isDark ? 1 : 0,
          borderColor: t.colors.line,
          ...t.elevation.high,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name as keyof MainTabParamList];
          const focused = state.index === index;

          function onPress() {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: HIT_SLOP_MIN,
              }}
            >
              <View
                collapsable={false}
                style={{
                  // The centre button is bigger and always filled, whether or
                  // not it is the current tab -- it reads as an action, not as
                  // a position indicator like the others.
                  width: meta.centre ? 54 : 44,
                  height: meta.centre ? 54 : 44,
                  borderRadius: meta.centre ? 27 : 22,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    meta.centre || focused ? t.colors.brand : 'transparent',
                  // Lifts out of the bar so it breaks the pill's outline,
                  // which is what makes it read as the hero control.
                  ...(meta.centre
                    ? { marginTop: -t.spacing.lg, ...t.elevation.medium }
                    : null),
                  ...(meta.centre
                    ? {
                        borderWidth: 4,
                        borderColor: t.colors.surface,
                      }
                    : null),
                }}
              >
                <Ionicons
                  name={focused ? meta.active : meta.inactive}
                  size={meta.centre ? 24 : 21}
                  color={
                    meta.centre || focused ? t.colors.onBrand : t.colors.inkFaint
                  }
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BoardEaseTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
