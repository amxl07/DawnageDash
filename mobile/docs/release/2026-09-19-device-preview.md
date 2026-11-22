# Preview builds and core device validation — 19 September 2026

## Current scope

Keep the current Supabase project and configuration. The user deferred photo staging, storage-policy changes, coach grants and live photo access tests. Continue with installable preview preparation and Home, daily check-in and workout validation. The existing photo implementation is unchanged.

The `preview` EAS profile produces an Android APK or an internally distributed physical-iPhone build. Both use `com.dawnage.app.preview` and the `dawnage-preview` link scheme. The separate installation isolates local drafts and authentication storage. It still connects to the same backend: use an existing dedicated test account for any test that writes records. Do not reset real users or clear application data to make recovery tests pass.

## Build preparation

- Preview cloud configuration now rejects a missing public backend key, a malformed/non-HTTPS URL, localhost or a `.invalid` endpoint before native compilation. The backend values themselves are never included in validation errors.
- The repository-root `.easignore` includes `mobile/` and `shared/progress-photos.ts`. Local environment files, signing files, caches, generated native projects, reports, test fixtures and unrelated apps/server/migrations are excluded from upload. Keep the shared contract: mobile imports it outside its own directory.
- The user selected the personal Expo account **amxlm**. The app is now linked to [@amxlm/dawnage](https://expo.dev/accounts/amxlm/projects/dawnage), project ID `08d6bcb5-ebb0-4c32-96c4-22c777b33f2d`.
- The EAS **preview** environment contains the two existing public mobile backend values. Their values were compared with `mobile/.env` without printing them. Supabase itself was not accessed or changed.
- Android preview build [`6265b9fa-3e3f-43e0-a898-b86d4d74c965`](https://expo.dev/accounts/amxlm/projects/dawnage/builds/6265b9fa-3e3f-43e0-a898-b86d4d74c965) **finished successfully on 20 September 2026 (IST)**. Expo Doctor passed 21/21 checks, Android prebuild and bundling passed, and Gradle produced the release APK. The dependency fingerprint was included. No store submission or device test has run.

Verification: all seven build-configuration tests, TypeScript and lint of the changed TypeScript files passed. EAS archive inspection produced 228 files; every required production module and configuration file was present, all archived files matched the current source, and the excluded environment/signing/unrelated files were absent. These are source/archive checks, not native-build acceptance. See the [verification record](evidence/2026-09-19-preview.json).

The subsequent [cloud-build receipt](evidence/2026-09-20-cloud-preview.json) records the successful Android build and downloaded APK checks. The APK is 121,617,428 bytes, uses `com.dawnage.app.preview`, version `1.0.0` / code `1`, targets Android API 36 and supports API 24 onward. ZIP integrity passed, the download checksum matched the server ETag, the release is not debuggable, and its bundled public backend URL/key match the existing `mobile/.env`. The APK signing block is present; no independent cryptographic signature verification or device launch was performed. Its SHA-256 is `d8fa8f46a9eaf88821b772ecb920e926fefbbfec469338c3b1887a39cc7635ff`.

The downloaded artifact remains in the gitignored local evidence directory as [DawnagePreview-1.0.0-1.apk](../ui-release-evidence/2026-09-20-preview/DawnagePreview-1.0.0-1.apk). This is a universal internal APK with four Android architectures; its size is not a Play Store download-size measurement. The build includes the uncommitted approved app changes; the Git commit ID alone does not identify this source snapshot. The receipt includes the archived source hashes.

For subsequent previews, keep `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the EAS **preview** environment aligned with the intended existing mobile backend. Both are stored with Sensitive visibility in Expo; they remain public client configuration embedded in the application. Do not use the repository-root service-role key. Keep values out of logs and chat. No change to the Supabase project or its schema was required.

From `mobile/`:

```sh
# Inspect the exact upload contents locally; use a new output directory.
eas build:inspect --profile preview --platform android --stage archive --output /tmp/dawnage-preview-archive

# Once the EAS project/environment and signing credentials are configured:
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

The Android result must be an installable APK. A physical-iPhone build requires the Apple signing team and a registered test device. `preview-simulator` does not install on a physical iPhone. This host has Command Line Tools only, without Xcode Simulator, ADB or Maestro; native acceptance must run on a supported host/device. Expo Go remains available for development with `npm start`.

## Core device pass

Install [Dawnage Preview 1.0.0 (1) for Android](https://expo.dev/artifacts/eas/jB3yqdWlzBcQYwspfdRgmNhkxjzBaZoOXKm4ArKWx7k.apk). This is the internal APK, installed separately from `com.dawnage.app`. The APK does not install on an iPhone; a physical-iPhone preview still requires Apple signing and a registered test device.

Start with one small iPhone and one mid-range Android device. Record the actual EAS build ID, device/OS, appearance, text size and result. The detailed [release matrix](2026-09-19-hardening.md#native-acceptance-record) and [Maestro setup](../../.maestro/README.md) remain applicable; skip the photo journey for this pass.

| Task | Pass condition | Current result |
| --- | --- | --- |
| Install and launch | Preview installs separately and reaches sign-in without configuration errors | APK built/inspected; install and launch pending device |
| Home | Next action is clear; incomplete data shows a recoverable error | Pending device |
| Check-in input | Ratings work with one finger; vertical scroll and keyboard never trap the primary action | Pending device |
| Check-in interruption | Enter answers, wait for local-save acknowledgement, terminate and reopen; same account/date/answers return | Pending device |
| Check-in offline save | Queued intent survives termination; reconnect acknowledges the intended values without a false synced state | Pending device |
| Workout interruption | Complete a set, start rest, background/resume, terminate/reopen; set and timer behavior remain correct | Pending device |
| Workout completion | Correct a set, review and save; editing that log does not overwrite a different same-day session | Pending device |
| Accessibility | Light/dark, larger text, Reduce Motion and VoiceOver/TalkBack preserve reachability and state announcements | Pending device |

Use the existing Maestro core journeys individually after supplying the dedicated test credentials. They preserve application data. The check-in flow leaves a local draft; the workout flow reaches review and returns to editing. **Neither proves successful server submission.** Complete the offline/reconnect and final-save cases separately, inspecting the dedicated test account's resulting record.

Once Maestro and the preview app are installed, inject the dedicated account from your local secret store and run from `mobile/` (do not paste credentials into chat or commit them):

```sh
maestro test \
  -e DAWNAGE_E2E_APP_ID=com.dawnage.app.preview \
  -e DAWNAGE_E2E_EMAIL="${DAWNAGE_E2E_EMAIL:?Set the dedicated test email}" \
  -e DAWNAGE_E2E_PASSWORD="${DAWNAGE_E2E_PASSWORD:?Set the dedicated test password}" \
  .maestro/home-checkin.yaml

maestro test \
  -e DAWNAGE_E2E_APP_ID=com.dawnage.app.preview \
  -e DAWNAGE_E2E_EMAIL="${DAWNAGE_E2E_EMAIL:?Set the dedicated test email}" \
  -e DAWNAGE_E2E_PASSWORD="${DAWNAGE_E2E_PASSWORD:?Set the dedicated test password}" \
  .maestro/workout-interruption.yaml
```

Before testing a password-reset link, check whether the preview scheme is already allowed. If it is not, record that case as deferred: this pass does not change Supabase Auth configuration.

## Dependency follow-up before production

Cloud npm output and a read-only `npm audit --omit=dev --json` reported 14 moderate package-level findings, representing two underlying advisories; there were no high or critical findings in that audit. This is not a security certification. Review compatible fixes for [decode-uri-component malformed-input denial of service](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) (also reported through Expo Router/query-string) and [uuid buffer bounds checking](https://github.com/advisories/GHSA-w5hq-g745-h8pq) (also reported through Expo build tooling). Native production reachability still needs assessment.

No dependency versions changed in this build pass. Do not apply `npm audit fix --force` indiscriminately: the reported suggested fixes include downgrading Expo to SDK 46 and Expo Router to 5.1.11, which would break the current SDK 57 alignment. Address these with compatible upstream updates or narrowly reviewed dependency overrides, then repeat the affected checks before a production release.

## Usability follow-up

After the core device cases pass, run the [five-to-eight-person study](2026-09-19-hardening.md#guided-study-with-58-people). Prioritize check-in completion time, wrong taps, workout correction and understanding of queued versus synced. The existing targets are acceptance goals, not measured outcomes. Use observations to select the next UI changes.
