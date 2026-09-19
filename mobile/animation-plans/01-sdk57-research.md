# SDK 57: what is useful for Dawnage

Research date: 17 September 2026. Version authority: the app's `package.json` and installed `node_modules/expo/bundledNativeModules.json`. Official documentation was fetched over HTTP. “Included in Expo Go” describes the matching SDK runtime, not arbitrary package versions, custom native changes, or a completed device test.

## Current foundation and options

| Technology | Current app / SDK 57 version | Practical role | Decision and limits |
| --- | --- | --- | --- |
| Expo / React Native / React | Installed 57.0.23 / 0.86.3 / 19.2.3 | Native app/runtime foundation | Retain the working upgrade. Do not enable React Compiler as part of visual polish. |
| Reanimated / Worklets | Installed 4.5.1 / 0.10.1; same SDK pins | Press states, interrupted transitions, derived visual values, gesture feedback | Primary motion engine. Current compatibility table includes RN 0.86 for Reanimated 4.5.x. Use supported installed APIs, not examples for newer releases. |
| Gesture Handler | Installed ~2.32.0 | Sheet gestures, deliberate chart inspection | Existing foundation. Continuous visual work stays off the React state-update path; commit domain changes only at meaningful boundaries. |
| React Native SVG | Installed 15.15.4 | Icons, simple rings, compact charts | Keep for simple graphics. A seven-segment ring or checkmark alone does not justify Skia. |
| React Native Skia | Not a direct dependency; SDK pin **2.6.2**; official Expo page says included in Expo Go | Touch-responsive charts, clipped paths, layered vector drawing | Recommended **selective pilot**. Prefer one visible canvas in the initial pilot. Native text/controls and textual data remain outside the canvas. Web needs asynchronous CanvasKit setup or an SVG fallback. |
| Expo Glass Effect | Installed ~57.0.3; included in Expo Go | Supported iOS floating navigation/rest controls | Actual Liquid Glass requires iOS 26+ and runtime API availability. Android/web/older iOS receive a designed solid surface. Existing tab bar already uses it. |
| Expo Blur | Installed ~57.0.3; included in Expo Go | A small material layer where glass is unavailable and blur adds hierarchy | Android blur is documented as stable since SDK 55, with changed target/method setup. No per-frame blur-intensity animation. Solid remains the baseline. |
| Expo Symbols | Installed ~57.0.3; included in Expo Go; documented beta | A few semantic symbol state changes | Current docs expose SF Symbols on iOS and Material Symbols on Android/web. Use platform mappings and fallback icons; effect support is platform/version-specific. Retain Lucide as the consistent baseline. |
| `@expo/ui` | Installed ~57.0.18; included in Expo Go | Native menus, pickers, settings controls | Evaluate isolated controls. SwiftUI and Compose have different APIs/hosting requirements; documented universal components are not a guarantee that every native component works everywhere. Do not rewrite forms. |
| Gorhom Bottom Sheet | Installed ^5.2.14 | Overview, exercise details, review, pickers | Keep the repaired shared Sheet. Motion polish must preserve snap points, keyboard integration, dismissal guards and focus restoration. |
| Keyboard Controller | Not direct dependency; SDK pin **1.21.9**; official Expo page says included in Expo Go | Keyboard-following accessory/actions where actual device testing shows a gap | Conditional pilot only. Existing keyboard logic and sheet-aware input work; adding a second inset owner can regress them. |
| Lottie React Native | Not direct dependency; SDK manifest **~7.3.8** | A finite, professionally authored onboarding or milestone illustration | Optional. Static poster/failure fallback and reduced-motion frame required. SDK manifest is verified; attempted Expo Lottie documentation URLs returned 404, so do not claim a freshly verified library-page compatibility guarantee. Validate this exact SDK runtime before adoption. |
| Rive | Neither Rive nor Nitro Modules installed; no Expo bundled entry | Stateful, designer-authored interactive illustration | Defer unless a specific approved asset needs it. Current runtime is `@rive-app/react-native` with `react-native-nitro-modules`; legacy `rive-react-native` differs. Requires native integration/development build; no Expo Go support should be assumed. Test RN 0.86 specifically. |
| Expo Image / Linear Gradient | Installed ~57.0.5 / ~57.0.2 | Cached photos, intentional static tonal depth | Already sufficient for photographic and editorial polish. Never animate actual body/progress images in a way that changes perceived results. |
| Expo GL / 3D / experimental graphics backends | `expo-gl` SDK pin ~57.0.2; not direct app dependency | Specialist 3D experiences | No current user task needs a real-time 3D scene. Keep out of the core logging product. Skia's experimental Graphite is not the production baseline. |

## What the upgrade actually changes

Skia, Reanimated, Lottie, haptics and high-quality SVG were possible on earlier Expo versions. SDK 57 aligns this app with newer supported libraries and native runtime behavior. The useful gain is a supported foundation for careful work, not a new visual style automatically applied to old screens.

Two concrete opportunities are current native materials and the updated Android blur API. Neither requires turning every card translucent. The current app already has glass-capable tabs, motion tokens, haptics, animated values, a chart, and native sheet infrastructure; these should be refined before adding a parallel system.

## Recommended graphics architecture

```text
Domain data / draft / server receipt
              ↓
React screen + native semantic controls + textual values
              ↓
Small visual adapter (normalized data, shared visual values)
              ↓
Reanimated transforms / existing SVG / optional Skia canvas
```

Rendering is downstream of saved state. An animation callback never submits a check-in, marks a set complete, chooses a different date, or advances a timer's underlying clock.

For Skia, start with a single `RecentRecord` chart experiment. Keep its observations, dates, units, sparse-data messaging and adjustable accessibility wrapper. Compare interaction responsiveness and rendering cost against the existing SVG implementation. Keep SVG if results are equivalent. A small weekly ring can use the winning renderer later without forcing a whole-app canvas migration.

Use a native/SVG fallback on web for the first implementation. If CanvasKit is later needed, self-host the version-matched WASM, lazy-load the graphics module, display readable data while loading, and exercise offline/CSP/failure behavior. The current Skia web docs estimate 2.9 MB gzipped for WASM; that is an upstream estimate, not a measurement of Dawnage's final bundle. Current Skia documentation includes behavior for versions newer than the Expo 2.6.2 pin: verify every chosen API in that installed version.

## Materials: platform truth

- Gate glass with both the OS/runtime support check and actual Glass Effect API availability; keep the existing exception-safe fallback. Observe reduced transparency live.
- Use regular glass only for floating functional chrome, with stable foreground contrast. Forms, charts, cards and photo backgrounds stay solid.
- The installed GlassView types support `glassEffectStyle: { style, animate, animationDuration }`; **animationDuration is in seconds**. The official docs recommend this for native style changes. Do not apply a generic opacity-to-zero recipe to a GlassView ancestor: the SDK docs document a rendering issue.
- Android's `BlurView` now has `blurMethod` and a `blurTarget` contract. `experimentalBlurMethod` is deprecated locally. Profile blur on a representative Android device before choosing it over solid.
- A native-tabs experiment is a separate navigation migration. Current JS tabs intentionally have no transition and intercept check-in exits. Appearance alone is insufficient reason to replace those semantics.

## Research sources

Retrieved or inspected on 17 September 2026:

| Source | Evidence used |
| --- | --- |
| [Expo Skia](https://docs.expo.dev/versions/latest/sdk/skia/) | 2.6.2 recommendation, Expo Go inclusion, CanvasKit requirement; HTTP 200 |
| [Skia installation](https://shopify.github.io/react-native-skia/docs/getting-started/installation/) | React/RN minimums, native requirements, optional experimental backend, upstream size estimates; HTTP 200 |
| [Skia animations](https://shopify.github.io/react-native-skia/docs/animations/animations/) | Shared/derived-value integration; rolling docs include newer version guidance; HTTP 200 |
| [Skia web](https://shopify.github.io/react-native-skia/docs/getting-started/web/) | Asynchronous CanvasKit and loading requirements; HTTP 200 |
| [Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) | RN and Worklets compatibility tables; HTTP 200 |
| [Expo 57 glass](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/) | iOS 26+, runtime availability, style animation, opacity caveat; HTTP 200 |
| [Expo 57 blur](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/) | Android stability and changed API; HTTP 200 |
| [Expo Symbols](https://docs.expo.dev/versions/latest/sdk/symbols/) | Beta status and platform symbol libraries; HTTP 200 |
| [Expo 57 UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/) | SwiftUI, Compose and universal components; HTTP 200 |
| [Expo Keyboard Controller](https://docs.expo.dev/versions/latest/sdk/keyboard-controller/) | 1.21.9 and Expo Go inclusion; HTTP 200 |
| [Rive React Native](https://rive.app/docs/runtimes/react-native/react-native) | Modern and legacy runtime distinction; Nitro requirement; HTTP 200 |
| [Lottie repository](https://github.com/lottie-react-native/lottie-react-native) | Official project reference; exact SDK version authority remains the local Expo manifest |
| [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Official page's [documentation JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json) retrieved HTTP 200: purposeful/optional motion, brief feedback, cancellability, restraint for frequent actions |
| [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials) | [Documentation JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json) retrieved HTTP 200: Liquid Glass belongs to functional controls/navigation, used sparingly; regular material supports legibility |
| [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | [Documentation JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json) retrieved HTTP 200: simple gestures with alternatives, color-independent meaning, readable text and reduced-motion behavior |
| [Designing Fluid Interfaces, WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/) | Reference behind the Apple design skill: response, continuity, interruption and direct manipulation; exact Dawnage durations below are house choices, not Apple-mandated values |

Local API evidence: `node_modules/expo/bundledNativeModules.json`, `expo-glass-effect/src/GlassView.types.ts`, `expo-blur/src/BlurView.types.ts`, `expo-symbols/src/SymbolModule.types.ts`. Compatibility has been researched, not exercised on physical devices in this pass.

Additional checks: [Rive's Expo guide](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo) retrieved HTTP 200 explicitly requires a development build and uses legacy-runtime examples; do not combine those examples blindly with the modern Nitro runtime. [Native tabs](https://docs.expo.dev/router/advanced/native-tabs/) retrieved HTTP 200 documents platform-specific behavior and migration considerations. Lottie's official raw README was retrieved HTTP 200; the latest Expo Lottie URL returned 404 and the versioned request failed in transport. Apple guidance supports the principles above; Dawnage's exact durations and 44/48-point target policy remain deliberate product choices.
