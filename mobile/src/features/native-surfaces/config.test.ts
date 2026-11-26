import type { ConfigContext } from 'expo/config';
import appConfig from '../../../app.config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import plist from '@expo/plist';

const initial = { ...process.env };
afterEach(() => { process.env = { ...initial }; });
it.each([['development', '.dev'], ['preview', '.preview'], ['production', '']])('isolates the %s extension and app group with two real widget kinds', (variant, suffix) => {
  process.env.APP_VARIANT = variant; delete process.env.EAS_BUILD;
  const config = appConfig({ config: { name: 'Dawnage', slug: 'dawnage' } } as ConfigContext);
  const plugin = config.plugins?.find((entry) => Array.isArray(entry) && entry[0] === 'expo-widgets') as [string, any];
  expect(plugin[1]).toMatchObject({ bundleIdentifier: `com.dawnage.app${suffix}.widgets`, groupIdentifier: `group.com.dawnage.app${suffix}`, enablePushNotifications: false, enableAndroid: false });
  expect(plugin[1].widgets.map((widget: any) => widget.name)).toEqual(['DawnageCheckIn', 'DawnageTraining']);
  for (const widget of plugin[1].widgets) expect(widget.ios.supportedFamilies).toEqual(['systemSmall', 'accessoryCircular', 'accessoryRectangular', 'accessoryInline']);
});

it('generates a WidgetKit extension, shared group and the ActivityKit host registration', async () => {
  process.env.APP_VARIANT = 'development'; delete process.env.EAS_BUILD;
  const config = appConfig({ config: { name: 'Dawnage', slug: 'dawnage' } } as ConfigContext);
  const options = (config.plugins!.find((entry) => Array.isArray(entry) && entry[0] === 'expo-widgets') as [string, any])[1];
  // Run the installed plugin's file generation against a disposable native tree.
  const sourcePlugin = require('expo-widgets/plugin/build/ios/withWidgetSourceFiles').default;
  const infoPlugin = require('expo-widgets/plugin/build/ios/withAppInfoPlist').default;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dawnage-widget-plugin-'));
  try {
    const generated = sourcePlugin({ ...config }, { targetName: 'ExpoWidgetsTarget', widgets: options.widgets, groupIdentifier: options.groupIdentifier, onFilesGenerated: () => {} });
    await generated.mods.ios.dangerous({ ...generated, modResults: {}, modRequest: { platform: 'ios', platformProjectRoot: directory, projectRoot: directory } });
    const target = path.join(directory, 'ExpoWidgetsTarget');
    expect(fs.readdirSync(target).sort()).toEqual(['DawnageCheckIn.swift', 'DawnageTraining.swift', 'ExpoWidgetsTarget.entitlements', 'Info.plist', 'index.swift']);
    expect(plist.parse(fs.readFileSync(path.join(target, 'Info.plist'), 'utf8'))).toMatchObject({ NSExtension: { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' }, ExpoWidgetsAppGroupIdentifier: 'group.com.dawnage.app.dev' });
    expect(plist.parse(fs.readFileSync(path.join(target, 'ExpoWidgetsTarget.entitlements'), 'utf8'))).toEqual({ 'com.apple.security.application-groups': ['group.com.dawnage.app.dev'] });
    const configured = infoPlugin({ ...config }, options);
    const result = await configured.mods.ios.infoPlist({ ...configured, modResults: {}, modRequest: { platform: 'ios' } });
    expect(result.modResults).toMatchObject({ NSSupportsLiveActivities: true, NSSupportsLiveActivitiesFrequentUpdates: false });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
