module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its babel plugin into react-native-worklets. Must stay last.
    plugins: ['react-native-worklets/plugin'],
  };
};
