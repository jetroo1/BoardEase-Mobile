// The very top of the app.
//
// Right now this project is running BOARDEASE (the CCE106 project).
//
// ---------------------------------------------------------------------
// TO GO BACK TO THE SCHOOL LAB (the 3-screen Student Registration App
// in src/lab):
//   1. uncomment the LabNavigator import on the next line
//   2. uncomment the LabNavigator return at the bottom
//   3. delete (or comment out) the BoardEaseApp lines
// ---------------------------------------------------------------------
//
// Why it is done with comments instead of an if/else: Metro bundles every
// file that is imported, even when an if-statement never reaches it. While
// the BoardEase import was here, one broken BoardEase dependency was enough
// to stop the lab from loading -- and the other way round too.

import React from 'react';
import BoardEaseApp from './src/BoardEaseApp';

// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import LabNavigator from './src/lab/LabNavigator';

export default function App() {
  // --- BOARDEASE ---
  return <BoardEaseApp />;

  // --- SCHOOL LAB ---
  // return (
  //   <SafeAreaProvider>
  //     <LabNavigator />
  //   </SafeAreaProvider>
  // );
}
