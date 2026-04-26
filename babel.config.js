module.exports = function (api) {
  api.cache(true)
  // Skip nativewind/babel in test env — it pulls in react-native-worklets/plugin
  // which is native-only and unavailable in Node/Jest.
  if (process.env.NODE_ENV === 'test') {
    return { presets: ['babel-preset-expo'] }
  }
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
