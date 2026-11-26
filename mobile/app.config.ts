import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const candidate = process.env.APP_VARIANT ?? 'production';
  if (!['development', 'preview', 'production'].includes(candidate)) {
    throw new Error('APP_VARIANT must be development, preview or production.');
  }
  const variant = candidate as Variant;
  const suffix = variant === 'production' ? '' : variant === 'development' ? '.dev' : '.preview';
  // Installable previews and production builds need a working backend configuration.
  if (process.env.EAS_BUILD === 'true' && variant !== 'development') {
    // This is Node build configuration, not Metro's virtual public-env module.
    const buildEnvironment = process.env;
    const url = buildEnvironment.EXPO_PUBLIC_SUPABASE_URL;
    const key = buildEnvironment.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    let valid = false;
    try {
      const parsed = new URL(url ?? '');
      valid = parsed.protocol === 'https:' && !parsed.hostname.endsWith('.invalid') && parsed.hostname !== 'localhost';
    } catch { /* Build error below never prints configuration values. */ }
    if (!valid || !key?.trim()) throw new Error(`Configure the ${variant} Supabase URL and public anon key in EAS before building.`);
    // Both stores reject apps without an in-app privacy policy link.
    if (variant === 'production' && !/^https:\/\/\S+$/.test(buildEnvironment.EXPO_PUBLIC_PRIVACY_URL ?? '')) {
      throw new Error('Configure EXPO_PUBLIC_PRIVACY_URL (https) in the EAS production environment before building.');
    }
  }

  const plugins = [...(config.plugins ?? [])];
  plugins.push(
    ['@kingstinct/react-native-healthkit', {
      NSHealthShareUsageDescription: 'Dawnage reads your weight, steps, food intake and water for you to review. Chosen values enter your daily check-in and are shared with your coach when you submit.',
      NSHealthUpdateUsageDescription: false,
      background: false,
    }],
    'react-native-health-connect',
    './plugins/with-health-access',
    ['expo-widgets', {
      bundleIdentifier: `com.dawnage.app${suffix}.widgets`,
      groupIdentifier: `group.com.dawnage.app${suffix}`,
      enablePushNotifications: false,
      frequentUpdates: false,
      enableAndroid: false,
      widgets: [
        { name: 'DawnageCheckIn', displayName: 'Daily check-in', description: 'Open your Dawnage daily check-in.', ios: { supportedFamilies: ['systemSmall', 'accessoryCircular', 'accessoryRectangular', 'accessoryInline'] } },
        { name: 'DawnageTraining', displayName: 'Training', description: 'Open your Dawnage training plan and history.', ios: { supportedFamilies: ['systemSmall', 'accessoryCircular', 'accessoryRectangular', 'accessoryInline'] } },
      ],
    }],
  );
  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push(['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]);
  }
  return {
    ...config,
    name: variant === 'production' ? 'Dawnage' : variant === 'development' ? 'Dawnage Dev' : 'Dawnage Preview',
    slug: config.slug ?? 'dawnage',
    scheme: variant === 'production' ? 'dawnage' : `dawnage-${variant === 'development' ? 'dev' : 'preview'}`,
    ios: { ...config.ios, bundleIdentifier: `com.dawnage.app${suffix}` },
    android: {
      ...config.android, package: `com.dawnage.app${suffix}`,
      permissions: [...new Set([...(config.android?.permissions ?? []),
        'android.permission.health.READ_WEIGHT',
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_NUTRITION',
        'android.permission.health.READ_HYDRATION',
      ])],
    },
    extra: { ...config.extra, appVariant: variant },
    plugins,
  };
}
