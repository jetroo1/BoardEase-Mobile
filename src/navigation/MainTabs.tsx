// The bottom tab bar shown once the user is logged in. Each tab is one of
// our main "hub" screens. Screens that aren't in this list (Details, Map,
// Filter, Compare, Navigation, Reviews, Admin) are opened on top of the
// tabs from RootNavigator instead -- see that file for why.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { MainTabParamList } from './types';
import { colors } from '../theme';

// Which Ionicons icon to show for each tab. Using the "-outline" version
// when the tab isn't focused and the filled version when it is, matching
// the classic native tab bar look.
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Favorites: { active: 'heart', inactive: 'heart-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sky,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
