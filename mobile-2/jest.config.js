/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  passWithNoTests: true,
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  watchman: false,
};
