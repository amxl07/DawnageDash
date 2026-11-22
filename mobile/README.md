# Dawnage Mobile

React Native (Expo) client app for DawnAge — iOS + Android. Reimplements the
**client-facing** experience of the web dashboard. No coach/admin features.

The app has its own `package.json`, lockfile and `node_modules`. The pure
progress-photo contract in `../shared/` is shared with the web dashboard; keep
mobile and web photo readers compatible with the storage migration.

## Prerequisites

- Node 22 LTS, v22.13 or newer in the 22.x line (verified on v22.16.0)
- `watchman` (`brew install watchman`) — recommended on macOS
- **Expo Go** on a physical iOS and Android device

> **No local simulator on this machine.** macOS 12.7.6 with Command Line Tools
> only caps out at Xcode 14.2, below what this SDK needs, and there is no JDK
> for an Android emulator. Develop against physical devices over Expo Go; use
> **EAS Build** (cloud) for any native or store build.

## Expo SDK 57

The app uses **Expo 57.0.24**, **React Native 0.86.3**, and **React 19.2.3**,
matching the SDK 57 Expo Go client. On physical iOS devices, the App Store's
current Expo Go client supports only its current SDK; an SDK 54 project cannot
run in the SDK 57 client.

After upgrading dependencies, stop the previous Metro server and start a fresh
one. See [the SDK 57 upgrade notes](docs/expo-sdk-57-upgrade.md) for compatibility
changes and verification. Older redesign plans describe the SDK 54 baseline
used when those plans were written.

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
npm start -- --clear --max-workers 1
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

App identities come from `app.config.ts`: development uses `com.dawnage.app.dev`,
preview uses `com.dawnage.app.preview`, and production keeps `com.dawnage.app`.
The preview profile targets physical devices; use `preview-simulator` for an iOS
Simulator. Start an installed development client with `npm run start:dev`.
`npm start` continues to open Expo Go.

See [release hardening and validation](docs/release/2026-09-19-hardening.md) for
build environments, photo rollout, diagnostics and the device/user-study gates.
The [current preview/device pass](docs/release/2026-09-19-device-preview.md) keeps
the existing Supabase project and defers photo staging. The repository-root
`.easignore` limits cloud uploads to the mobile app and its shared runtime contract;
configure the existing public backend values in EAS, because `.env` is excluded.

## Layout

```
app/                     Expo Router routes, layouts and screen composition
  (auth)/                login, password reset
  (app)/(tabs)/          Home · Check In · Plans · Logs · More
  (app)/                 measurements, media, weekly-feedback, profile, settings
src/
  components/ui/         themed primitives (Button, Card, Screen, …)
  contexts/AuthContext   session + role, no impersonation
  lib/                   supabase client, env guard
  theme/                 colours, tokens, ThemeProvider, useMotion
plans/                   historical phased implementation specifications
docs/release/            current release handoff and validation evidence
```

## Conventions

- **No hex literals outside `src/theme/`.** Every colour comes from `useTheme()`.
- **Motion via `useMotion()`**, which collapses durations when the OS
  "Reduce Motion" setting is on. Screens never check that themselves.
- Accessibility, list virtualisation, form keyboards and loading/error/empty
  states ship *with* each screen — see `plans/03-ux-standards.md`.
- `npx tsc --noEmit` must be clean before any phase is called done.

## Development status

Auth, onboarding, Home, guided check-ins, measurements, photos, Plans,
workout logging, weekly feedback, Profile and local reminders are implemented.
The [current release handoff](docs/release/2026-09-19-hardening.md) is the
maintained index for reliability fixes, cleanup, verification and remaining
release work. `plans/` and `docs/redesign/` preserve earlier design history.

Physical-device acceptance, the coordinated private-photo migration and the
usability study remain release gates; source checks do not replace them.
