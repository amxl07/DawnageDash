# Premium mobile implementation

Implementation branch: `codex/mobile-premium-experience`. Source baseline: `8ec16a7`; approved planning snapshot: `61fd7bd`. This record accompanies the [approved design](../../superpowers/specs/2026-09-15-premium-experience-design.md) and [release gates](../2026-09-15/production-quality-and-rollout.md).

## What changed

| Area | Implemented experience |
| --- | --- |
| Design system | Semantic light/dark colors, restrained Dawnage accent, larger editorial hierarchy, numeric typography, consistent controls, measured bottom actions, accessible state labels, reduced-motion/transparency handling, and focus-returning sheets. |
| Account and setup | Refined account screens, explicit recovery/role/setup gates, three resumable setup stages, goal selection, daily rhythm, timezone review, and acknowledged progress that Back cannot lower. |
| Home | Personal greeting and coach context, one next action, upcoming session, weekly training record, two dated observations, direct draft/queue recovery, and independent loading/error/stale sections. |
| Daily check-in | One controller shared by single-scroll and wizard presentations; all 16 original fields; intentional numeric controls and ratings; dated previous values with Undo; frozen reporting dates; review, durable drafts, queued/blocked/synced receipts, and eligible backfill history. |
| Workout | Explicit session selection, current-set editing, compact surrounding sets, session overview, useful previous values and Undo, opt-in rest timing, retained legacy content, and an honest finish summary. |
| Supporting journeys | Assessment overview and section continuity, profile merge/recovery, accurate device-local reminder states, and consistent recovery routes from Logs and Home. |
| Delivery | Durable submission intent precedes network writes. Newer edits survive older acknowledgements. Queued, blocked, draft and synced states stay distinct. |

## Behavior retained

The redesign keeps the five existing tab routes and the original backend contracts. It does not introduce a readiness score, invented personal records, coach-read receipts, a new RPE scale, or a stricter workout completion rule. Check-in draft retention remains 72 hours; workout draft retention remains 24 hours. Pending submissions do not expire with drafts. Local dates remain device-local calendar dates, held fixed while an editor is active.

Workout content remains V2/legacy-compatible; local revisions, delivery metadata and editor state do not enter the content wire format. Retries remain at least once; mobile serialization cannot establish exactly-once or cross-device conflict resolution. See [contracts](contracts.md).

Older mixed workout queues recover in their retained order. Local continuation metadata preserves the selected destination and original route when earlier items have already saved. A delivery receipt for another workout cannot move the current draft; existing explicit draft ownership and unrelated draft bytes remain protected. Exact-position updates also preserve order if cleanup is interrupted after a canonical save.

## Validation record

Application source revision: `8267ea6490e31105f788c693fb8f73ab4f09387a`. Whole-project TypeScript and ESLint pass, and UI contracts pass for 186 source files. The final focused recovery check passes 130 tests across seven suites. Independent source review has no remaining actionable findings. The final complete Jest run passes **116 suites and 837 tests**, with zero failed or pending tests. See the [portable suite record](checks/jest.json). Expo exports pass for **web, iOS and Android**, using fictional configuration to validate bundling. These exports do not constitute native builds or deployment. The [verification record](verification.json) contains commands, revisions, outcomes and artifact metadata; the [final review](review.md) records the source and integration decisions.

The [interactive gallery](preview.html) contains 28 actual Expo web captures: sign-in, three setup stages, Home, check-in and workout, each in light/dark at 390 × 844 and 320 × 568. Both capture manifests identify clean revision `a220ad8ca459bd57cad294508fdeeafb2d34a800`, with zero capture errors. The only retained warning is the documented react-native-svg DOM attribute warning. Subsequent corrections affect recovery logic and its tests, with no change to the captured visual components. All 28 frames were visually inspected; automated gutter, tab-label and standard-phone current-set/action geometry checks passed. Compact workout actions deliberately enter the scroll flow instead of covering the inputs. Fixtures are fictional and all external traffic was blocked by the capture harness.

The original Home browser capture is retained solely as a [rejected baseline diagnostic](baseline/manifest.md): its reduced-transparency API error does not establish the old app's visual quality.

## Release evidence still required

The local machine does not provide a usable iOS Simulator, Android device bridge or Maestro device runner. Physical iOS/Android checks must cover keyboard avoidance, safe areas, VoiceOver/TalkBack, largest text, gestures, haptics, background/kill recovery and performance on release-equivalent builds. The prepared [Maestro flows](../../../.maestro/README.md) describe their fixtures and prerequisites.

Recruited usability tasks and the 7–14 day diary pilot require real participants. Supported coach-web readers **and editors** must round-trip the V2/legacy fixtures. The previously recorded progress-photo public storage/permanent URL finding requires its own storage/backend remediation and authorization tests. No browser capture or mobile unit test closes those gates.

## Presentation rollback

`EXPO_PUBLIC_CHECKIN_SINGLE_SCROLL=false` selects the wizard at build/export time. Both presentations use the same check-in controller, date scope, model, draft store and delivery queue. The flag is not a remote control for an already installed build. Rehearse an installed-build or explicitly configured update-channel rollback with an acknowledged draft and pending submission, then verify their original account/date and payload. Do not clear app storage as part of that rehearsal.

## Decisions made during implementation

| Decision | Reason | Cost if revised |
| --- | --- | --- |
| Proceed with Refined Dawnage | The complete plan was approved for implementation. | Reversible visual revisions. |
| Preserve numeric, RPE and completion policy | A UI upgrade should retain accepted coaching/data contracts. | A later explicit policy and migration update. |
| Integrate through an isolated checkout | Preserve unrelated work in the requested workspace. | Integration rework if another source change overlaps. |
| Record external release gates separately | Human/device/backend evidence cannot be fabricated locally. | Release remains gated until those results exist. |
| Normalize accepted numbers visibly and retain invalid text | Preserve established bounds without silently turning invalid input into an answer. | An agreed validation-policy update. |
| Commit ruler readout on release | A UI-thread native text adapter needs device verification before activation. | Further live-preview refinement. |
| Repair concrete integration blockers after the final review | Multi-record recovery and retry after partial local cleanup must work before this implementation can be handed over. The completion requirement takes precedence over the workflow's single-fix-wave limit. | Additional implementation and focused verification time. |

This document is an implementation and evidence record, not an App Store release approval.

## Original workspace handoff

The verified mobile-only change is applied in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`. Original branch history and the preexisting files were preserved. The implementation branch and isolated checkout remain available as a rollback reference. Temporary renderer/runtime links were replaced with normal installed dependencies from the committed lockfile; the lockfile stayed unchanged. The original workspace passes the Button, SetEditor and workout recovery integration smoke tests (3 suites, 24 tests). Expo's offline dependency check reports dependencies up to date, with its documented offline-validation limitation. See the [workspace handoff record](workspace.json).
