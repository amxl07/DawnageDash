# Selected workout and check-in improvements

29 September 2026 · Implementation and validation record.

Status: **implemented and verified**. The scope is the user's selected improvements, not the complete Product Excellence or Market Review roadmap.

## Scope

| Selected improvement | Acceptance |
| --- | --- |
| Suggested set values | Compatible completed history or an unambiguous target is shown as a suggestion; nothing is recorded without confirmation. |
| One-tap set completion | Values and completion are applied atomically; typed values win, bodyweight remains possible and undo is retained. |
| Numeric steppers | Weight, reps and duration have accessible increment/decrement controls plus direct entry; decimal duration parsing is correct. |
| Visible sets | The set list is available without an extra disclosure tap; editing and completion use the same rules. |
| Exercise suggestions | Available plan/history names are searchable and deduplicated; custom entry remains supported. |
| Morning / Your day | Existing daily fields are regrouped while retaining all applicable required fields and normal review/submission. |
| Answered counter | Counts applicable answered fields, including intentional zero; distinguishes answers from validity. |
| Workout compatibility | Web readers handle mobile v2 records without silently dropping duration, set kind, completion or metadata. |

No new coach, messaging, voice, readiness, nutrition, personal-record or specialized health functionality is included. Existing plan prescriptions and exercise guidance remain part of logging.

## Evidence boundary

- Work began on `codex/native-ui-modernization` at base commit `70c11b0`, with substantial pre-existing uncommitted user changes. A snapshot of 572 source/configuration files was taken to distinguish this task's changes.
- The initial web `npm run check` passed.
- Initial mobile Jest startup was stopped after prolonged dependency loading without test results; it is not a passed baseline. Focused feature tests and integrated verification are recorded below when complete.
- This Mac has no Xcode application/iOS Simulator or Android emulator/adb. Browser fixture journeys use the actual Expo web UI and fictional intercepted requests. They do not establish physical-device acceptance.
- No real client account, production database, migration, deployment, staging or commit is part of this task.

## Implementation references

- [Selected implementation plan](../../superpowers/plans/2026-09-29-selected-ux-implementation.md)
- [Original comparison and corrections](../2026-09-26-plan-comparison/README.md)
- [Selected source/test/fixture manifest](source-manifest.json) — 51 files, with hashes, compared against the pre-task snapshot. Plan/report/evidence documents and the one-line reproduction-script lint declaration are additional documentation changes.

Workout suggestions use comparable completed history, separated by warm-up/work ordinal and tracking mode. Unsupported prescription text produces no guessed value; simple repetition ranges use their lower bound and decimal minutes convert to seconds. Suggestions become recorded values only through confirmation. Typed values and intentional clears take precedence, including a visible bodyweight action. Steppers preserve decimal precision, and the completion path rejects stale or repeated events before starting rest or advancing the exercise.

The existing check-in stages remain intact. Morning contains weight, sleep and energy; Your day contains stress, hunger and digestion. Training/nutrition and review remain separate. The registry determines the applicable counter: 15 required answers normally, 16 when workout performance applies. Zero and digestion “none” count, while whitespace and missing values do not. An answered-invalid value still requires correction.

The web adapter keeps the source document separate from its display projection. Supported edits patch only changed numeric fields while retaining the original container, metadata, set kind, tracking, completion and plan day. Exact record/account/date/source guards prevent an edit from targeting a different record or overwriting changed workout content. Unsupported records remain visible and read-only. Local drafts remain scoped to their account, date and record.

## Browser evidence

All data in these captures is fictional. The mobile captures exercise the actual Expo web app. The web compatibility harness imports the actual dashboard dialog and substitutes only its authentication/database adapters; it never contacts a backend.

| Journey | Viewport | Themes | Result |
| --- | --- | --- | --- |
| Workout entry, suggestions, decimal steppers, completion, editing, exercise search/custom entry and partial review | 390 × 844 | Light, dark | 4 journey checks per theme passed |
| Same workout journey | 320 × 568 | Light, dark | 4 journey checks per theme passed |
| Check-in grouping, counter, zero, conditional denominator, invalid numeric focus, review/edit and exact submission payload | 390 × 844 | Light, dark | 11 journey checks per theme passed |
| Same check-in journey | 320 × 568 | Light, dark | 11 journey checks per theme passed |
| Actual web edit dialog: lossless edits, future formats, draft restore/correction, changed-source blocking, fast saves and account switches during save | 1280 × 900 | Light | 12 checks passed; no runtime exceptions |

- [Final workout, normal](evidence/workout-verified-normal/capture-manifest.json) · [suggested set screenshot](evidence/workout-verified-normal/workout-history-suggestion-light-390.png)
- [Final workout, compact](evidence/workout-verified-compact/capture-manifest.json)
- [Check-in, normal](evidence/normal/capture-manifest.json) — only its two check-in records are final evidence; earlier workout attempts are superseded by the final workout manifests.
- [Check-in, compact](evidence/compact-checkin/capture-manifest.json)
- [Web compatibility](evidence/web-compatibility/manifest.json) · [mobile workout rendered on the web](evidence/web-compatibility/mobile-record.png)

No runtime errors occurred in the accepted mobile captures. A pre-existing React Native SVG development warning about forwarding `accessible=false` to the DOM is recorded separately in the manifests.

## Review and testing decisions

Independent task reviews and a final review against the pre-task source snapshot are approved. Review corrections include latest-state completion acceptance, a persistent copy Undo action, clear bodyweight entry, truthful unspecified legacy completion, live record ownership checks, cancellation of delayed draft writes after a successful save, and restoring temporarily invalid numeric drafts for correction. These are protected by behavioral regressions.

The isolated web browser check is reproducible from the repository root with `node scripts/workout-record.browser.mjs` after `npm run build`. It bundles the current dialog with existing esbuild/React dependencies and fictional adapters, uses temporary Chrome storage, and writes its evidence here. No production route or authentication behavior is changed for testing.

## Verification commands

Commands run from `mobile/` unless marked “repository root”.

| Check | Result |
| --- | --- |
| `./node_modules/.bin/tsc --noEmit` | Passed on final mobile source |
| `npm run lint` | Passed: zero errors, nine pre-existing require-import warnings in health/native-surface tests |
| `node scripts/lint.mjs 'app/(app)/logger.tsx' src/components/logger/CurrentSetEditor.tsx src/components/logger/ExerciseSlide.tsx` | Passed after the final layout/copy fixes |
| `node scripts/verify-ui-contracts.mjs` | Passed: 253 source files |
| Focused check-in Jest run | Passed: 9 suites, 108 tests |
| Focused logger review-fix Jest run | Passed: 6 suites, 103 tests |
| Final bodyweight/copy-Undo component Jest run | Passed: 2 suites, 23 tests |
| `node --import tsx --test scripts/workout-record.test.ts scripts/workout-record-draft.test.ts scripts/workout-record-save.test.ts` — repository root | Passed: 30 tests after the final draft/save fixes |
| `npm run check` — repository root | Passed on final web source |
| `npm run build` — repository root | Passed on final web source; existing Browserslist/PostCSS warnings |
| `node scripts/workout-record.browser.mjs` — repository root | Passed: 12 checks against the actual dialog |
| `./node_modules/.bin/jest --runInBand --no-watchman` | 165 suites / 1,363 tests passed; one unrelated weekly-feedback test exceeded 5 seconds during heavy dependency-file I/O. [Full log](mobile-tests.log) |
| `./node_modules/.bin/jest --runInBand --no-watchman src/screens/__tests__/weekly-feedback.test.tsx` | Passed unchanged: all 32 tests, including the timeout case. Across the full run and this rerun, all 166 suites / 1,364 unique mobile tests have passed. [Rerun log](weekly-feedback-rerun.log) |
| `CI=1 EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=fixture-public-key ./node_modules/.bin/expo export --platform all --max-workers 1 --output-dir /tmp/dawnage-selected-ux-export-final` | Passed: iOS and Android Hermes bundles plus web bundles/assets. [Export log](expo-export.log) |
| `git diff --check` — repository root | Passed |

The focused counts overlap the full suite and must not be added together as a unique-test total. The full lint run required declaring the pre-existing reproduction script's Node `__dirname` global; no behavior in that script changed.

The bundle export used fictional backend configuration for validation. It establishes successful JavaScript/Hermes bundling for all three platforms. It is not an IPA/APK build, store submission or physical-device test. Native simulator/device acceptance remains unverified because those toolchains are unavailable on this Mac.
