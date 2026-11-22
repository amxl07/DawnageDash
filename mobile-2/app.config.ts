import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Dawnage',
  slug: 'dawnage-mobile-2',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'dawnage',
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-dev-client'],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.dawnage.mobile2',
  },
  android: {
    package: 'com.dawnage.mobile2',
  },
};

export default config;
