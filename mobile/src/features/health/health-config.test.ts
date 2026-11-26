import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { AndroidConfig, compileModsAsync, withPlugins, type ConfigPlugin } from '@expo/config-plugins';
// Jest substitutes createRequire with its own resolver, which selects the app's
// RN package instead of the temporary project. Prebuild uses Node's real resolver.
jest.mock('node:module', () => process.getBuiltinModule('module'));
const withHealthAccess = require('../../../plugins/with-health-access');
const { configureHealthManifest, healthRationaleSource } = withHealthAccess;
const withHealthConnect = require('react-native-health-connect/app.plugin.js');
const root = path.resolve(__dirname, '../../..');
const appConfig = require('../../../app.config').default;
const baseConfig = require('../../../app.json').expo;
it('moves the rationale filter and retargets the exact Android 14 alias without duplicates', () => {
  const manifest = { manifest: { application: [{ $: { 'android:name': '.MainApplication' }, activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }] }, { action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }] }] }], 'activity-alias': [{ $: { 'android:name': 'ViewPermissionUsageActivity', 'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE', 'android:targetActivity': '.MainActivity', 'android:exported': 'true' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }], category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }] }] }] }] } };
  configureHealthManifest(manifest); configureHealthManifest(manifest);
  const app = manifest.manifest.application[0];
  expect(app.activity).toHaveLength(2);
  expect(app.activity[0]['intent-filter']).toHaveLength(1);
  expect(app['activity-alias']).toHaveLength(1);
  expect(app['activity-alias'][0].$).toEqual({ 'android:name': 'ViewPermissionUsageActivity', 'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE', 'android:targetActivity': '.HealthAccessActivity', 'android:exported': 'true' });
});
it.each(['dawnage', 'dawnage-dev', 'dawnage-preview'])('forwards cold and warm rationale entry to the public route using %s', scheme => {
  const source = healthRationaleSource('com.dawnage.app', scheme);
  expect(source).toContain(`Uri.parse("${scheme}://health-access")`);
  expect(source).toContain('Intent.ACTION_VIEW');
  expect(source).toContain('Intent.FLAG_ACTIVITY_SINGLE_TOP');
  expect(source).toContain('finish()');
});
it('config declares only intended read permissions and disables HealthKit writes/background', () => {
  const config = appConfig({ config: baseConfig });
  expect(config.android.permissions.filter((p: string) => p.startsWith('android.permission.health.'))).toEqual([
    'android.permission.health.READ_WEIGHT', 'android.permission.health.READ_STEPS',
    'android.permission.health.READ_NUTRITION', 'android.permission.health.READ_HYDRATION',
  ]);
  const healthKit = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === '@kingstinct/react-native-healthkit');
  expect(healthKit[1]).toEqual(expect.objectContaining({ NSHealthUpdateUsageDescription: false, background: false }));
  expect(config.plugins.indexOf('react-native-health-connect')).toBeLessThan(config.plugins.indexOf('./plugins/with-health-access'));
  expect(fs.existsSync(path.join(root, 'app/health-access.tsx'))).toBe(true);
});
it.each([['production', 'dawnage'], ['development', 'dawnage-dev'], ['preview', 'dawnage-preview']])('keeps the health rationale scheme aligned with %s app identity', (variant, scheme) => {
  const previous = process.env.APP_VARIANT;
  try {
    process.env.APP_VARIANT = variant;
    const config = appConfig({ config: baseConfig });
    expect(config.scheme).toBe(scheme);
    expect(healthRationaleSource(config.android.package, config.scheme)).toContain(`Uri.parse("${scheme}://health-access")`);
  } finally {
    if (previous === undefined) delete process.env.APP_VARIANT; else process.env.APP_VARIANT = previous;
  }
});

const manifestTemplate = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.dawnage.fixture">
  <application android:name=".MainApplication">
    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>`;

const sdkCases = [
  { label: 'required floor', frameworkMin: 24, configuredMin: undefined, expectedMin: 26 },
  { label: 'lower explicit minimum', frameworkMin: 24, configuredMin: 24, expectedMin: 26 },
  { label: 'higher explicit minimum', frameworkMin: 24, configuredMin: 29, expectedMin: 29 },
  { label: 'newer framework minimum', frameworkMin: 30, configuredMin: undefined, expectedMin: 30 },
  { label: 'newer framework over older explicit minimum', frameworkMin: 30, configuredMin: 28, expectedMin: 30 },
  { label: 'explicit minimum above newer framework', frameworkMin: 30, configuredMin: 31, expectedMin: 31 },
];
const compilationCases = (['declared', 'reversed'] as const).flatMap(order => sdkCases.map(sdk => ({ ...sdk, order })));
it.each(compilationCases)('compiles the real health plugin chain in $order order with $label, including repeated native generation', async ({ order, frameworkMin, configuredMin, expectedMin }) => {
  const projectRoot = await fs.promises.mkdtemp(path.join(tmpdir(), 'dawnage-health-mods-'));
  const mainPath = path.join(projectRoot, 'android/app/src/main');
  const manifestPath = path.join(mainPath, 'AndroidManifest.xml');
  const sourcePath = path.join(mainPath, 'java/com/dawnage/fixture/HealthAccessActivity.kt');
  const gradlePath = path.join(projectRoot, 'android/gradle.properties');
  const reactNativePath = path.join(projectRoot, 'node_modules/react-native');
  const propertiesTemplate = `# Existing Android settings\nandroid.compileSdkVersion=36\nandroid.targetSdkVersion=36\nnewArchEnabled=true\n${configuredMin === undefined ? '' : `android.minSdkVersion=${configuredMin}\n`}`;
  const otherProperties = AndroidConfig.Properties.parsePropertiesFile(propertiesTemplate).filter(item => item.type !== 'property' || item.key !== 'android.minSdkVersion');
  try {
    await fs.promises.mkdir(mainPath, { recursive: true });
    // No rationale action, forwarding Activity or alias is supplied by the fixture.
    // The installed HC plugin must create its declarations inside the real mod chain.
    await fs.promises.writeFile(manifestPath, manifestTemplate);
    await fs.promises.writeFile(gradlePath, propertiesTemplate);
    // Resolve the framework catalog from this project, like Expo's Gradle plugin.
    // A future framework fixture proves the health floor cannot lower its minimum.
    await fs.promises.mkdir(path.join(reactNativePath, 'gradle'), { recursive: true });
    await fs.promises.writeFile(path.join(reactNativePath, 'package.json'), JSON.stringify({ name: 'react-native', version: 'fixture' }));
    await fs.promises.writeFile(path.join(reactNativePath, 'gradle/libs.versions.toml'), `[versions]\nminSdk = "${frameworkMin}"\ncompileSdk = "36"\ntargetSdk = "36"\n\n[libraries]\nminSdk = "1"\n`);
    expect(fs.realpathSync(createRequire(path.join(projectRoot, 'package.json')).resolve('react-native/package.json'))).toBe(fs.realpathSync(path.join(reactNativePath, 'package.json')));
    let previousManifest: string | undefined;
    let previousProperties: string | undefined;
    for (let pass = 0; pass < 2; pass += 1) {
      const plugins: ConfigPlugin[] = order === 'declared'
        ? [withHealthConnect, withHealthAccess]
        : [withHealthAccess, withHealthConnect];
      const config = withPlugins({ name: 'Dawnage fixture', slug: 'dawnage-fixture', scheme: 'dawnage-dev', android: { package: 'com.dawnage.fixture' }, _internal: { projectRoot } }, plugins);
      await compileModsAsync(config, { projectRoot, platforms: ['android'] });
      const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
      const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
      const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
      expect(main['intent-filter']?.flatMap(filter => filter.action ?? []).map(action => action.$['android:name'])).toEqual(['android.intent.action.MAIN']);
      expect(main['intent-filter']?.[0].category?.[0].$['android:name']).toBe('android.intent.category.LAUNCHER');
      const forwarding = app.activity?.filter(activity => activity.$['android:name'] === '.HealthAccessActivity') ?? [];
      expect(forwarding).toHaveLength(1);
      expect(forwarding[0].$).toEqual({ 'android:name': '.HealthAccessActivity', 'android:exported': 'true', 'android:noHistory': 'true', 'android:excludeFromRecents': 'true' });
      expect(forwarding[0]['intent-filter']?.[0].action?.[0].$['android:name']).toBe('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE');
      const aliases = app['activity-alias']?.filter(alias => alias.$?.['android:name'] === 'ViewPermissionUsageActivity') ?? [];
      expect(aliases).toHaveLength(1);
      expect(aliases[0].$).toEqual({ 'android:name': 'ViewPermissionUsageActivity', 'android:exported': 'true', 'android:targetActivity': '.HealthAccessActivity', 'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE' });
      expect(aliases[0]['intent-filter']?.[0].action?.[0].$['android:name']).toBe('android.intent.action.VIEW_PERMISSION_USAGE');
      expect(aliases[0]['intent-filter']?.[0].category?.[0].$['android:name']).toBe('android.intent.category.HEALTH_PERMISSIONS');
      const xml = await fs.promises.readFile(manifestPath, 'utf8');
      expect(xml.indexOf('android:name=".HealthAccessActivity"')).toBeLessThan(xml.indexOf('<activity-alias'));
      if (previousManifest !== undefined) expect(xml).toBe(previousManifest);
      previousManifest = xml;
      const propertiesSource = await fs.promises.readFile(gradlePath, 'utf8');
      const properties = AndroidConfig.Properties.parsePropertiesFile(propertiesSource);
      expect(properties.filter(item => item.type === 'property' && item.key === 'android.minSdkVersion')).toEqual([
        { type: 'property', key: 'android.minSdkVersion', value: String(expectedMin) },
      ]);
      expect(properties.filter(item => item.type !== 'property' || item.key !== 'android.minSdkVersion')).toEqual(otherProperties);
      if (previousProperties !== undefined) expect(propertiesSource).toBe(previousProperties);
      previousProperties = propertiesSource;
      const source = await fs.promises.readFile(sourcePath, 'utf8');
      expect(source).toContain('package com.dawnage.fixture');
      expect(source).toContain('Uri.parse("dawnage-dev://health-access")');
      expect(source).toContain('Intent(this, MainActivity::class.java)');
      expect(source).toContain('Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP');
    }
  } finally { await fs.promises.rm(projectRoot, { recursive: true, force: true }); }
});
