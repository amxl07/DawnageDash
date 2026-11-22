# Redesign implementation evidence

This folder separates browser rendering, automated behavior checks, and native release evidence. Browser screenshots use fictional records and are not a substitute for device testing.

Read the [implementation report](implementation.md), [verification record](verification.json), and [independent review](review.md) for the delivered scope, exact source revisions, check results, and remaining release gates.

Open [the screen gallery](preview.html) to compare account entry, all three setup stages, Home, check-in and workout in both appearances and at 390 × 844 and 320 × 568. The accepted captures and their exact source revisions are under `local-web/phone` and `local-web/compact`.

## Reproduce browser captures

Use Node 22 or later and an installed Chrome. From mobile, start an isolated local Expo server with fictional configuration:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=fixture-public-key npx expo start --web --offline --port 8088 --max-workers 1
```

Then capture the actual routes:

```sh
node scripts/capture-redesign.mjs --url http://localhost:8088 --output docs/redesign/evidence/local-web/phone
node scripts/capture-redesign.mjs --url http://localhost:8088 --width 320 --height 568 --output docs/redesign/evidence/local-web/compact
```

Optional arguments: --screens home,checkin,workout; --themes dark,light; --width 320; --height 568; --chrome /absolute/path/to/chrome. The default Chrome path is the macOS application. Captures intercept all network traffic, fulfill only the fictional Supabase host, allow the local Expo server, and block other hosts. No live account credentials or records are used.

The script creates an isolated temporary browser profile, PNGs, visible-text files, layout geometry and a capture manifest. It checks compact screen gutters, tab-label bounds and the initial current-set action against its dock. It does not add an authentication bypass or fixture mode to production app routes. Fixture data lives in src/testing/redesignFixtures.json with typed exports for contract tests.

A known react-native-svg web interoperability warning about the native `accessible={false}` property is retained under `warnings`. Other console errors, exceptions, failed requests and geometry failures remain `errors` and fail the capture run. This distinction does not establish native accessibility correctness. Use `--wait-seconds 900` on a cold or slow filesystem; the script waits for the actual app before capturing.

## Evidence levels

| Evidence | Establishes | Does not establish |
| --- | --- | --- |
| Jest behavior checks | Tested state, payload, ordering, and recovery cases | Physical keyboard, platform gesture, or device timing behavior |
| Typecheck/lint/export | Static and bundling compatibility | Successful deployment or production auth configuration |
| Expo web captures | Actual route composition with controlled data | Native rendering parity, haptics, VoiceOver/TalkBack, or ProMotion |
| Maestro/device recordings | The specific native scenarios recorded on named builds/devices | All users or all devices |
| Pilot/diary study | Observed task and repetition feedback in its declared sample | A guaranteed retention or business outcome |

## Release checks requiring external evidence

Physical iOS/Android accessibility and performance, recruited usability/diary sessions, private progress-photo storage and migration, and actual coach-web V2 reader/editor compatibility retain the gates in [production quality and rollout](../2026-09-15/production-quality-and-rollout.md). No checked box or browser screenshot closes those gates by itself.
