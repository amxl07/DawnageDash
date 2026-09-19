# Cleanup, diagnostics and release integration

The pre-task source baseline is `/tmp/dawnage-hardening-20260919/baseline.tar.gz` (550 files), with a hash manifest alongside it. The working checkout already contained extensive approved changes, so HEAD is not this task's baseline. No reset, stash, branch switch or commit was made.

## Implementation

- Removed 18 retired production modules: obsolete dashboard, check-in ruler/panel and feature flag, old set editor/rest timer/circular timer, Celebration, Stepper/Stagger and unused Bar/Donut chart wrappers. Removed dedicated obsolete tests and verified starter images. Kept active swipe logic, current guided CheckInForm, CurrentSetEditor, RestDock/timer provider and MetricCard. Two active ExerciseSlide tests from the old SetEditor test file were preserved in ExerciseSlide.contract.test.tsx. Removed the unused SameAsYesterdayChip subcomponent.
- Removed unused Poppins, react-hook-form/resolvers, expo-blur, gifted-charts and direct zod dependencies. Inter imports load only the three used weight modules. Removed unused font tokens, stale reset script and scaffold package name. Npm regenerated the lockfile, then installed successfully: 22 packages added and 7 removed. This includes SDK-recommended development-client and Sentry packages; transitive dependency totals are not a claim of total bundle reduction.
- Development/preview/production identities and reset schemes are isolated in app.config.ts. Preview supports physical iOS devices; preview-simulator is explicit. Production EAS builds require configured backend values. npm start retains Expo Go; npm run start:dev targets the development client. Maestro uses an injected app identity.
- Added an optional explicit diagnostics sink and event scrubber. No broad auto-instrumentation, native crash capture, tracing, replay, breadcrumbs or session tracking. Missing DSN/development is disabled. Allowed data is event/area/outcome/reason plus bounded durations/queue age. Screen exceptions are reduced to generic text and sanitized source locations; user/request/URL/error text/stack locals are removed. Native SDK integration is disabled so Expo Go remains supported.
- Added a themed recovery boundary around the application navigator. It remounts failed screens without clearing durable drafts or auth/query providers; recovery uses a scrollable native container and an accessible retry button.
- Generic outbox diagnostics observe acknowledged/queued/blocked network attempts and storage failures. They do not change outbox state transitions. A network acknowledgment is distinguished from successful local cleanup. Diagnostics failures cannot throw through a user action.
- Metro watches the shared pure contract directory. CI verifies mobile source, Expo dependency alignment and three-platform export; a separate job runs photo Node/PGlite tests and the web build. Release documentation contains environment setup, diagnostics verification, native acceptance matrix and a 5–8-person task study.

## Evidence so far

Standalone scripts executed actual TypeScript modules through the installed compiler:

- Outbox diagnostics: initial RED had no queued event; GREEN covered retained offline work, reconnect acknowledgment, storage failure and no identity/payload leakage.
- Telemetry event scrubber: initial RED leaked injected private fields; GREEN removed user/request/context/breadcrumb/URL/answer/stack-local data and retained generic categories/source positions.
- Diagnostic allowlist: six assertions passed for sanitization, invalid values, bounded timing and throwing-sink isolation.

Root integrated Jest, TypeScript and lint are now running against installed dependencies. Their final results, Expo checks/export and any review fixes will be recorded in the release evidence. The new recovery component and build configuration have dedicated regression tests but are not called passing until the integrated run completes.

## Limits and release prerequisites

No live migration, cloud build, Sentry event, native device session or human usability test was executed. Photo cutover must follow the coordinated rollout. The checked-in release matrix deliberately marks those rows pending. Error reporting here covers caught render errors and explicit delivery/storage failures; it does not claim native crash diagnosis or user-level completion-rate telemetry.


## Final integration handoff

The final source passed TypeScript, lint and iOS/Android/web export. The full mobile suite passed before the final persistence corrections; the affected regressions and reopening amendment then passed. The [release verification report](../../release/evidence/2026-09-19/README.md) supersedes earlier pending integration statements here and records precise scope, overlapping counts and external gates. No live migration or native-device validation is implied.
