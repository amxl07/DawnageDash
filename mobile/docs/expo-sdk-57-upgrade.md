# Expo SDK 57 compatibility

The iOS Expo Go client supports SDK 57, while Dawnage previously used SDK 54. This upgrade targets Expo 57.0.23, React Native 0.86.3 and React 19.2.3, using Expo's published SDK 57 dependency matrix.

## Run on your iPhone

Stop the previous Metro server with Ctrl+C, then run from `mobile`:

```sh
npm install
npx expo start --go --clear --max-workers 1
```

Scan the new QR code with your iPhone. The previous Metro process must be restarted after the dependency upgrade. Use the current SDK 57 Expo Go app, with the phone and computer on the same network.

## Compatibility changes

- Expo modules, React Native, gestures, Reanimated and Worklets use versions from `expo/bundledNativeModules.json` for SDK 57.
- Navigation hooks and guards use Expo Router's own navigation context through `expo-router/react-navigation`. Tabs and tab-bar height context use `expo-router/js-tabs`. Separate `@react-navigation/*` packages would create a second context after Router's SDK 56 migration.
- Jest uses the matching `jest-expo` and `@react-native/jest-preset`; both test renderers match React 19.2. Its resolver composes Worklets' supplied JavaScript-runtime resolver with React Native's subpath resolver, so animation tests do not try to initialize a native Worklets runtime. The old direct Metro runtime pin is removed so the runtime follows its owning packages.
- TypeScript 6 explicitly loads Node, Jest and React globals. Test helpers use the renderer declarations now supplied by gesture-handler; obsolete missing-declaration suppressions are removed. Tab icon colors accept React Native's `ColorValue` type.
- Existing onboarding, check-in, workout, recovery and persistence behavior is retained. No generated native projects are present; Expo Go does not require a local Xcode build.
- The existing `.npmrc` workaround remains necessary: npm's strict resolver tries to install the date picker's optional Windows peer, whose React Native version conflicts with SDK 57. Dawnage targets iOS, Android and web. Expo compatibility diagnostics and the installed dependency tree are checked separately.

## Verification

Verified on 2026-09-16 with Node 22.16.0:

| Check | Result |
| --- | --- |
| Expo Doctor | 21/21 checks passed, including SDK versions, required peers and duplicate dependencies |
| TypeScript | Passed with TypeScript 6 |
| Standard ESLint | Passed with zero warnings; compiler audit is separate, as described below |
| Jest | 116 suites, 837 tests passed; process exited with code 0 |
| UI contracts | Passed for 186 source files |
| iOS production export | Passed, including Hermes bytecode |
| Android production export | Passed, including Hermes bytecode |
| Web production export | Passed |
| Fresh Expo Go manifest | `sdkVersion: 57.0.0`, `runtimeVersion: exposdk:57.0.0`, slug `dawnage` |
| Browser rendering | Onboarding, Home, Check-in and Workout rendered at 390 × 844 in dark mode, with no captured runtime errors or layout-check failures |

The browser check ran the production web export in headless Chrome using fictional, intercepted data. Screenshots were visually reviewed. It covers initial rendering and the existing capture script's geometry checks; it does not establish full end-to-end interaction or physical-device behavior. Native app installation, keyboard behavior, haptics and device performance still need an iPhone/Android device check. No Xcode or EAS build was run.

Tests ran serially with `node --expose-gc --max-old-space-size=1024 node_modules/jest/bin/jest.js --runInBand --no-watchman --testTimeout=60000`. Exports ran once per platform with `--max-workers 1`, using fixture environment values. The temporary manifest and web servers were stopped after verification. Restart Metro using the command above to load the app's normal local environment.

See [the verification record](expo-sdk-57-verification.json) for the recorded results. Local logs, bundles and screenshots are in `/tmp/dawnage-sdk57-research/`; these temporary artifacts may be cleared by the operating system. The earlier SDK 54 redesign evidence remains its historical baseline.

## React Compiler adoption

React Compiler remains disabled, matching the previous app configuration. SDK 57's lint preset introduces compiler diagnostics: the initial audit reported 105 findings in existing ref, effect, immutability, global and memoization patterns. Refactoring those state and persistence lifecycles is outside this Expo Go compatibility change.

Standard lint retains the previous Hooks rules (`rules-of-hooks` and `exhaustive-deps`) and the remaining Expo rules. Compiler diagnostics automatically join standard lint when `experiments.reactCompiler` is enabled. Run `npm run lint:compiler` to see the complete adoption audit while the compiler is disabled; this separate audit currently fails with the findings above. No test assertions were removed.

## Sources

- [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) ([source](https://github.com/expo/expo/blob/main/docs/pages/workflow/upgrading-expo-sdk-walkthrough.mdx)).
- [Expo SDK metadata](https://exp.host/--/api/v2/versions) and the dependency matrix shipped in `expo@57.0.23`.
- [Expo Router changes](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/CHANGELOG.md), including the SDK 56 navigation migration.
- [Jest Expo changes](https://github.com/expo/expo/blob/sdk-57/packages/jest-expo/CHANGELOG.md).

The Expo changelog website returned HTTP 403 during research; published package metadata and Expo's source changelogs were used instead.
