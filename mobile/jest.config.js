module.exports = {
  // Keep Haste's native file crawl out of exported bundles and native build trees.
  roots: ['<rootDir>/src', '<rootDir>/app'],
  preset: 'jest-expo',
  resolver: '<rootDir>/jest.resolver.js',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
};
