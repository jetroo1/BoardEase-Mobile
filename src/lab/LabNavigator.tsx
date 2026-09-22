// LAB 3 - the navigation setup.
//
// A "stack" navigator puts screens on top of each other like cards.
// navigate() adds a card on top, goBack() removes the top card - which is
// what makes the Android back button and the back swipe work for free.
//
// Registration -> REGISTER -> Summary -> VIEW PROFILE -> Welcome

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { LabStackParamList } from './types';
import RegistrationScreen from './RegistrationScreen';
import SummaryScreen from './SummaryScreen';
import WelcomeScreen from './WelcomeScreen';

const Stack = createNativeStackNavigator<LabStackParamList>();

export default function LabNavigator() {
  return (
    <NavigationContainer>
      {/* headerShown: false because each screen draws its own indigo
          header with its own Back button, so the design stays consistent */}
      <Stack.Navigator
        initialRouteName="Registration"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Registration" component={RegistrationScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
