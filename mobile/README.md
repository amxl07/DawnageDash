# Dawnage Mobile

React Native (Expo) client app for DawnAge — iOS + Android. Reimplements the
**client-facing** experience of the web dashboard. No coach/admin features.

Fully isolated from the web app: its own `package.json`, lockfile and
`node_modules`. Nothing outside `mobile/` is ever modified.

## Prerequisites

- Node 20+ (verified on v22.16.0)
- `watchman` (`brew install watchman`) — recommended on macOS
- **Expo Go** on a physical iOS and Android device

> **No local simulator on this machine.** macOS 12.7.6 with Command Line Tools
> only caps out at Xcode 14.2, below what this SDK needs, and there is no JDK
> for an Android emulator. Develop against physical devices over Expo Go; use
> **EAS Build** (cloud) for any native or store build.

## SDK version — why 54 and not the latest

Pinned to **Expo SDK 54** deliberately. Two reasons, both load-bearing:

1. **Expo Go on the iOS App Store stops at SDK 54.** Each Expo Go build bundles
   exactly one SDK and the project must match. On SDK 55+ an iPhone can only run
   the app through `sign.expo.dev` certificates that expire every ~7 days, or a
   paid-account development build. SDK 54 is the newest SDK that just works with
   the App Store app.
2. **Minimum iOS 15.1 instead of 16.4.** SDK 56/57 require iOS 16.4+, which cuts
   off iPhone 7 / 6s / SE-1 (they cap at iOS 15.8). iOS 15+ reaches ~97.7% of
   devices vs ~95.5% for iOS 16+.

| SDK | React Native | Min iOS | App Store Expo Go |
|---|---|---|---|
| 57 | 0.86 | 16.4+ | no |
| 56 | 0.85 | 16.4+ | no |
| 55 | 0.83 | 15.1+ | no |
| **54** | **0.81** | **15.1+** | **yes** |

Before upgrading past 54, be deliberate about both consequences.

`.npmrc` sets `legacy-peer-deps=true` because `@react-native-community/datetimepicker`
carries an optional peer on `react-native-windows` that pins a different React
Native than the SDK. We never build for Windows.

## Setup

```bash
cd mobile
npm install
```

Create `mobile/.env` (gitignored — see `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Both values are the same as the repo-root `.env` keys `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. **Anon key only** — never `SUPABASE_SERVICE_ROLE_KEY`.
Without these the app shows a "missing configuration" screen instead of crashing.

## Run

```bash
npx expo start
```

Scan the QR code with the **Camera app** on iOS or the **Expo Go app** on
Android. Phone and Mac must share a Wi-Fi network. Add `--tunnel` if they can't
see each other.

## Build (EAS)

```bash
npx eas-cli build --profile development --platform android   # dev client
npx eas-cli build --profile preview     --platform android   # installable APK
npx eas-cli build --profile production  --platform all
```

Minimum OS: **iOS 15.1**, **Android 7**. Bundle identifiers are `com.dawnage.app` on both platforms — change in
`app.json` before the first production build if you want something else.

## Layout

```
app/                     Expo Router routes (thin — they render screens)
  (auth)/                login, password reset
  (app)/(tabs)/          Home · Check In · Plans · Logs · More
  (app)/                 measurements, media, weekly-feedback, profile, settings
src/
  components/ui/         themed primitives (Button, Card, Screen, …)
  contexts/AuthContext   session + role, no impersonation
  lib/                   supabase client, env guard
  theme/                 colours, tokens, ThemeProvider, useMotion
plans/                   the phased implementation plan (start at 00-MASTER-PLAN.md)
```

## Conventions

- **No hex literals outside `src/theme/`.** Every colour comes from `useTheme()`.
- **Motion via `useMotion()`**, which collapses durations when the OS
  "Reduce Motion" setting is on. Screens never check that themselves.
- Accessibility, list virtualisation, form keyboards and loading/error/empty
  states ship *with* each screen — see `plans/03-ux-standards.md`.
- `npx tsc --noEmit` must be clean before any phase is called done.

## Development status

**All 9 phases implemented.** Auth, onboarding, questionnaire, dashboard,
daily check-ins, measurements, progress photos, plans, workout logger,
weekly feedback, profile, and local reminders.

Not yet verified on a physical device — see the handover notes from the build
session. `plans/` holds the original specification.
