# Release hardening and validation — 19 September 2026

This pass implements the accepted [current-state review](../review/2026-09-18/README.md). Keep the current refined athletic interface and validate the core journeys before adding more visual effects. Source/test evidence is recorded in the implementation report; these instructions do not imply that a cloud build, live migration or physical-device test has run.

## What changed

- Check-in and workout delivery recognizes the installed SDK's offline errors while preserving blocked permission/validation failures. Check-in and photo saves require an acknowledged owned row, so an empty update cannot appear saved. See the [delivery report](../review/2026-09-18/implementation-delivery.md).
- Plans keeps Training and Nutrition reachable during independent failures and labels templates as previews. Measurements uses one newest-first query; refreshes and older saves cannot erase newer form edits, and closing/reopening cannot overlap a pending write. Weekly feedback preserves its reporting week with the draft, averages observed values only, labels saved answers and has a Home resume action. See the [product report](../review/2026-09-18/implementation-product.md).
- Mobile and web store photo object paths and resolve temporary signed display URLs. The private-bucket migration, strict reference preflight, trusted coach grants and rollout instructions are prepared. **The live bucket has not been changed.** See the [photo report](../review/2026-09-18/implementation-photos.md).
- Removed 18 retired production modules (2,171 lines), six unused direct dependencies and obsolete assets/tests while retaining active recovery and logger behavior. The Inter/Poppins text-font asset set fell from 36 files / 9,249,512 bytes to three Inter weights / 1,028,932 bytes: **8,220,580 raw bytes saved**. Required Android Material Symbols remain. This is not a measured download, startup-time or native-binary reduction.
- Added optional sanitized diagnostics, a themed screen recovery boundary, separate build identities, development-client support and CI. The lint runner handles shared code without scanning unrelated parent directories or weakening import/case checks. See the [integration report](../review/2026-09-18/implementation-integration.md).

The [verification report](evidence/2026-09-19/README.md) and [cleanup measurements](evidence/2026-09-19/cleanup.json) record exact outcomes and scope. The full 125-suite / 945-test run passed; final affected regressions also passed. Final-source TypeScript, lint, UI contracts, Expo alignment and iOS/Android/web exports passed, as did the web build and local photo/SQL checks. Focused reruns overlap the full suite; their counts must not be added together. Chrome failed to expose its debugger, so fresh visual and native-device verification remain unclaimed.

## Review decisions and tradeoffs

- Kept the established feature checkout because it contains the approved app state; reviewing against a captured source snapshot requires more care than comparing HEAD.
- Left mixed pre-existing work uncommitted. The source and review artifacts are preserved, but a deliberate review/commit step remains.
- Required trusted operator approval for coach photo access rather than deriving approval from editable profile fields. Existing/new/reassigned coaches need explicit provisioning; admin viewing does not automatically grant photo bytes.
- Completed the additional measurement reopening regression within the final review. This added verification time to eliminate a known overlapping-write case before handoff.

## Build environments

| Profile | Identity / link scheme | Purpose |
| --- | --- | --- |
| development | `com.dawnage.app.dev` / `dawnage-dev` | Installed development client, Metro via `npm run start:dev` |
| preview | `com.dawnage.app.preview` / `dawnage-preview` | Internal distribution to physical iOS/Android devices |
| preview-simulator | Preview identity | iOS Simulator build on a supported host |
| production | `com.dawnage.app` / `dawnage` | Store candidate; preserves existing production identity |

`npm start` explicitly uses Expo Go. Installing development-client support does not change that command. Different native identities isolate storage and drafts, so test data does not replace a production installation. A preview installation cannot read a production draft.

Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the matching EAS environment. **Current decision: keep the existing Supabase project; photo staging and the private-bucket migration are deferred at the user's request.** Preview builds reuse the existing public mobile configuration and dedicated test accounts. Preview and production cloud configuration reject missing credentials, localhost and `.invalid` endpoints. Never place a service-role key in any `EXPO_PUBLIC_*` value. Recovery-link testing requires the matching redirect scheme to have already been registered; no Supabase Auth settings were changed in this pass. See the [preview/device follow-up](2026-09-19-device-preview.md).

From `mobile/`, with EAS login/project and Apple/Google credentials already configured:

```sh
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile preview-simulator --platform ios
```

Building and distributing a store candidate remains a release action. No store submission is part of this local implementation.

## Diagnostics and screen recovery

`EXPO_PUBLIC_SENTRY_DSN` enables diagnostics in preview/release JavaScript builds. Local development and missing-DSN builds are no-ops. Optional `SENTRY_ORG`, `SENTRY_PROJECT` and secret `SENTRY_AUTH_TOKEN` configure build-time source-map upload; the token belongs only in the build secret store.

The explicit reporting scope is caught screen-render errors and check-in/workout delivery/storage events. Native crash collection, automatic integrations, session tracking, breadcrumbs, request tracing and replay are disabled. This keeps Expo Go supported and avoids capturing health data from broad SDK instrumentation. An app recovery screen retries rendering without clearing persisted drafts, auth or the query cache.

Events carry only area, outcome, reason category, elapsed delivery time and queue age. Screen errors retain generic text and sanitized source basenames/line numbers. Raw answers, titles/content, account or record IDs, tokens, backend messages, URL queries, photos and stack locals are excluded. Timing and category fields are bounded and allowlisted; a reporting failure cannot alter a save result. `acknowledged` describes the server response, not local queue cleanup. Storage failures are separate events. No user-level behavioral tracking is added.

Before enabling the DSN in production, trigger a controlled preview error and an offline save using fictional data, inspect the received event, and verify the allowed fields above. No remote event has been sent by the implementation checks.

## Quality gates

The mobile CI workflow runs reproducible install, TypeScript, lint, Jest, UI contracts, Expo dependency alignment and iOS/Android/web export. A separate photo-contract job validates canonical references, grant tooling and SQL policies locally with PGlite, then builds the web client. It never applies a live migration.

Local commands:

```sh
cd mobile
npm ci
npm run verify
npx expo install --check
npm run export
```

Follow the [coordinated photo rollout](../review/2026-09-18/photo-privacy-rollout.md) for preflight, migration, trusted grants and compatibility requirements. Complete staging owner/other-account/anonymous/approved-coach denial checks before applying the migration. Current `users.role` and `users.coach_id` values alone cannot approve photo access; trusted grants require the operator workflow. Historical public URLs may already have been shared, and previously downloaded copies cannot be revoked by changing storage policies.

## Native acceptance record

Run on a small iPhone, a current iPhone and a mid-range Android device. Include light/dark appearance, largest practical text, VoiceOver/TalkBack and Reduce Motion. Record build ID, OS, device, backend environment and result for every case. An export or Jest pass does not satisfy this gate.

| Journey | Required result | Evidence |
| --- | --- | --- |
| Onboarding / reset link | Back/forward preserve entered values; correct environment opens; keyboard never hides the action | Pending device run |
| Home | One clear next action; weekly draft resumes; failed data is distinguishable from no data | Pending device run |
| Daily check-in | Ratings and scroll work with one finger and assistive technology; process restart restores the right date/account | Pending device run |
| Offline delivery | Airplane-mode save remains queued; restart retains it; reconnect sends the exact values once logically, with no false synced receipt | Pending device run |
| Rejected / zero-row save | Permission, validation and missing-row failures remain recoverable; never silently discard intent | Pending device run |
| Workout | Log sets, background/restart, resume timer, finish and edit an explicit existing log; multiple same-day logs keep distinct identities | Pending device run |
| Plans | Each query can fail independently; Training/Nutrition stays reachable; template preview cannot imply an assigned workout | Pending device run |
| Measurements / weekly | Latest baseline remains stable; background refresh does not overwrite an open edit; sparse weekly data shows the reporting dates/sample count | Pending device run |
| Photos | Camera/library permission, owner/coach/other-account checks, expiry refresh and account switching; no old-account image after logout | Pending staging/device run |
| Recovery / motion | Caught error has a usable retry; focus order and touch targets work; reduced motion is honored | Pending device run |

Maestro flows use `DAWNAGE_E2E_APP_ID` for the installed build and injected test credentials. Follow [.maestro/README.md](../../.maestro/README.md), including offline manual flows. Never clear app data to make interruption tests pass.

## Guided study with 5–8 people

Recruit a mix of new fitness-app users and regular trackers. Use fictional accounts/data. Ask participants to think aloud; avoid explaining the controls unless they cannot proceed. Record consented observations with anonymous participant codes, not health details.

1. Complete onboarding and identify the next action on Home.
2. Submit today's check-in, change one answer, then resume a partially completed check-in after closing the app.
3. Find the assigned workout, log three sets, correct a value, interrupt/resume and finish.
4. Find the latest measurement and explain the weekly summary in their own words.
5. Find a saved weekly draft and explain queued versus synced status under controlled offline conditions.

Record unassisted completion, elapsed time, wrong taps/backtracking, assistance requests and a 1–7 ease score after each task. Ask which step felt unnecessary and where they expected to tap next.

Release targets: at least 90% unassisted completion across core tasks; no lost or misattributed record; every participant distinguishes queued from synced; median routine check-in under 45 seconds and 90th percentile under 90 seconds; median three-set logging under 60 seconds after finding the exercise; median ease at least 6/7. These are acceptance targets, not measured claims. Fix failures in wording, sequencing or controls before adding additional motion or dashboard content.
