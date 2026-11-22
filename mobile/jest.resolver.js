const resolveReactNative = require('@react-native/jest-preset/jest/resolver');
const resolveWorklets = require('react-native-worklets/jest/resolver');

// Worklets must use its JavaScript runtime in Jest. Preserve React Native's
// resolver as well so native subpaths remain available to existing mocks.
module.exports = (request, options) =>
  resolveWorklets(request, {
    ...options,
    defaultResolver: (moduleName, workletsOptions) =>
      resolveReactNative(moduleName, {
        ...workletsOptions,
        defaultResolver: options.defaultResolver,
      }),
  });
