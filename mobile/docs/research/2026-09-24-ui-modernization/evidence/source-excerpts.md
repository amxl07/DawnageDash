# Retrieved source excerpts

Selected short passages from the official documents retrieved during this research. See [sources.json](sources.json) for exact fetch URLs, dates and raw response hashes. These are research references, not app test evidence.

## Apple materials

> Don’t use Liquid Glass in the content layer.

> Use Liquid Glass effects sparingly.

> Only use clear Liquid Glass for components that appear over visually rich backgrounds.

## Apple branding

> Apply your app’s accent color judiciously.

> Minimize its use on controls and instead use it intentionally for primary actions or status indicators, like badges for unread content or an icon for the selected tab in a tab bar.

The page records its brand-color revision on September 9, 2026.

## Apple adoption guidance

> Reduce your use of custom backgrounds in controls and navigation elements.

> In system frameworks, standard components like bars, sheets, popovers, and controls automatically adopt this material.

## Expo native tabs, SDK 57

> The native tabs are constrained to the native platform behavior, whereas the JavaScript tabs can be customized more freely.

> You must store state outside the accessory component using props, context, or external state management.

The source examples import NativeTabs from `expo-router/unstable-native-tabs`. Installed type declarations independently confirm `canPreventDefault: false` for tabPress; see [the extracted declaration](native-tabs-guard-evidence.txt).

## Expo UI Button, SDK 57

> The `glass` and `glassProminent` styles are only available on iOS 26+ when built with Xcode 26.

## Expo UI Host, SDK 57

> Do not use `matchContents` on the same axis as a scroll container

The source also explains that flexible controls without intrinsic width need explicit sizing; otherwise matchContents can produce near-zero width.

## Apple adaptive layouts

> Follow the system’s vertical layout for toolbars, tab bars, and navigation controls.

> Build your app to resize.

> Avoid fixed widths and display-specific dependencies.

## Apple Design Awards 2026

For Moonlitt, Apple describes:

> best-in-class Liquid Glass integration, and easy onboarding

For The Outsiders, Apple describes:

> a beautiful data visualization that shows training load alongside metrics such as sleep quality and resting heart rate

For Tide Guide, Apple describes:

> rich full-screen charts

Winner/finalist distinctions are recorded separately in the research report.

## Google Material 3 Expressive research

> Through 46 separate research studies with hundreds of designs, and more than 18,000 participants from around the world

> The fundamental parts of expressive design are the use of color, shape, size, motion, and containment.

These are Google's research claims, not Dawnage usability measurements.
