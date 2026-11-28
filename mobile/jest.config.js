module.exports = {
  // Keep Haste's native file crawl out of exported bundles and native build trees.
  roots: ['<rootDir>/src', '<rootDir>/app'],
  preset: 'jest-expo',
  resolver: '<rootDir>/jest.resolver.js',
  // ../shared has no node_modules of its own; resolve its Babel helpers from the app's (CI/EAS install only mobile/).
  modulePaths: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Jest executes CommonJS; the React Native export condition otherwise selects Lucide's .mjs bundle.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
};
