# DawnageMobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a second, native-feeling DawnAge client app in `DawnageMobile/` on SparkyFitness's architecture — Expo SDK 56 development build, React Navigation 7, uniwind, Skia — reusing the existing Supabase backend unchanged.

**Architecture:** A screen-per-file React Navigation 7 app (no expo-router), styled with uniwind/Tailwind v4 tokens, with TanStack Query 5 as the only server-state layer over typed Supabase access modules. Native iOS tabs and headers on iOS 26+, screen-owned fallbacks everywhere else. Runs as an `expo-dev-client` development build — never Expo Go — built on EAS because this machine cannot compile natively.

**Tech Stack:** Expo SDK 56 · React Native 0.85.3 · React 19.2.3 · TypeScript 6 · React Navigation 7 · TanStack Query 5 · Zustand 5 · uniwind + Tailwind v4 · Skia 2.6.2 · Reanimated 4 · `@supabase/supabase-js` 2

**Spec:** This plan implements:
- `mobile/plans/01-data-contracts.md` — **the authoritative data layer spec.** Every table shape, RLS rule, write pattern and derived-metric formula. Read it before any data task; it is verified against the live schema and it is not restated in full here.
- `mobile/plans/02-design-system.md` + `mobile/src/theme/colors.ts` — the WCAG-measured palette. Values are carried over verbatim.
- `SparkyFitness/SparkyFitnessMobile/AGENTS.md` — the architectural reference this plan borrows from.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Expo SDK 56, React Native 0.85.3, React 19.2.3, TypeScript 6.** Copy exact versions from `SparkyFitness/SparkyFitnessMobile/package.json`.
- **Minimum iOS 16.4, minimum Android 7 (API 24).** This drops iPhone 7 / 6s / SE-1. Accepted trade for `@expo/ui`, `expo-glass-effect` and native tabs.
- **Never Expo Go.** The app depends on native modules Expo Go does not bundle. `expo start` serves JS to an installed dev build only.
- **This machine cannot build natively.** iMac16,2 · macOS 12.7.6 · CommandLineTools only · no Xcode · no simulators · no JDK · no Android SDK · 8 GB RAM. macOS 12 caps at Xcode 14.2; SDK 56 needs Xcode 16+. **All native builds go to EAS.** Never add a task that runs `expo run:ios`, `expo run:android`, `pod install`, or `xcodebuild` locally.
- **`mobile/` is never modified.** `DawnageMobile/` is fully isolated: own `package.json`, own lockfile, own `node_modules`. Read from `mobile/` freely; write to it never.
- **Supabase anon key only.** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` must never appear in this package.
- **Client role only.** `role === 'client'`. A coach/admin session shows a "use the web dashboard" screen and signs out. No impersonation: everywhere web reads `viewedUserId || user.id`, this app uses `user.id`.
- **No hex literals outside `global.css`.** Colours come from Tailwind tokens or `useCSSVariable`.
- **Numeric columns arrive as strings** from supabase-js. Always `parseFloat(x?.toString() || '0')`.
- **Dates are local calendar-day strings** (`yyyy-MM-dd`), built from device local time. Never `toISOString()`.
- **Single locale (English).** Do not port SparkyFitness's i18next stack — no `t()`, no catalogs, no locale registry. Plain strings.
- **`npx tsc --noEmit` and `npm run lint` must be clean before any task is called done.**

### Explicitly out of scope for v1

Carried from SparkyFitness but deliberately **not** built: HealthKit / Health Connect sync, home-screen widgets, Live Activities, AI chat, food/nutrition diary, i18n, better-auth, Garmin/Fitbit/Oura providers. Coach/admin features remain out of scope permanently.

---

## The blocker you must clear before Task 1

**Android is free. iOS costs $99/year.**

EAS internal distribution for iOS needs an ad-hoc provisioning profile with your device's UDID registered, which requires an **Apple Developer Program membership**. A free Apple ID cannot do this, and the usual free workaround — 7-day sideloading via Xcode — is unavailable because this machine cannot install a modern Xcode.

Android has no equivalent gate: EAS produces an APK you install directly.

**Therefore Phase 1 targets Android first.** Get the loop working end-to-end for free, then add iOS once the membership is in place. Nothing in Phases 2–10 is Android-specific; the iOS path activates whenever you're ready.

| Need | Cost | Blocks |
|---|---|---|
| Expo account (EAS free tier) | Free | Everything |
| Android physical device | — | Phase 1 onward |
| Apple Developer Program | $99/yr | iOS dev build, native tabs, Liquid Glass, App Store |
| iOS 26 device | — | Verifying `@expo/ui` + glass paths on real hardware |

---

## File Structure

```
DawnageMobile/
  index.js                      registerRootComponent
  App.tsx                       root composition: providers + navigators
  app.config.ts                 dynamic Expo config (variant-aware)
  app.identifiers.js            bundle IDs shared by config + EAS
  eas.json                      development / preview / production profiles
  global.css                    uniwind + Tailwind v4 design tokens
  metro.config.js               withUniwindConfig
  babel.config.js
  tsconfig.json
  eslint.config.js
  jest.setup.js
  .env.example
  src/
    components/
      ui/                       Button · FormInput · SettingsRow · SegmentedControl
                                StepperInput · BottomSheetPicker · RatingRow · Sheet
      charts/                   ProgressRing · TrendLine · MetricBar   (Skia)
      Icon.tsx                  semantic name -> SF Symbol | Ionicon
      TabsLayout.tsx            native iOS tabs + fallback tabs
      CustomTabBar.tsx          fallback bar with centre Check In action
      ScreenErrorBoundary.tsx   withErrorBoundary HOC
      LiquidGlassSurface.tsx    glass-or-solid surface
    screens/                    one file per route, no logic-free wrappers
    navigation/
      safeScreens.tsx           error-boundary-wrapped screen registry
      linking.ts                deep links (dawnage://)
    hooks/
      queryClient.ts            the single QueryClient
      queryKeys.ts              every cache key, one place
      useScreenHeader.tsx       declarative header -> native or fallback
      use*.ts                   one query/mutation hook per domain
    services/
      supabase/client.ts        the ONLY createClient call
      supabase/auth.ts          session, role gate, deep-link recovery
      api/                      typed data access, one module per domain
    stores/                     Zustand (persisted preferences, draft check-in)
    utils/                      dates · numbers · derived metrics · duplicatePress
    constants/
    types/
  __tests__/
  plans/                        this file
```

**Boundary rules that matter:**
- `services/api/*` is the only place `supabase` is imported. Screens and hooks never touch the client directly — this is the seam that keeps a future backend swap to one directory.
- `hooks/use*.ts` wrap `services/api/*` in TanStack Query. Screens consume hooks only.
- `utils/metrics.ts` holds the derived-metric formulas from the data-contracts spec as pure functions, so they are unit-testable without a network.

---

## Phase 1 — Scaffold and prove the native build pipeline

**The whole phase exists to de-risk one thing: can you get a development build onto a physical device?** Answer that before writing a single screen. Everything after is ordinary app work; this is the part that can fail for environmental reasons.

### Task 1: Scaffold the package

**Files:**
- Create: `DawnageMobile/package.json`
- Create: `DawnageMobile/.npmrc`
- Create: `DawnageMobile/.gitignore`
- Create: `DawnageMobile/tsconfig.json`
- Create: `DawnageMobile/.env.example`

**Interfaces:**
- Produces: an installable package with the exact dependency set every later task assumes.

- [ ] **Step 1: Write `package.json`**

Versions are copied from `SparkyFitness/SparkyFitnessMobile/package.json` — they are a known-good SDK 56 set, which is most of the value of matching their SDK.

```json
{
  "name": "dawnagemobile",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "prebuild": "expo prebuild --clean",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "jest --watchman=false --runInBand",
    "test:watch": "jest --watchAll --watchman=false",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "validate": "npm run typecheck && npm run lint && npm run format:check && npm test"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@gorhom/bottom-sheet": "^5.2.14",
    "@bottom-tabs/react-navigation": "^1.3.1",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-navigation/bottom-tabs": "^7.15.6",
    "@react-navigation/native": "^7.2.2",
    "@react-navigation/native-stack": "^7.4.2",
    "@shopify/react-native-skia": "2.6.2",
    "@supabase/supabase-js": "^2.112.4",
    "@tanstack/react-query": "^5.90.20",
    "date-fns": "^4.4.0",
    "expo": "~56.0.13",
    "expo-application": "~56.0.3",
    "expo-asset": "~56.0.18",
    "expo-build-properties": "^56.0.20",
    "expo-constants": "~56.0.19",
    "expo-crypto": "~56.0.4",
    "expo-dev-client": "^56.0.21",
    "expo-device": "~56.0.4",
    "expo-file-system": "~56.0.8",
    "expo-font": "~56.0.7",
    "expo-glass-effect": "~56.0.4",
    "expo-haptics": "~56.0.3",
    "expo-image": "~56.0.11",
    "expo-image-manipulator": "~56.0.24",
    "expo-image-picker": "~56.0.19",
    "expo-linking": "~56.0.15",
    "expo-navigation-bar": "~56.0.3",
    "expo-notifications": "~56.0.19",
    "expo-secure-store": "~56.0.4",
    "expo-splash-screen": "~56.0.11",
    "expo-symbols": "~56.0.6",
    "expo-system-ui": "~56.0.5",
    "expo-web-browser": "~56.0.5",
    "react": "19.2.3",
    "react-native": "0.85.3",
    "react-native-bottom-tabs": "^1.3.1",
    "react-native-gesture-handler": "~2.31.2",
    "react-native-keyboard-controller": "1.21.14",
    "react-native-pager-view": "8.0.1",
    "react-native-reanimated": "~4.3.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.25.2",
    "react-native-svg": "15.15.4",
    "react-native-url-polyfill": "^2.0.0",
    "react-native-webview": "13.15.0",
    "react-native-worklets": "0.8.3",
    "tailwindcss": "^4.1.18",
    "uniwind": "^1.7.0",
    "victory-native": "^41.20.2",
    "zod": "^4.3.6",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@testing-library/react-native": "^13.3.3",
    "@types/jest": "29.5.14",
    "@types/react": "~19.2.14",
    "babel-jest": "~29.7.0",
    "babel-preset-expo": "~56.0.16",
    "eslint": "^9.39.3",
    "eslint-config-expo": "~56.0.4",
    "jest": "~29.7.0",
    "jest-expo": "~56.0.5",
    "prettier": "3.9.6",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Write `.npmrc`**

`react-native-bottom-tabs` and several Expo packages carry optional peers that resolve inconsistently on npm 10.

```
legacy-peer-deps=true
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["__tests__", "plans", ".expo", "android", "ios"]
}
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
.expo/
dist/
ios/
android/
*.log
.env
.DS_Store
```

`ios/` and `android/` are gitignored deliberately — they are generated by `expo prebuild` on EAS and are not source. All native configuration lives in `app.config.ts` and config plugins.

- [ ] **Step 5: Write `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Install and verify**

```bash
cd DawnageMobile && npm install && npx tsc --noEmit
```

Expected: install completes; `tsc` reports no files to check (no source yet) or exits clean.

- [ ] **Step 7: Commit**

```bash
git add DawnageMobile/
git commit -m "feat(DawnageMobile): scaffold Expo SDK 56 package"
```

---

### Task 2: App config, identifiers and EAS profiles

**Files:**
- Create: `DawnageMobile/app.identifiers.js`
- Create: `DawnageMobile/app.config.ts`
- Create: `DawnageMobile/eas.json`
- Create: `DawnageMobile/index.js`
- Create: `DawnageMobile/App.tsx`
- Create: `DawnageMobile/babel.config.js`

**Interfaces:**
- Produces: `getBundleIdentifier(variant)`, and an Expo config that EAS can build. Bundle IDs differ from `mobile/`'s `com.dawnage.app` so both apps can sit on one device.

- [ ] **Step 1: Write `app.identifiers.js`**

Plain CommonJS because `app.config.ts` and EAS both read it.

```js
const PROD_BUNDLE_IDENTIFIER = 'com.dawnage.mobile';
const DEV_BUNDLE_IDENTIFIER = 'com.dawnage.mobile.dev';

function getBundleIdentifier(variant) {
  return variant === 'production' ? PROD_BUNDLE_IDENTIFIER : DEV_BUNDLE_IDENTIFIER;
}

module.exports = { PROD_BUNDLE_IDENTIFIER, DEV_BUNDLE_IDENTIFIER, getBundleIdentifier };
```

- [ ] **Step 2: Write `app.config.ts`**

```ts
import { ExpoConfig, ConfigContext } from 'expo/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getBundleIdentifier } = require('./app.identifiers.js');

const variant = process.env.APP_VARIANT ?? 'development';
const isProd = variant === 'production';
const bundleId = getBundleIdentifier(variant);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isProd ? 'Dawnage' : 'Dawnage Dev',
  slug: 'dawnage-mobile',
  scheme: 'dawnagemobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0B0C',
  },
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    deploymentTarget: '16.4',
    infoPlist: {
      NSCameraUsageDescription:
        'Dawnage uses your camera to take weekly progress photos for your coach.',
      NSPhotoLibraryUsageDescription:
        'Dawnage lets you pick progress photos from your library to share with your coach.',
    },
  },
  android: {
    package: bundleId,
    edgeToEdgeEnabled: true,
    permissions: ['android.permission.INTERNET', 'android.permission.POST_NOTIFICATIONS'],
    adaptiveIcon: {
      backgroundColor: '#0B0B0C',
      foregroundImage: './assets/android-icon-foreground.png',
    },
  },
  plugins: [
    'expo-dev-client',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    ['expo-build-properties', { ios: { deploymentTarget: '16.4' }, android: { minSdkVersion: 24 } }],
    ['expo-image-picker', {
      photosPermission:
        'Dawnage lets you pick progress photos from your library to share with your coach.',
      cameraPermission:
        'Dawnage uses your camera to take weekly progress photos for your coach.',
    }],
    ['expo-notifications', { color: '#F04E45' }],
  ],
  experiments: { typedRoutes: false },
});
```

`typedRoutes: false` — that flag is expo-router only, and this app uses React Navigation directly.

- [ ] **Step 3: Write `eas.json`**

```json
{
  "cli": { "version": ">= 5.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "env": { "APP_VARIANT": "development" },
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "env": { "APP_VARIANT": "preview" },
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "env": { "APP_VARIANT": "production" },
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "medium" }
    }
  },
  "submit": { "production": {} }
}
```

`"android": { "buildType": "apk" }` on development and preview matters — the default is AAB, which you cannot sideload.

- [ ] **Step 4: Write `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

The worklets plugin must be last. Reanimated 4 reads it; omitting it produces runtime "worklet not found" errors that look nothing like a config problem.

- [ ] **Step 5: Write `index.js` and a placeholder `App.tsx`**

```js
// index.js
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

```tsx
// App.tsx — replaced in Task 7. Exists so Phase 1 can prove the build.
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B0C' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 18 }}>Dawnage dev build OK</Text>
    </View>
  );
}
```

- [ ] **Step 6: Verify the config resolves**

```bash
cd DawnageMobile && npx expo config --type public
```

Expected: JSON with `"name": "Dawnage Dev"` and `"bundleIdentifier": "com.dawnage.mobile.dev"`. This runs locally — it does not compile anything.

- [ ] **Step 7: Commit**

```bash
git add DawnageMobile/
git commit -m "feat(DawnageMobile): add app config, identifiers and EAS profiles"
```

---

### Task 3: First EAS development build on Android

**Files:** none — this task is operational. Its deliverable is an APK on a phone.

**Interfaces:**
- Produces: a running dev build that `expo start --dev-client` can connect to. Every later task's verification step depends on this.

- [ ] **Step 1: Authenticate with EAS**

```bash
npm install -g eas-cli
eas login
cd DawnageMobile && eas init
```

`eas init` writes `extra.eas.projectId` into the config and creates the project. Commit that change.

- [ ] **Step 2: Trigger the Android development build**

```bash
cd DawnageMobile && eas build --profile development --platform android
```

Expect 10–25 minutes. The build runs on EAS infrastructure — prebuild, Gradle and the Android SDK all live there, which is exactly why this machine's missing toolchain does not matter.

- [ ] **Step 3: Install on the device**

Open the build URL, scan the QR, install the APK. Allow "install from unknown sources" when prompted.

- [ ] **Step 4: Connect Metro and verify**

```bash
cd DawnageMobile && npx expo start --dev-client
```

Open the installed **Dawnage Dev** app (not Expo Go — it will not appear there and must not). Expected: the dark screen reading "Dawnage dev build OK", and edits to `App.tsx` hot-reload.

- [ ] **Step 5: Record the loop in a README**

Create `DawnageMobile/README.md` documenting: this machine cannot build natively; native changes require a new EAS build; JS-only changes need only Metro. State plainly which changes are which — that distinction is the single most useful thing for anyone picking this up later.

Native rebuild required after: dependency add/remove, `app.config.ts` change, plugin change, permission change, asset/icon change.
No rebuild needed for: any `.ts`/`.tsx` edit, `global.css` edit, image imports already bundled.

- [ ] **Step 6: Commit**

```bash
git add DawnageMobile/
git commit -m "docs(DawnageMobile): record EAS dev-build workflow"
```

**Gate:** Do not start Phase 2 until Step 4 shows the app running on a physical device. If it fails here it fails for an environmental reason, and every subsequent task would be built on sand.

---

## Phase 2 — Design system

Carries `mobile/src/theme/colors.ts` over intact. Those values were WCAG-measured, several of them specifically because the web app's values failed contrast. They are not to be re-derived, re-eyeballed, or "restored" to the web palette.

### Task 4: uniwind, Metro and the token layer

**Files:**
- Create: `DawnageMobile/global.css`
- Create: `DawnageMobile/metro.config.js`
- Modify: `DawnageMobile/App.tsx` (import `./global.css`)
- Test: `DawnageMobile/__tests__/theme/tokens.test.ts`

**Interfaces:**
- Produces: Tailwind classes `bg-background`, `text-foreground`, `text-muted`, `bg-card`, `bg-elevated`, `text-primary`, `bg-primary-fill`, `text-on-primary`, `border-subtle`, `border-strong`, `text-success`, `text-gold`, `text-destructive`, `chart-1`…`chart-4`, radii `rounded-card`/`rounded-pill`, and `useCSSVariable(name)` for Skia.

- [ ] **Step 1: Write `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);
config.transformer.minifierConfig = {
  compress: { drop_console: ['log', 'info'] },
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
```

- [ ] **Step 2: Write `global.css`**

Every value below is transcribed from `mobile/src/theme/colors.ts` and `tokens.ts`. The measured contrast ratios travel with them as comments so nobody "fixes" a deliberately dark red back to the failing bright one.

```css
@import 'tailwindcss';
@import 'uniwind';

@layer theme {
  :root {
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-base: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-card: 20px;
    --radius-pill: 999px;

    @variant light {
      /* Grey ground + white card. The web's #FAFAFA/#F5F5F5 pair measured
         1.03:1 and made cards invisible; separation comes from elevation. */
      --color-background: #f2f2f5;
      --color-card: #ffffff;
      --color-elevated: #ffffff;
      --color-scrim: rgba(0, 0, 0, 0.45);

      --color-foreground: #17171a;        /* 17.89:1 on card */
      --color-muted: #5c5c63;             /*  6.63:1 on card */

      --color-primary: #c0362c;           /*  5.52:1 — #F04E45 was 3.28, failed */
      --color-primary-fill: #d93a31;      /*  white label 4.57:1 */
      --color-on-primary: #ffffff;
      --color-success: #0f7a43;           /*  5.41:1 — was 2.56, failed */
      --color-gold: #7d5e00;              /*  6.05:1 — was 3.28, failed */
      --color-orange: #a85a00;
      --color-destructive: #c0362c;

      --color-border-subtle: #e4e4e9;     /* decorative only */
      --color-border-strong: #8e8e96;     /* 3.25:1 — interactive boundaries */
      --color-focus-ring: #c0362c;

      --color-chart-1: #e0392e;           /* 4.38:1 */
      --color-chart-2: #00994d;           /* 3.71:1 */
      --color-chart-3: #a87c05;           /* 3.78:1 */
      --color-chart-4: #2e86e0;           /* 3.75:1 */
    }

    @variant dark {
      --color-background: #0b0b0c;
      --color-card: #131416;
      --color-elevated: #1a1b1e;
      --color-scrim: rgba(0, 0, 0, 0.6);

      --color-foreground: #ffffff;        /* 18.43:1 on card */
      --color-muted: #a1a1a8;             /*  7.18:1 on card */

      --color-primary: #f04e45;           /*  5.16:1 on card */
      --color-primary-fill: #d93a31;      /*  white label 4.57:1 */
      --color-on-primary: #ffffff;
      --color-success: #00d26a;           /*  9.15:1 on card */
      --color-gold: #f6c85a;              /* 11.70:1 on card */
      --color-orange: #e8853b;
      --color-destructive: #f04e45;

      --color-border-subtle: #1f1f23;     /* 1.12:1 — decorative only */
      --color-border-strong: #5e6268;     /* 3.00:1 — interactive boundaries */
      --color-focus-ring: #f04e45;

      --color-chart-1: #f44a3e;           /*  5.17:1 */
      --color-chart-2: #00d66b;           /*  9.51:1 */
      --color-chart-3: #face57;           /* 12.32:1 */
      --color-chart-4: #4799eb;           /*  6.17:1 */
    }
  }
}
```

- [ ] **Step 3: Write the failing token test**

Guards the two mistakes that actually happened before: a light-mode value silently reverting to a failing-contrast web colour, and a token being dropped.

```ts
// __tests__/theme/tokens.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../global.css'), 'utf8');

const REQUIRED_TOKENS = [
  'background', 'card', 'elevated', 'foreground', 'muted',
  'primary', 'primary-fill', 'on-primary', 'success', 'gold', 'destructive',
  'border-subtle', 'border-strong', 'chart-1', 'chart-2', 'chart-3', 'chart-4',
];

describe('design tokens', () => {
  it.each(REQUIRED_TOKENS)('defines --color-%s in both light and dark', (token) => {
    const matches = css.match(new RegExp(`--color-${token}:`, 'g')) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('keeps the measured light-mode primary, not the failing web value', () => {
    const light = css.split('@variant dark')[0];
    expect(light).toContain('--color-primary: #c0362c');
    expect(light).not.toContain('--color-primary: #f04e45');
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

```bash
cd DawnageMobile && npx jest __tests__/theme/tokens.test.ts --watchman=false
```

Expected: FAIL — `global.css` not found, if Step 2 has not landed yet. If Step 2 has landed, this passes immediately and that is fine; the test's job is regression, not red-green theatre.

- [ ] **Step 5: Import the stylesheet**

Add to the top of `App.tsx`:

```tsx
import './global.css';
```

- [ ] **Step 6: Verify**

```bash
cd DawnageMobile && npx jest __tests__/theme --watchman=false && npx tsc --noEmit
```

Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add DawnageMobile/
git commit -m "feat(DawnageMobile): add uniwind token layer with measured palette"
```

---

### Task 5: The Icon abstraction

**Files:**
- Create: `DawnageMobile/src/components/Icon.tsx`
- Test: `DawnageMobile/__tests__/components/Icon.test.tsx`

**Interfaces:**
- Produces: `<Icon name={IconName} size={number} color={string} />` and `type IconName`. Renders an SF Symbol on iOS, an Ionicon on Android. Port the mapping shape from `SparkyFitness/SparkyFitnessMobile/src/components/Icon.tsx`, keeping only the names this app needs.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/Icon.test.tsx
import { render } from '@testing-library/react-native';
import Icon from '../../src/components/Icon';

describe('Icon', () => {
  it('renders a known semantic name', () => {
    const { toJSON } = render(<Icon name="checkmark" size={20} color="#fff" />);
    expect(toJSON()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

```bash
cd DawnageMobile && npx jest __tests__/components/Icon.test.tsx --watchman=false
```

Expected: FAIL — cannot resolve `src/components/Icon`.

- [ ] **Step 3: Implement**

```tsx
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

const ICON_MAP = {
  'chevron-forward': { sf: 'chevron.right', ion: 'chevron-forward' },
  'chevron-back': { sf: 'chevron.left', ion: 'chevron-back' },
  'chevron-down': { sf: 'chevron.down', ion: 'chevron-down' },
  close: { sf: 'xmark', ion: 'close' },
  checkmark: { sf: 'checkmark', ion: 'checkmark' },
  add: { sf: 'plus', ion: 'add' },
  home: { sf: 'house.fill', ion: 'home' },
  plans: { sf: 'list.bullet.rectangle', ion: 'clipboard-outline' },
  progress: { sf: 'chart.line.uptrend.xyaxis', ion: 'trending-up' },
  more: { sf: 'ellipsis', ion: 'ellipsis-horizontal' },
  camera: { sf: 'camera', ion: 'camera-outline' },
  'photo-library': { sf: 'photo.on.rectangle', ion: 'images-outline' },
  scale: { sf: 'scalemass', ion: 'barbell-outline' },
  ruler: { sf: 'ruler', ion: 'resize-outline' },
  settings: { sf: 'gearshape.fill', ion: 'settings' },
  person: { sf: 'person.crop.circle', ion: 'person-circle-outline' },
  logout: { sf: 'rectangle.portrait.and.arrow.right', ion: 'log-out-outline' },
  pencil: { sf: 'pencil', ion: 'create-outline' },
  trash: { sf: 'trash', ion: 'trash-outline' },
  warning: { sf: 'exclamationmark.triangle', ion: 'warning-outline' },
} as const;

export type IconName = keyof typeof ICON_MAP;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolViewProps['weight'];
};

export default function Icon({ name, size = 20, color, style, weight = 'regular' }: Props) {
  const entry = ICON_MAP[name];
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={entry.sf as SymbolViewProps['name']}
        size={size}
        tintColor={color}
        weight={weight}
        style={style}
        fallback={<Ionicons name={entry.ion as never} size={size} color={color} />}
      />
    );
  }
  return <Ionicons name={entry.ion as never} size={size} color={color} style={style as never} />;
}
```

The `fallback` prop matters: an SF Symbol missing on an older iOS renders nothing at all rather than erroring, which is a genuinely hard bug to spot.

- [ ] **Step 4: Run and confirm it passes**

```bash
cd DawnageMobile && npx jest __tests__/components/Icon.test.tsx --watchman=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add DawnageMobile/src/components/Icon.tsx DawnageMobile/__tests__/components/Icon.test.tsx
git commit -m "feat(DawnageMobile): add platform icon abstraction"
```

---

### Task 6: UI primitives

**Files:**
- Create: `src/components/ui/Button.tsx`, `FormInput.tsx`, `Card.tsx`, `SettingsRow.tsx`, `SegmentedControl.tsx`, `StepperInput.tsx`, `RatingRow.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Skeleton.tsx`, `index.ts`
- Test: `__tests__/components/ui/Button.test.tsx`, `RatingRow.test.tsx`, `SegmentedControl.test.tsx`

**Interfaces:**
- Produces:
  - `<Button variant="primary"|"secondary"|"ghost"|"destructive" size="sm"|"md"|"lg" loading? disabled? onPress icon? children>`
  - `<FormInput label value onChangeText error? keyboardType? suffix?>`
  - `<Card padded? children>`
  - `<SettingsRow icon? label value? onPress? destructive?>`
  - `<SegmentedControl options={{label,value}[]} value onChange>`
  - `<StepperInput value onChange min max step suffix?>`
  - `<RatingRow label value onChange min={1} max={10}>` — the 1–10 scale the check-in uses
  - `<EmptyState icon title body action?>` / `<ErrorState message onRetry>` / `<Skeleton width height radius?>`

Port behaviour from `mobile/src/components/ui/` — those components already encode the accessibility work (44pt targets, `accessibilityRole`, `accessibilityState`) from `mobile/plans/03-ux-standards.md`. Restyle to uniwind `className`; keep the semantics.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/ui/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../src/components/ui/Button';

describe('Button', () => {
  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button onPress={onPress}>Save</Button>);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button onPress={onPress} loading>Save</Button>);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reports disabled state to accessibility', () => {
    const { getByRole } = render(<Button onPress={jest.fn()} disabled>Save</Button>);
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });
});
```

```tsx
// __tests__/components/ui/RatingRow.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import RatingRow from '../../../src/components/ui/RatingRow';

describe('RatingRow', () => {
  it('emits the tapped value', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RatingRow label="Energy" value={5} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Energy: 8'));
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('marks the current value as selected', () => {
    const { getByLabelText } = render(
      <RatingRow label="Energy" value={5} onChange={jest.fn()} />
    );
    expect(getByLabelText('Energy: 5').props.accessibilityState.selected).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm they fail**

```bash
cd DawnageMobile && npx jest __tests__/components/ui --watchman=false
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the primitives**

`Button` sets the pattern the rest follow — uniwind classes, no hex, explicit a11y, press guarded while busy:

```tsx
// src/components/ui/Button.tsx
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '../Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary-fill',
  secondary: 'bg-elevated border border-border-strong',
  ghost: 'bg-transparent',
  destructive: 'bg-transparent border border-destructive',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-on-primary',
  secondary: 'text-foreground',
  ghost: 'text-primary',
  destructive: 'text-destructive',
};

const PADDING: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-5 py-4',
};

type Props = {
  children: ReactNode;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  className?: string;
};

export default function Button({
  children, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, className = '',
}: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-md ${PADDING[size]} ${CONTAINER[variant]} ${blocked ? 'opacity-50' : ''} ${className}`}
      style={{ minHeight: 44 }}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={18} /> : null}
          <Text className={`text-base font-semibold ${LABEL[variant]}`}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
```

`minHeight: 44` stays an inline style rather than a class — it is the WCAG target-size floor from `03-ux-standards.md`, and it should not be overridable by a passed `className`.

Implement the remaining primitives to the interfaces above, each exported from `src/components/ui/index.ts`.

- [ ] **Step 4: Run and confirm they pass**

```bash
cd DawnageMobile && npx jest __tests__/components/ui --watchman=false && npx tsc --noEmit
```

Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add DawnageMobile/src/components/ui DawnageMobile/__tests__/components/ui
git commit -m "feat(DawnageMobile): add UI primitives on uniwind tokens"
```

---

## Phase 3 — App shell

### Task 7: Navigation types, tabs and headers

**Files:**
- Create: `src/types/navigation.ts`, `src/components/TabsLayout.tsx`, `src/components/CustomTabBar.tsx`, `src/components/ScreenErrorBoundary.tsx`, `src/navigation/safeScreens.tsx`, `src/hooks/useScreenHeader.tsx`, `src/services/nativeUiPreference.ts`, `src/utils/liquidGlass.ts`
- Modify: `App.tsx`
- Test: `__tests__/navigation/tabs.test.tsx`

**Interfaces:**
- Produces: `RootStackParamList`, `TabParamList`, `withErrorBoundary(Screen, name)`, `useScreenHeader(config)`, `useNativeIOSTabsActive()`, `useNativeIOSHeadersActive()`, `canUseLiquidGlass()`.

**Tab design.** This is the deliberate departure from `mobile/`'s five flat tabs. The daily check-in is the app's core ritual, so it becomes a centre action rather than a peer tab, following SparkyFitness's `Add` pattern:

```
Home  ·  Plans  ·  [ Check In ]  ·  Progress  ·  More
```

- **Home** — dashboard: today's status, streak, weight trend, latest coach notes
- **Plans** — workout + meal plans, entry point to the workout logger
- **Check In** — centre action; opens the check-in flow modally, never a content screen
- **Progress** — measurements, photos, charts, check-in history
- **More** — profile, settings, weekly feedback, questionnaire

`Logs` and `Measurements`/`Media` from `mobile/` fold into Plans and Progress respectively.

- [ ] **Step 1: Write `src/types/navigation.ts`**

```ts
export type TabParamList = {
  Home: undefined;
  Plans: undefined;
  CheckInAction: undefined;   // centre action; redirects, never renders
  Progress: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  ResetPassword: { token?: string } | undefined;
  Onboarding: undefined;
  Questionnaire: undefined;
  Tabs: undefined;
  CheckIn: { date?: string } | undefined;
  WorkoutLogger: { date?: string; planDayNumber?: number } | undefined;
  Measurements: undefined;
  ProgressPhotos: undefined;
  WeeklyFeedback: undefined;
  Profile: undefined;
  Settings: undefined;
  CoachOnly: undefined;       // shown then signed out for non-client roles
};
```

- [ ] **Step 2: Write the failing navigation contract test**

Mirrors SparkyFitness's `nativeHeaderContract.test.ts` in spirit: it asserts the tab set and the param list stay aligned, which is the thing that silently rots.

```tsx
// __tests__/navigation/tabs.test.tsx
import { TAB_ROUTES, CENTER_ACTION_ROUTE } from '../../src/components/TabsLayout';

describe('tab configuration', () => {
  it('declares exactly the five designed tabs in order', () => {
    expect(TAB_ROUTES).toEqual(['Home', 'Plans', 'CheckInAction', 'Progress', 'More']);
  });

  it('treats Check In as a centre action, not a content screen', () => {
    expect(CENTER_ACTION_ROUTE).toBe('CheckInAction');
  });
});
```

- [ ] **Step 3: Run and confirm it fails**

```bash
cd DawnageMobile && npx jest __tests__/navigation --watchman=false
```

Expected: FAIL — cannot resolve `TabsLayout`.

- [ ] **Step 4: Implement the glass + preference helpers**

```ts
// src/utils/liquidGlass.ts
import { Platform } from 'react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

let cached: boolean | undefined;

export function canUseLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (cached === undefined) {
    try {
      cached = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
    } catch {
      cached = false;
    }
  }
  return cached;
}
```

```ts
// src/services/nativeUiPreference.ts
import { Platform } from 'react-native';
import { usePreferencesStore } from '../stores/preferencesStore';
import { canUseLiquidGlass } from '../utils/liquidGlass';

/** Native iOS tabs need BOTH iOS 26 glass support and the user's opt-in. */
export function useNativeIOSTabsActive(): boolean {
  const enabled = usePreferencesStore((s) => s.liquidGlassEnabled);
  return canUseLiquidGlass() && enabled;
}

/** Native headers are not glass-only: pre-iOS-26 keeps classic native headers. */
export function useNativeIOSHeadersActive(): boolean {
  const enabled = usePreferencesStore((s) => s.liquidGlassEnabled);
  if (Platform.OS !== 'ios') return false;
  return !canUseLiquidGlass() || enabled;
}
```

The hook is hoisted out of the `&&` deliberately — `react-hooks/rules-of-hooks` requires it to run every render.

- [ ] **Step 5: Implement `TabsLayout.tsx`**

Follow `SparkyFitness/SparkyFitnessMobile/src/components/TabsLayout.tsx` structurally: a `createNativeBottomTabNavigator` path for iOS 26+, a `createBottomTabNavigator` + `CustomTabBar` path otherwise, each content tab wrapped in its own `createNativeStackNavigator` so native headers still apply inside the tab. Export:

```ts
export const TAB_ROUTES = ['Home', 'Plans', 'CheckInAction', 'Progress', 'More'] as const;
export const CENTER_ACTION_ROUTE = 'CheckInAction';
export const TAB_BAR_HEIGHT = 56;
```

`CheckInAction` renders a component that, on focus, navigates to the `CheckIn` root-stack modal and returns to the previously active tab — the same redirect trick SparkyFitness uses for `Add`.

- [ ] **Step 6: Implement `useScreenHeader`, `ScreenErrorBoundary`, `safeScreens` and rewrite `App.tsx`**

`App()` wraps `QueryClientProvider` → `GestureHandlerRootView` → `KeyboardProvider` → `BottomSheetModalProvider` → `SafeAreaProvider`. `AppContent()` owns `NavigationContainer`, the root stack, and the auth gate.

`useScreenHeader(config)` takes one declarative descriptor (`title`, `left`, `right` items) and renders through the native path or returns a fallback bar element, chosen by `useNativeIOSHeadersActive()`. Enforce SparkyFitness's one-accent rule: exactly one `kind: 'primary'` action per screen, `__DEV__` throw otherwise.

- [ ] **Step 7: Run and confirm it passes**

```bash
cd DawnageMobile && npx jest __tests__/navigation --watchman=false && npx tsc --noEmit
```

Expected: PASS, clean.

- [ ] **Step 8: Verify on device**

Metro is already running from Task 3. Expected: five-slot tab bar with a centre Check In action; tapping it opens a modal and returns you to the tab you left.

- [ ] **Step 9: Commit**

```bash
git add DawnageMobile/src DawnageMobile/App.tsx DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add app shell with native and fallback tabs"
```

---

## Phase 4 — Data layer

### Task 8: Supabase client, query client and the API seam

**Files:**
- Create: `src/services/supabase/client.ts`, `src/services/supabase/auth.ts`, `src/hooks/queryClient.ts`, `src/hooks/queryKeys.ts`, `src/services/api/errors.ts`, `src/utils/numbers.ts`, `src/utils/dates.ts`
- Test: `__tests__/utils/numbers.test.ts`, `__tests__/utils/dates.test.ts`

**Interfaces:**
- Produces: `supabase`, `getSession()`, `signIn()`, `signOut()`, `queryClient`, `queryKeys`, `ApiError`, `toNumber(v)`, `todayLocal()`, `toDayString(d)`.

- [ ] **Step 1: Write the failing tests**

These two utilities cause the most data bugs in this codebase's history — string decimals and UTC date drift — so they get real tests.

```ts
// __tests__/utils/numbers.test.ts
import { toNumber } from '../../src/utils/numbers';

describe('toNumber', () => {
  it('parses the string decimals supabase-js returns for numeric columns', () => {
    expect(toNumber('72.40')).toBe(72.4);
  });
  it('returns 0 for null and undefined rather than NaN', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
  it('passes numbers through', () => {
    expect(toNumber(5)).toBe(5);
  });
});
```

```ts
// __tests__/utils/dates.test.ts
import { toDayString } from '../../src/utils/dates';

describe('toDayString', () => {
  it('uses local calendar date, not UTC', () => {
    // 2026-03-01T23:30 local. toISOString() would roll this to 2026-03-02
    // in any timezone east of UTC — the exact bug this guards.
    const d = new Date(2026, 2, 1, 23, 30, 0);
    expect(toDayString(d)).toBe('2026-03-01');
  });
  it('zero-pads month and day', () => {
    expect(toDayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
```

- [ ] **Step 2: Run and confirm they fail**

```bash
cd DawnageMobile && npx jest __tests__/utils --watchman=false
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the utilities**

```ts
// src/utils/numbers.ts
/** supabase-js returns numeric/decimal columns as strings. Always go through this. */
export function toNumber(value: unknown): number {
  const parsed = parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
```

```ts
// src/utils/dates.ts
/** Local calendar day. Never toISOString() — it shifts the date across UTC. */
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayLocal(): string {
  return toDayString(new Date());
}
```

- [ ] **Step 4: Implement the Supabase client**

```ts
// src/services/supabase/client.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // RN has no URL bar; recovery is handled by deep link
  },
});
```

Missing env must render a "missing configuration" screen rather than crash — carry that behaviour over from `mobile/src/lib/`.

- [ ] **Step 5: Implement `queryClient.ts`**

Copy SparkyFitness's retry policy verbatim; the reasoning in its comments is sound and hard-won.

```ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // refetch only on explicit trigger or focus
      // Don't retry 4xx — caller-state errors (auth, validation, 429) won't
      // change on retry, and retrying amplifies rate limits.
      retry: (failureCount, err) => {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
    mutations: { retry: 0 },
  },
});
```

`staleTime: Infinity` is load-bearing: **every mutation must explicitly invalidate its caches.** Nothing refetches on its own.

- [ ] **Step 6: Implement `queryKeys.ts`**

```ts
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  checkIns: (userId: string) => ['checkIns', userId] as const,
  checkIn: (userId: string, date: string) => ['checkIn', userId, date] as const,
  measurements: (userId: string) => ['measurements', userId] as const,
  photos: (userId: string) => ['photos', userId] as const,
  workoutPlan: (userId: string) => ['workoutPlan', userId] as const,
  mealPlan: (userId: string) => ['mealPlan', userId] as const,
  workoutLogs: (userId: string) => ['workoutLogs', userId] as const,
  workoutLog: (userId: string, date: string) => ['workoutLog', userId, date] as const,
  weeklyCheckIns: (userId: string) => ['weeklyCheckIns', userId] as const,
  questionnaire: (userId: string) => ['questionnaire', userId] as const,
} as const;
```

- [ ] **Step 7: Run, verify, commit**

```bash
cd DawnageMobile && npx jest __tests__/utils --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add supabase client, query client and data utilities"
```

---

### Task 9: Typed API modules and derived metrics

**Files:**
- Create: `src/services/api/profileApi.ts`, `checkInsApi.ts`, `measurementsApi.ts`, `photosApi.ts`, `plansApi.ts`, `workoutLogsApi.ts`, `weeklyCheckInsApi.ts`, `questionnaireApi.ts`
- Create: `src/utils/metrics.ts`
- Create: `src/types/domain.ts`
- Test: `__tests__/utils/metrics.test.ts`

**Interfaces:**
- Produces domain types (`CheckIn`, `Measurement`, `WorkoutPlanDay`, `MealPlanEntry`, `WorkoutLog`, `PhotoSet`, `Profile`) with **camelCase fields and `number` types** — the mapping from snake_case string rows happens inside `services/api/`, so nothing above this layer ever sees a raw row.
- Produces `upsertCheckIn`, `fetchCheckIns`, `resolveWorkoutPlan`, `resolveMealPlan`, `uploadProgressPhoto`, and the pure functions in `metrics.ts`.

**Read `mobile/plans/01-data-contracts.md` before writing any of these.** It specifies every table shape, the fetch-then-update/insert pattern for tables without unique constraints, the `package_start_date` fallback write, the four-step plan resolution with template fallback, and the legacy-format tolerance required by the workout log renderer. Do not re-derive any of it.

- [ ] **Step 1: Write the failing metrics tests**

The formulas are specified in the data-contracts doc under "Key derived-metric formulas". They are pure and therefore the cheapest thing in the app to test properly.

```ts
// __tests__/utils/metrics.test.ts
import { normalizeWorkoutStatus, processCheckInHistory, weightTrend } from '../../src/utils/metrics';

describe('normalizeWorkoutStatus', () => {
  it.each([
    ['done', 'done'], ['completed', 'done'], ['yes', 'done'],
    ['cardio_day', 'cardio'], ['cardio', 'cardio'],
    ['rest_day', 'rest'], ['rest', 'rest'],
    ['no', 'no'], ['missed', 'no'], ['anything-else', 'no'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeWorkoutStatus(input)).toBe(expected);
  });
});

describe('processCheckInHistory', () => {
  it('marks gap days as missed and numbers days from the first check-in', () => {
    const result = processCheckInHistory([
      { date: '2026-03-01', workoutStatus: 'done' },
      { date: '2026-03-03', workoutStatus: 'done' },
    ] as never, new Date(2026, 2, 3));

    expect(result).toHaveLength(3);              // newest-first
    expect(result[0]).toMatchObject({ date: '2026-03-03', dayNumber: 3 });
    expect(result[1]).toMatchObject({ date: '2026-03-02', status: 'missed' });
    expect(result[2]).toMatchObject({ date: '2026-03-01', dayNumber: 1 });
  });
});

describe('weightTrend', () => {
  it('is last minus first across the window', () => {
    expect(weightTrend([72.0, 71.5, 71.2])).toBeCloseTo(-0.8);
  });
  it('is 0 for fewer than two readings', () => {
    expect(weightTrend([72.0])).toBe(0);
  });
});
```

- [ ] **Step 2: Run and confirm they fail**

```bash
cd DawnageMobile && npx jest __tests__/utils/metrics.test.ts --watchman=false
```

Expected: FAIL — `src/utils/metrics` not found.

- [ ] **Step 3: Implement `metrics.ts` and the domain types**

Port the formulas from the data-contracts spec: `processCheckInHistory`, `calculateWeeklyAverages`, `weightTrend`, `consistency`, `normalizeWorkoutStatus`, `nutritionBreakdown`. All pure, no Supabase imports.

- [ ] **Step 4: Implement the API modules**

Each module owns its row→domain mapping. `checkInsApi.ts` sets the pattern:

```ts
// src/services/api/checkInsApi.ts
import { supabase } from '../supabase/client';
import { toNumber } from '../../utils/numbers';
import type { CheckIn } from '../../types/domain';

type Row = Record<string, unknown>;

function toCheckIn(row: Row): CheckIn {
  return {
    id: String(row.id),
    date: String(row.date),
    morningWeight: toNumber(row.morning_weight),
    sleepHours: toNumber(row.sleep_hours),
    workoutStatus: String(row.workout_status ?? 'no'),
    workoutPerformance: toNumber(row.workout_performance),
    nutritionScore: toNumber(row.nutrition_score),
    calorieIntake: toNumber(row.calorie_intake),
    waterLiters: toNumber(row.water_liters),
    dailySteps: toNumber(row.daily_steps),
    protein: toNumber(row.protein),
    carbs: toNumber(row.carbs),
    fats: toNumber(row.fats),
    energyLevel: toNumber(row.energy_level),
    hungerLevel: toNumber(row.hunger_level),
    stressLevel: toNumber(row.stress_level),
    digestion: (row.digestion as CheckIn['digestion']) ?? 'none',
    notes: (row.notes as string | null) ?? null,
  };
}

export async function fetchCheckIns(userId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('daily_check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCheckIn);
}
```

`daily_check_ins` has a DB-enforced `UNIQUE (user_id, date)`, so `upsertCheckIn` uses `.upsert(..., { onConflict: 'user_id,date' })`. Tables **without** that constraint — `body_measurements`, `weekly_progress_photos`, `workout_logs` — must use the fetch-then-update/insert pattern from the spec instead.

- [ ] **Step 5: Run, verify, commit**

```bash
cd DawnageMobile && npx jest __tests__/utils --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add typed API modules and derived metrics"
```

---

## Phase 5 — Auth and onboarding

### Task 10: Auth gate, role enforcement and password recovery

**Files:**
- Create: `src/services/supabase/auth.ts`, `src/hooks/useAuth.ts`, `src/screens/LoginScreen.tsx`, `src/screens/ResetPasswordScreen.tsx`, `src/screens/CoachOnlyScreen.tsx`, `src/navigation/linking.ts`
- Modify: `App.tsx` (auth gate)
- Test: `__tests__/auth/roleGate.test.ts`

**Interfaces:**
- Produces: `useAuth() -> { session, user, role, loading, signIn, signUp, signOut }`, `isClientRole(user)`.

Behaviours from the data-contracts spec: signup writes `full_name`, `phone_number` (country code + number, combined), `country`, `role: 'client'` into user metadata; email verification is on, so show a "check your email" state; a DB trigger creates the `public.users` row — **never insert it**.

- [ ] **Step 1: Write the failing role-gate test**

```ts
// __tests__/auth/roleGate.test.ts
import { isClientRole } from '../../src/services/supabase/auth';

describe('isClientRole', () => {
  it('accepts a client', () => {
    expect(isClientRole({ user_metadata: { role: 'client' } } as never)).toBe(true);
  });
  it.each(['coach', 'admin', undefined])('rejects %s', (role) => {
    expect(isClientRole({ user_metadata: { role } } as never)).toBe(false);
  });
  it('rejects a null user', () => {
    expect(isClientRole(null)).toBe(false);
  });
});
```

A missing role must be rejected, not defaulted to client — that is a privilege question, and defaulting open is the wrong direction.

- [ ] **Step 2: Run and confirm it fails**

```bash
cd DawnageMobile && npx jest __tests__/auth --watchman=false
```

Expected: FAIL.

- [ ] **Step 3: Implement auth, the gate and the screens**

`App.tsx` routes on session + role: no session → `Login`; session with non-client role → `CoachOnly` then `signOut()`; client with `onboarding_step < 3` → `Onboarding`; otherwise `Tabs`.

- [ ] **Step 4: Implement deep-link password recovery**

```ts
// src/navigation/linking.ts
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/domain';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['dawnagemobile://'],
  config: { screens: { ResetPassword: 'reset-password' } },
};
```

**Operational step for the user, not the agent:** add `dawnagemobile://reset-password` to Supabase → Authentication → URL Configuration → Redirect URLs. Recovery links fail silently until this is done.

- [ ] **Step 5: Run, verify on device, commit**

```bash
cd DawnageMobile && npx jest --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/App.tsx DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add auth gate, client role enforcement and recovery"
```

---

### Task 11: Onboarding and questionnaire

**Files:**
- Create: `src/screens/OnboardingScreen.tsx`, `src/screens/QuestionnaireScreen.tsx`, `src/constants/questionnaire.ts`, `src/hooks/useQuestionnaire.ts`

**Interfaces:**
- Consumes: `useAuth()`, `questionnaireApi`.
- Produces: onboarding that advances `users.onboarding_step` to 3.

Per the spec: steps 0 and 1 are the YouTube videos (`QX3_LQxnMXI`, `zmyQxmksUuc`) via `react-native-webview`; **step 2 (WhatsApp activation) is excluded on mobile** and becomes a "You're all set" card whose button writes `onboarding_step = 3`. Copy `client/src/lib/questionnaire-data.ts` unchanged into `src/constants/questionnaire.ts` — 10 sections, 87 questions, types text/number/select/radio/textarea/rating.

- [ ] **Step 1: Copy the questionnaire data unchanged**
- [ ] **Step 2: Implement `OnboardingScreen` with the two videos and the completion card**
- [ ] **Step 3: Implement `QuestionnaireScreen` — section-at-a-time, saving `answers` and `completed_sections` JSON per section**
- [ ] **Step 4: Verify on device that completing onboarding lands on Tabs and survives a restart**
- [ ] **Step 5: Commit**

```bash
git add DawnageMobile/src
git commit -m "feat(DawnageMobile): add onboarding and questionnaire"
```

---

## Phase 6 — Home dashboard

### Task 12: Skia progress ring and dashboard

**Files:**
- Create: `src/components/charts/ProgressRing.tsx`, `src/components/charts/TrendLine.tsx`, `src/screens/HomeScreen.tsx`, `src/hooks/useDashboard.ts`
- Test: `__tests__/components/charts/ProgressRing.test.tsx`

**Interfaces:**
- Produces: `<ProgressRing progress={0..1} size strokeWidth color backgroundColor />`, `useDashboard() -> { currentWeight, weightTrend, totalWorkouts, avgNutritionScore, avgEnergyLevel, consistency, streak, coachNotes, loading, error, refetch }`.

Port `ProgressRing` from `SparkyFitness/SparkyFitnessMobile/src/components/ProgressRing.tsx` — including its focus-aware animation, which skips scheduling frames while the screen is blurred. Colours come from `useCSSVariable`, never literals.

- [ ] **Step 1: Write the failing ring test**

```tsx
// __tests__/components/charts/ProgressRing.test.tsx
import { render } from '@testing-library/react-native';
import ProgressRing from '../../../src/components/charts/ProgressRing';

describe('ProgressRing', () => {
  it('renders without crashing at the boundaries', () => {
    for (const progress of [0, 0.5, 1]) {
      const { toJSON } = render(
        <ProgressRing progress={progress} size={120} strokeWidth={10}
          color="#F04E45" backgroundColor="#1F1F23" />
      );
      expect(toJSON()).toBeTruthy();
    }
  });

  it('clamps out-of-range progress rather than drawing a wrapped arc', () => {
    const { toJSON } = render(
      <ProgressRing progress={1.8} size={120} strokeWidth={10}
        color="#F04E45" backgroundColor="#1F1F23" />
    );
    expect(toJSON()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement `ProgressRing` (port) and `TrendLine` (victory-native)**
- [ ] **Step 4: Implement `useDashboard` over `metrics.ts` + the check-in queries**
- [ ] **Step 5: Implement `HomeScreen` with loading, error and empty states**

Empty state matters here: a brand-new client has zero check-ins, and a dashboard of zeroes reads as broken. Show an explicit "Log your first check-in" prompt instead.

- [ ] **Step 6: Verify on device, run tests, commit**

```bash
cd DawnageMobile && npx jest --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add Skia progress ring and home dashboard"
```

---

## Phase 7 — Check-in, the centre action

### Task 13: Check-in flow

**Files:**
- Create: `src/screens/CheckInScreen.tsx`, `src/features/checkin/` (step components), `src/hooks/useCheckIn.ts`, `src/stores/checkInDraftStore.ts`
- Test: `__tests__/hooks/useCheckIn.test.ts`, `__tests__/stores/checkInDraftStore.test.ts`

**Interfaces:**
- Produces: `useCheckIn(date) -> { checkIn, save, saving, error }`, `useCheckInDraftStore` (Zustand + persist, so a half-finished check-in survives backgrounding).

Write behaviour from the spec: fetch by `(user_id, date)`, update if present else insert; `UNIQUE (user_id, date)` is DB-enforced; after save, if `users.package_start_date` is null set it to today. Macros and notes are optional inputs — writing them is additive and safe.

- [ ] **Step 1: Write the failing draft-store test**

```ts
// __tests__/stores/checkInDraftStore.test.ts
import { useCheckInDraftStore } from '../../src/stores/checkInDraftStore';

describe('checkInDraftStore', () => {
  beforeEach(() => useCheckInDraftStore.getState().clear());

  it('keeps a draft per date', () => {
    const { setField } = useCheckInDraftStore.getState();
    setField('2026-03-01', 'morningWeight', 72.4);
    setField('2026-03-02', 'morningWeight', 72.1);
    const { drafts } = useCheckInDraftStore.getState();
    expect(drafts['2026-03-01'].morningWeight).toBe(72.4);
    expect(drafts['2026-03-02'].morningWeight).toBe(72.1);
  });

  it('clears one date without touching the others', () => {
    const { setField, clearDate } = useCheckInDraftStore.getState();
    setField('2026-03-01', 'sleepHours', 7);
    setField('2026-03-02', 'sleepHours', 8);
    clearDate('2026-03-01');
    const { drafts } = useCheckInDraftStore.getState();
    expect(drafts['2026-03-01']).toBeUndefined();
    expect(drafts['2026-03-02'].sleepHours).toBe(8);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement the draft store (Zustand `persist`, one AsyncStorage key `@Dawnage/checkin-drafts`)**
- [ ] **Step 4: Implement `useCheckIn` with the upsert + `package_start_date` fallback, invalidating `queryKeys.checkIns` and `queryKeys.profile` on success**

`staleTime: Infinity` means an un-invalidated cache never updates. Missing an invalidation here shows as "my check-in didn't save" when it saved fine.

- [ ] **Step 5: Implement the stepped check-in UI using `RatingRow`, `StepperInput`, `SegmentedControl`**

`mobile/plans/08-checkin-ritual-design.md` and `09-checkin-research-brief.md` are the design intent for this flow — read them; they were written for exactly this screen and are the reason it deserves the centre slot.

- [ ] **Step 6: Verify on device — save, background the app mid-flow, reopen, confirm the draft survived**
- [ ] **Step 7: Commit**

```bash
cd DawnageMobile && npx jest --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add check-in flow with persisted drafts"
```

---

## Phase 8 — Progress

### Task 14: Measurements, photos and history

**Files:**
- Create: `src/screens/ProgressScreen.tsx`, `src/screens/MeasurementsScreen.tsx`, `src/screens/ProgressPhotosScreen.tsx`, `src/hooks/useMeasurements.ts`, `src/hooks/usePhotos.ts`
- Test: `__tests__/hooks/usePhotoUpload.test.ts`

**Interfaces:**
- Produces: `useMeasurements()`, `usePhotos()`, `uploadProgressPhoto(userId, date, label, uri)`.

From the spec, and read this carefully because one name means two things: rows go in the **`weekly_progress_photos` table**, files go in the **`progress_photos` storage bucket**, and there is also a legacy **`progress_photos` table** that must never be touched. Bucket and legacy table are spelled identically — check whether you are calling `.from()` on the storage client or the database client.

Path `${userId}/${dateStr}/${label}_${Date.now()}.jpg`. Compress to max 1200×1600 at quality 0.75 with `expo-image-manipulator`, `upsert: true`, `contentType: 'image/jpeg'`, then `getPublicUrl()` and store the URL on the row. Max source 10 MB. Baseline = oldest row = Week 0.

- [ ] **Step 1: Write the failing upload test (mock `expo-image-manipulator` and the storage client)**

Assert: compression is applied before upload, the path matches the required shape, and a >10 MB source is rejected with a clear error rather than attempted.

- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement `photosApi.uploadProgressPhoto` and `measurementsApi` (fetch-then-update/insert — neither table has a unique constraint)**
- [ ] **Step 4: Implement the three screens; weight metrics read from `daily_check_ins`, not `body_measurements`**
- [ ] **Step 5: Verify on device with a real camera capture and a library pick**
- [ ] **Step 6: Commit**

```bash
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add measurements, progress photos and history"
```

---

## Phase 9 — Plans and workout logger

### Task 15: Plan resolution and the logger

**Files:**
- Create: `src/screens/PlansScreen.tsx`, `src/screens/WorkoutLoggerScreen.tsx`, `src/hooks/usePlans.ts`, `src/hooks/useWorkoutLog.ts`
- Test: `__tests__/api/planResolution.test.ts`, `__tests__/utils/workoutContent.test.ts`

**Interfaces:**
- Produces: `resolveWorkoutPlan(userId, active)`, `resolveMealPlan(userId, active)`, `parseWorkoutContent(raw)`.

Plan resolution is the four-step algorithm in the spec: read `users.active_workout_plan` → query `workout_plans` on all four fields (`.is('sub_category', null)` when empty), order by `day_number`, **dedupe by `day_number` keeping highest `id`** → fall back to global `workout_templates` with `.is('coach_id', null)`. The logger's day picker uses the same resolution but **user plans only, no template fallback**.

- [ ] **Step 1: Write the failing content-parser test**

`workout_logs.content` has three historical shapes and the renderer must tolerate all of them. This is the highest-value test in the phase.

```ts
// __tests__/utils/workoutContent.test.ts
import { parseWorkoutContent } from '../../src/utils/workoutContent';

describe('parseWorkoutContent', () => {
  it('parses the current array format', () => {
    const raw = JSON.stringify([
      { exercise: 'Bench Press', sets: [{ setNumber: 1, reps: '8', weight: '60', rpe: '7' }] },
    ]);
    expect(parseWorkoutContent(raw)[0]).toMatchObject({
      name: 'Bench Press',
      sets: [{ setNumber: 1, reps: '8', weight: '60', rpe: '7' }],
    });
  });

  it('parses the legacy capitalised object format', () => {
    const raw = JSON.stringify([{ Exercise: 'Squat', Sets: '3', Reps: '10', Weight: '80' }]);
    expect(parseWorkoutContent(raw)[0].name).toBe('Squat');
  });

  it('tolerates a plain string row', () => {
    expect(parseWorkoutContent('Rest day')[0].name).toBe('Rest day');
  });

  it('returns an empty list for malformed JSON rather than throwing', () => {
    expect(parseWorkoutContent('{not json')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement `parseWorkoutContent` covering all three shapes plus the malformed case**
- [ ] **Step 4: Implement plan resolution with the dedupe and template fallback**

Note the trap the spec calls out: in `workout_plans.exercises`, `sets` is a **target count (number)**; in `workout_logs.content`, `sets` is an **array of logged sets**. Same key, different type, different table. Keep them in distinct domain types.

- [ ] **Step 5: Implement both screens, with the "no plan assigned" empty state**
- [ ] **Step 6: Verify on device against a real assigned plan**
- [ ] **Step 7: Commit**

```bash
cd DawnageMobile && npx jest --watchman=false && npx tsc --noEmit
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add plan resolution and workout logger"
```

---

## Phase 10 — More

### Task 16: Profile, settings and weekly feedback

**Files:**
- Create: `src/screens/MoreScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `WeeklyFeedbackScreen.tsx`
- Create: `src/stores/preferencesStore.ts`
- Test: `__tests__/stores/preferencesStore.test.ts`

**Interfaces:**
- Produces: `usePreferencesStore` — `theme` ('light'|'dark'|'system'), `hapticsEnabled`, `liquidGlassEnabled`, `remindersEnabled`, `reminderTime`. Zustand `persist`, single key `@Dawnage/preferences`. These never sync to the server.

`liquidGlassEnabled` is the toggle `useNativeIOSTabsActive()` reads (Task 7) — this is where the user opts into native iOS tabs.

Weekly feedback is **insert-only**, all non-id columns are TEXT, week number = `existing_count + 1` computed client-side. Keep `stress_level`, `water_intake`, `step_count` as strings on write.

- [ ] **Step 1: Write the failing preferences test (defaults, persistence key, setters)**
- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement the store and the four screens**
- [ ] **Step 4: Verify the Liquid Glass toggle actually swaps the tab bar on an iOS 26 device**
- [ ] **Step 5: Commit**

```bash
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add profile, settings and weekly feedback"
```

---

## Phase 11 — Polish

### Task 17: Motion, haptics and accessibility

**Files:**
- Create: `src/hooks/useMotion.ts`, `src/services/haptics.ts`
- Modify: interactive components across `src/components/`
- Test: `__tests__/hooks/useMotion.test.ts`

**Interfaces:**
- Produces: `useMotion() -> { duration, easing, spring, pressScale, reduced }`, `haptics.impact()`, `haptics.success()`, `haptics.warning()`.

Carry the motion tokens from `mobile/src/theme/tokens.ts` verbatim: durations micro 120 / feedback 160 / enter 200 / exit 160 / value 260 / celebration 500; easing standard `[0.16, 1, 0.3, 1]`, exit `[0.4, 0, 1, 1]`; springs sheet `{damping:20, stiffness:90}`, press `{damping:15, stiffness:250}`; `pressScale: 0.97`.

- [ ] **Step 1: Write the failing reduce-motion test**

```ts
// __tests__/hooks/useMotion.test.ts
import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useMotion } from '../../src/hooks/useMotion';

describe('useMotion', () => {
  it('collapses durations to 0 when Reduce Motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result } = renderHook(() => useMotion());
    await Promise.resolve();
    expect(result.current.reduced).toBe(true);
    expect(result.current.duration.enter).toBe(0);
  });

  it('keeps full durations when Reduce Motion is off', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = renderHook(() => useMotion());
    await Promise.resolve();
    expect(result.current.duration.enter).toBe(200);
  });
});
```

Screens must never check `isReduceMotionEnabled` themselves — the hook is the single place that decision lives, which is what makes it reliable.

- [ ] **Step 2: Run and confirm it fails**
- [ ] **Step 3: Implement `useMotion` and `haptics` (respecting `hapticsEnabled`)**
- [ ] **Step 4: Sweep every interactive element for 44pt targets, `accessibilityRole`, `accessibilityLabel` and `accessibilityState`**
- [ ] **Step 5: Verify with VoiceOver on iOS and TalkBack on Android**
- [ ] **Step 6: Commit**

```bash
git add DawnageMobile/src DawnageMobile/__tests__
git commit -m "feat(DawnageMobile): add motion, haptics and accessibility pass"
```

---

## Phase 12 — Release

### Task 18: Preview builds and store readiness

- [ ] **Step 1: Full validation**

```bash
cd DawnageMobile && npm run validate
```

Expected: typecheck, lint (zero warnings), format check and the full Jest suite all pass. Do not proceed on a red result.

- [ ] **Step 2: Android preview build and device install**

```bash
eas build --profile preview --platform android
```

- [ ] **Step 3: iOS development build** *(requires the Apple Developer membership)*

```bash
eas device:create        # register the test device UDID
eas build --profile development --platform ios
```

- [ ] **Step 4: Verify the iOS-only paths on real hardware**

Native tabs, native headers and Liquid Glass have no simulator substitute here and were never testable on this machine before this point. Confirm: the tab bar swaps when `liquidGlassEnabled` toggles; SF Symbols render (not blank); headers show the correct back labels.

- [ ] **Step 5: Production builds**

```bash
APP_VARIANT=production eas build --profile production --platform android
APP_VARIANT=production eas build --profile production --platform ios
```

- [ ] **Step 6: Write `DawnageMobile/PRIVACY_POLICY.md`** — both stores require a reachable privacy policy URL. Cover: health and body data, progress photos, what the coach can see, and data deletion.

- [ ] **Step 7: Commit and tag**

```bash
git add DawnageMobile/
git commit -m "chore(DawnageMobile): v1.0.0 release readiness"
git tag dawnagemobile-v1.0.0
```

---

## Risk register

| Risk | Likelihood | Handling |
|---|---|---|
| iOS blocked with no Apple Developer membership | High | Phase 1 targets Android; every phase up to 12 is platform-agnostic. Buy the membership before Task 18 Step 3. |
| EAS free-tier build queue is slow | Medium | Batch native changes. JS-only work needs no rebuild — that is most of Phases 4–11. |
| `uniwind` + Tailwind v4 is young | Medium | SparkyFitness runs it in production at 566 files. Fallback is `StyleSheet` reading the same tokens via `useCSSVariable`; the token layer is unaffected either way. |
| SDK 56 native module drift | Medium | Every version is pinned from a known-good working set. Change one at a time, rebuild, verify. |
| Supabase RLS blocks a query that worked on web | Medium | Web sometimes reads through a coach context this app never has. Test every query as a real client user, never as a coach. |
| 8 GB / 2015 iMac struggles with Metro | Low | Metro alone is fine; it is native compilation that is impossible, and that runs on EAS. |
| Scope creep from SparkyFitness's feature set | Medium | The out-of-scope list in Global Constraints is the contract. Nutrition, health sync, widgets and AI chat are all deliberately excluded from v1. |

---

## Self-review

**Spec coverage** — every table in `01-data-contracts.md` has an owning task: `users` → 10, 16; `daily_check_ins` → 13; `body_measurements` → 14; `weekly_progress_photos` → 14; `weekly_check_ins` → 16; `workout_logs` → 15; `workout_plans` / `workout_templates` / `meal_plans` / `meal_templates` → 15; `onboarding_questionnaire` → 11. Derived-metric formulas → 9. Onboarding gate → 11. Exclusion list → Global Constraints. `food_items` correctly absent.

**Placeholder scan** — no TBDs. Phases 8–11 give interfaces, exact spec references and named tests rather than full bodies for ported logic; the source file to port from is named in every case.

**Type consistency** — `toNumber` (Task 8) is used by every mapper in Task 9. `queryKeys` (Task 8) is referenced by name in 12–16. `IconName` (Task 5) is consumed by `Button` (Task 6). `useNativeIOSTabsActive` (Task 7) reads `liquidGlassEnabled`, defined in Task 16's `preferencesStore` — Task 7 must create the store with at least that field, noted in its Step 4.

**One known forward reference:** `src/stores/preferencesStore.ts` is imported in Task 7 but fully specified in Task 16. Task 7 creates it with `liquidGlassEnabled: false`; Task 16 extends it.

---

## Execution

Two ways to run this:

1. **Subagent-driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline** — execute in-session with checkpoints.

Either way, **Task 3 is a hard gate.** Nothing downstream is worth building until a development build runs on a physical device.
