import type { ConfigContext } from 'expo/config';
import appConfig from '../../app.config';

const original = { ...process.env };
const context: ConfigContext = { projectRoot: '/test', staticConfigPath: '/test/app.json', packageJsonPath: '/test/package.json', config: { name: 'Dawnage', slug: 'dawnage', ios: { supportsTablet: false }, extra: { existing: true } } };
afterEach(() => { process.env = { ...original }; });
beforeEach(() => { delete process.env.EAS_BUILD; delete process.env.APP_VARIANT; delete process.env.SENTRY_ORG; delete process.env.SENTRY_PROJECT; });

it('keeps the production identity and existing platform settings by default', () => {
  const config = appConfig(context);
  expect(config.ios).toMatchObject({ bundleIdentifier: 'com.dawnage.app', supportsTablet: false });
  expect(config.extra).toMatchObject({ existing: true, appVariant: 'production' });
});
it.each([['development', '.dev', 'dawnage-dev'], ['preview', '.preview', 'dawnage-preview']])('isolates %s installs and recovery links', (variant, suffix, scheme) => {
  process.env.APP_VARIANT = variant;
  const config = appConfig(context);
  expect(config.ios?.bundleIdentifier).toBe(`com.dawnage.app${suffix}`);
  expect(config.android?.package).toBe(`com.dawnage.app${suffix}`);
  expect(config.scheme).toBe(scheme);
});
it('rejects misspelled environments instead of silently using production', () => {
  process.env.APP_VARIANT = 'preveiw';
  expect(() => appConfig(context)).toThrow('APP_VARIANT');
});
it('rejects unconfigured or fictional production cloud builds without printing credentials', () => {
  process.env.EAS_BUILD = 'true';
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://preview.invalid';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'fictional-key';
  expect(() => appConfig(context)).toThrow('Configure the production Supabase');
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  expect(appConfig(context).name).toBe('Dawnage');
});
it('rejects a preview cloud build without its backend configuration', () => {
  process.env.APP_VARIANT = 'preview';
  process.env.EAS_BUILD = 'true';
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  expect(() => appConfig(context)).toThrow('Configure the preview Supabase');
});
it('requires a real HTTPS backend and public key for preview cloud builds', () => {
  process.env.APP_VARIANT = 'preview';
  process.env.EAS_BUILD = 'true';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'fictional-public-key';
  for (const url of ['https://preview.invalid', 'http://localhost:54321', 'not-a-url']) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = url;
    expect(() => appConfig(context)).toThrow('Configure the preview Supabase');
  }
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '   ';
  expect(() => appConfig(context)).toThrow('Configure the preview Supabase');
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'fictional-public-key';
  expect(appConfig(context).name).toBe('Dawnage Preview');
});
