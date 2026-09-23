// Babel config for BoardEase.
//
// Only the Expo preset is listed on purpose. babel-preset-expo 57 already
// detects react-native-worklets (which Reanimated 4 depends on) and adds its
// plugin for us -- see babel-preset-expo/build/configs/expo.js, "Automatically
// add worklets or reanimated plugin when package is installed".
//
// So do NOT add 'react-native-reanimated/plugin' or
// 'react-native-worklets/plugin' here. That is advice written for Reanimated 2
// and 3; on this setup it applies the plugin twice and the bundle fails.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
