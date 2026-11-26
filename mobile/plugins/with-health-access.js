const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const path = require('node:path');
const { AndroidConfig, withBaseMod, withDangerousMod } = require('@expo/config-plugins');

const RATIONALE = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const ACTIVITY = '.HealthAccessActivity';
const MIN_SDK_PROPERTY = 'android.minSdkVersion';
function sdkInteger(value, source) {
  const text = String(value).trim();
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1) throw new Error(`Invalid Android minimum SDK in ${source}.`);
  return number;
}
async function frameworkMinSdk(projectRoot) {
  // Expo's useExpoVersionCatalog reads this same project-resolved RN catalog.
  // Do not hard-code its default: a future RN minimum must not be lowered to 26.
  const reactNative = path.dirname(createRequire(path.join(projectRoot, 'package.json')).resolve('react-native/package.json'));
  const catalogPath = path.join(reactNative, 'gradle/libs.versions.toml');
  const catalog = await fs.readFile(catalogPath, 'utf8');
  const versions = catalog.split(/^\s*\[versions\]\s*$/m)[1]?.split(/^\s*\[/m)[0];
  const value = versions?.match(/^\s*minSdk\s*=\s*(["'])(\d+)\1\s*(?:#.*)?$/m)?.[2];
  // Fail clearly if the framework changes its catalog format instead of guessing
  // a lower default and producing a misleadingly successful prebuild.
  if (value === undefined) throw new Error(`Cannot read the React Native minimum SDK from ${catalogPath}.`);
  return sdkInteger(value, catalogPath);
}
function configureHealthManifest(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  main['intent-filter'] = (main['intent-filter'] ?? []).flatMap(filter => {
    const actions = (filter.action ?? []).filter(action => action.$['android:name'] !== RATIONALE);
    return actions.length ? [{ ...filter, action: actions }] : [];
  });
  app.activity ??= [];
  if (!app.activity.some(activity => activity.$['android:name'] === ACTIVITY)) app.activity.push({
    $: { 'android:name': ACTIVITY, 'android:exported': 'true', 'android:noHistory': 'true', 'android:excludeFromRecents': 'true' },
    'intent-filter': [{ action: [{ $: { 'android:name': RATIONALE } }] }],
  });
  // The package supplies the alias's exact permission/action/category. Keep it.
  const alias = (app['activity-alias'] ?? []).find(activity => activity.$['android:name'] === 'ViewPermissionUsageActivity');
  if (!alias) throw new Error('Configure react-native-health-connect before with-health-access.');
  alias.$['android:targetActivity'] = ACTIVITY;
  // XML serializer preserves object-key order. Target Activity must precede alias.
  const aliases = app['activity-alias'];
  delete app['activity-alias'];
  app['activity-alias'] = aliases;
  return manifest;
}
function healthRationaleSource(packageName, scheme) {
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(packageName) || !/^[a-z][a-z0-9+.-]*$/.test(scheme)) throw new Error('Invalid health rationale package or scheme.');
  return `package ${packageName}

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/** Both Health Connect rationale entry points forward to a public Expo route. */
class HealthAccessActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startActivity(Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("${scheme}://health-access")
      addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    })
    finish()
  }
}
`;
}
function withHealthAccess(config) {
  const packageName = config.android?.package;
  const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
  if (!packageName || !scheme) throw new Error('Health rationale requires an Android package and active variant scheme.');
  const source = healthRationaleSource(packageName, scheme);
  // withAndroidManifest runs its action BEFORE the intercepted mod. Await the
  // chain explicitly so HC creates its rationale alias before we retarget it.
  // This also works when HC is registered after us: its action then runs before
  // entering this wrapper. Keep the existing required-alias validation below.
  config = withBaseMod(config, {
    platform: 'android',
    mod: 'manifest',
    isProvider: false,
    async action({ modRequest: { nextMod, ...modRequest }, ...mod }) {
      const result = await nextMod({ ...mod, modRequest });
      configureHealthManifest(result.modResults);
      return result;
    },
  });
  config = withBaseMod(config, {
    platform: 'android',
    mod: 'gradleProperties',
    isProvider: false,
    async action({ modRequest: { nextMod, ...modRequest }, ...mod }) {
      // Preserve explicit values written by the template or other property mods.
      const result = await nextMod({ ...mod, modRequest });
      const configured = result.modResults.filter(item => item.type === 'property' && item.key === MIN_SDK_PROPERTY);
      const minimum = Math.max(26, await frameworkMinSdk(result.modRequest.projectRoot), ...configured.map(item => sdkInteger(item.value, MIN_SDK_PROPERTY)));
      if (configured.length) {
        for (const item of configured) item.value = String(minimum);
      } else {
        result.modResults.push({ type: 'property', key: MIN_SDK_PROPERTY, value: String(minimum) });
      }
      return result;
    },
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'));
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'HealthAccessActivity.kt'), source, 'utf8');
    return mod;
  }]);
}
module.exports = withHealthAccess;
module.exports.configureHealthManifest = configureHealthManifest;
module.exports.healthRationaleSource = healthRationaleSource;
