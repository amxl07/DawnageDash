# Dawnage mobile

An original Expo SDK 56 fitness client for a SparkyFitness-compatible self-hosted server. The core slice supports a deterministic local demo, server setup and email/password sign-in, daily summary and diary, food search/logging, simple seven-day insights, and connection management.

## Runtime and installation

This app uses an Expo **custom development build** (`expo-dev-client`). It is **not supported in Expo Go**. Native modules and follow-on native integrations require a development build.

From `mobile-2/`:

```sh
npm ci
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo install --check
npm run export
```

Create an EAS development build, install the artifact on the target device, then start Metro for that installed client:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

For an iPhone development build, use the same flow with `--platform ios`; EAS will require an Apple developer account and signing credentials:

```sh
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client
```

To run an already configured local Android toolchain instead of EAS:

```sh
npx expo run:android
npx expo start --dev-client
```

The local Android route needs Android Studio, an Android SDK/emulator or USB-debuggable device, the SDK command-line tools on `PATH`, and a supported JDK (use JDK 17 for the Android build toolchain). Set `ANDROID_HOME`/`ANDROID_SDK_ROOT` to the installed SDK location.

### Current machine limitation

This workspace was checked on 2026-09-01: macOS 12.7.6 on `x86_64`, with only `/Library/Developer/CommandLineTools` selected; `xcodebuild` cannot run because full Xcode is not installed. No Java runtime is installed. Therefore this machine cannot make a local iOS build or a local Android native build until full compatible Xcode and a JDK/Android SDK are installed. The JavaScript checks and EAS cloud development builds remain usable. Current Expo tooling reports `56.1.25`.

## Demo and connection modes

Open the app and choose **Explore the demo** for deterministic, mutable in-memory data. Demo mode needs no server and continues to permit food additions offline. Choose **Connect my server** to validate a server, then sign in. Only the normalized server URL, token, and email are persisted in SecureStore; passwords are never stored.

No environment value is required for the current runtime. `.env.example` deliberately contains no credentials. Do not put server passwords, API keys, or session tokens in `EXPO_PUBLIC_*` variables: those values are bundled into the client. The server URL is entered and validated at runtime.

## Compatible server contract

The client implements compatibility from public HTTP behavior and validates all response bodies before UI consumption. A connected server must provide these endpoints under the entered base URL:

| Endpoint | Use |
| --- | --- |
| `GET /api/auth/settings` | Validate the server before sign-in. |
| `POST /api/auth/sign-in/email` | Accept JSON `{ email, password }` and return a non-empty token (MFA redirects are intentionally unsupported in this core slice). |
| `GET /api/daily-summary?date=YYYY-MM-DD` | Daily calories, macros, and food entries. |
| `GET /api/foods/foods-paginated` | Food search with `searchTerm`, `currentPage=1`, `itemsPerPage=20`, and `sortBy=name:asc`. |
| `GET /api/meal-types` | Available logging meal types. |
| `POST /api/food-entries/` | Create a food entry from snake-case entry fields. |

Authenticated API requests use `Authorization: Bearer <token>` and `X-Meal-Model-Version: 2`. Sign-in sends a JSON body and an `Origin` derived from the chosen server. Configure the server and reverse proxy to accept the device’s connection and that origin/header behavior.

Production builds accept **HTTPS only**. During development, HTTP is accepted solely for `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`; this is for a LAN server reachable by a physical test device. A public HTTP URL is rejected even in development. Do not expose a development HTTP server to the internet, and use a trusted certificate for all production use.

## Verification and export

`npm run check` combines the type check, lint, and test suite. `npm run export` runs `expo export` and writes the static web bundle plus native JavaScript bundles to `dist/`; it is a bundle check, not a signed App Store or Play Store binary.

## Licensing boundary

`mobile-2` is independently authored. It does not import, copy source from, or copy assets from `SparkyFitness/` or the older `mobile/` app. It only targets compatible HTTP endpoints and response shapes.

SparkyFitness is source-available under its non-commercial license. Running, modifying, distributing, or commercially hosting the SparkyFitness server requires following that license; commercial use needs the repository owner’s prior written permission. This README is not legal advice—review `SparkyFitness/LICENSE` and obtain permission where needed.

## Native follow-on work

Health integrations, background execution, notifications, widgets/Live Activities, scanner/photo AI, and expanded health domains are intentionally excluded from this core. See [the native roadmap](docs/native-roadmap.md).
