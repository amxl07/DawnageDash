# Selected workout and daily check-in UX implementation

**Goal:** Implement the user-selected logging interactions, required check-in grouping/count, and lossless web/mobile workout compatibility, with the September 26 review corrections.

**Architecture:** Extend existing logger/reducer and check-in registry/components. Preserve existing storage and data contracts. Give the web a safe workout read/edit adapter. No new service, dependency, database migration or general redesign.

**Tech stack:** Existing Expo/React Native/TypeScript/Jest; React/Vite web and existing Node/tsx tooling.

**Spec:** The September 29 user request and [comparison corrections](../../review/2026-09-26-plan-comparison/README.md). These selected tasks supersede the larger combined roadmap for this turn.

## Global Constraints

- Implement only suggested set values, one-tap confirmation/completion, steppers, visible sets, exercise-name suggestions, Morning/Your day grouping, an accurate answered counter, and safe workout compatibility.
- No new coach, messaging, voice, dictation, readiness, nutrition, PR or specialized health features. Recent research informs selected interaction design; it is not a separate feature backlog.
- Preserve existing pending user changes. Work on the current feature branch with a pre-task snapshot. No commits, staging, resets, production access, migration or deployment in this task.
- User explicitly authorizes continuous implementation/testing without intermediate approval. This supersedes historical phase-stop instructions. The selected compatibility fix permits the necessary client-side web edits, but not unrelated dashboard or coach features.
- Preserve completion lock, undo completion, remove/restore, plate calculator, exercise guide, timer behavior, unit conventions, local dates, accessibility, themes and existing draft/outbox behavior.
- Suggestions are never silently written. Confirmed values and completion must be one reducer action; typed values take precedence. Match history by tracking mode and warm-up/work kind, not raw array position alone.
- Keep all applicable daily fields required, do not auto-submit or carry forward subjective values. Answered does not mean valid; conditional workout performance changes the denominator correctly.
- Keep web React 18 and mobile React 19 dependency isolation. Prefer existing dependencies and tokens.

## Task 1: Fast, corrected workout interactions

Initial files: `mobile/src/components/logger/CurrentSetEditor.tsx`, `ExerciseSlide.tsx`, `CompactSetRow.tsx`, `mobile/app/(app)/logger.tsx`, `mobile/src/features/workout/workoutReducer.ts`, existing previous-workout/history hook, and affected tests. Add focused pure helper files under `mobile/src/features/workout/` as needed.

- [x] Inspect current existing implementations and use their data/state ownership.
- [x] Derive placeholder suggestions from the most recent compatible completed set, falling back to a parseable prescription. Do not invent a prescribed weight. Match warm-up/work ordinal and tracking; preserve explicit input, bodyweight and empty-history behavior. Do not copy RPE.
- [x] Parse decimal duration correctly (`1.5 min` → 90 seconds), ignore ambiguous unsupported prescriptions rather than guessing. Repetition ranges can use a documented conservative lower bound.
- [x] Confirm applicable suggestions and complete a set with one atomic reducer action. No stale-render overwrite, accidental double completion or history inferred as performed work. Validate required reps/duration before completion; weight may remain blank for bodyweight.
- [x] Add weight/repetition/duration steppers with visible units, accessible action names, minimum 44–48 point targets, clamping, decimal precision and direct entry. A step against an empty field may start from its displayed suggestion; it becomes explicit input.
- [x] Show the set list without an extra disclosure tap, with selected/completed state and edit/add access. Keep remove/restore and completion undo usable. Avoid letting a compact-row action bypass the same completion semantics.
- [x] Add bounded, case-insensitive exercise suggestions from the available plan and recent logged names to the existing add-exercise UI; deduplicate, preserve custom entry and empty states. Do not require a new database/search service.
- [x] Use behavioral tests with real reducer/components for suggested completion, typed-values precedence, matching history, duration parsing, steppers, list visibility, search/custom entry and existing undo/rest flows.
- [x] Run focused tests and mobile typecheck, then self-review the task diff. Report actual commands/results and concerns.

Acceptance: a user can repeat a comparable set with one confirmation, change numbers quickly, see/edit the sets, and add a known or custom exercise. `62.5 kg × 8` cannot become `60 kg × 10` through suggestion logic. No voice or coaching feature is added.

## Task 2: Required daily check-in grouping and answered count

Initial files: `mobile/src/features/checkin/config/fields.ts`, section configuration/model, `mobile/src/components/checkin/CheckInForm.tsx`, `mobile/src/features/checkin/CheckInEditorScreen.tsx`, review/error navigation and relevant tests/fixtures.

- [x] Put morning weight, sleep and energy in Morning (`readiness`). Put stress, hunger and digestion in Your day (`recovery`). Retain the existing training/nutrition (`adherence`) and review/notes (`finish`) stages, matching Market Review Task 4.1's concrete interface and preserving the current submission flow.
- [x] Keep the shared registry/config, rendered field order, validation/error navigation and review aligned. Preserve every existing payload field, rule and enum; do not introduce a general form-renderer rewrite.
- [x] Show `X of Y answered` for the currently applicable required fields. Count intentional zero and enum `none` correctly; don't count whitespace. Completed count is separate from validation. Workout performance is applicable only for done/cardio.
- [x] Retain visible required/error treatment and submission/review behavior; focus/scroll to the first missing or invalid field within its new group. Preserve drafts, backdated edits, health-import UI already present, keyboard commit and safe area.
- [x] Use focused model and rendered interaction tests for initial/partial/full/invalid counts, conditional denominator changes, zero, required validation, grouping, error navigation and saved-record editing.
- [x] Run affected check-in tests, mobile typecheck and UI contract checks. Update only expectations/fixtures genuinely affected by the requested layout.

Acceptance: all original required data can still be entered and submitted; grouping and count make progress understandable without implying that answered-invalid input is ready to submit. No sleep-import expansion or shorter protocol is added.

## Task 3: Safe web/mobile workout interoperability

Initial files: `client/src/components/WorkoutLogDialog.tsx`, `client/src/hooks/usePreviousWorkoutData.ts`, `client/src/pages/WorkoutLogs.tsx`; add a focused adapter and executable regression tests using existing tooling. Mobile's current v2 writer is the format reference.

- [x] Read supported mobile v2, current legacy arrays, legacy objects/strings safely in web display/history.
- [x] Preserve original format/metadata when editing an understood record. Preserve tracking, duration, warm-up/work kind, explicit completion and plan-day context. Avoid lossy display normalization as a save serializer.
- [x] Carry safe format context through draft save/restore, and clear it on account/date/record changes. A legacy draft must not overwrite a mobile v2 record without a verified original context. Reject unsafe structural edits rather than attach unrelated metadata by array position.
- [x] Unsupported future versions/structural variants are displayed safely and read-only; never silently replace them with an empty legacy array.
- [x] Support truthful duration/warm-up/incomplete display and editing where existing controls can do so safely. Provide read-only treatment where controls cannot preserve semantics. Saved mobile data must remain unchanged on an unrelated edit.
- [x] Add regression fixtures for a completed 60-second plank, unfinished warm-up with reps, an unrelated weight edit, fractional values, malformed input, metadata and unknown versions, plus legacy history.
- [x] Run executable compatibility tests, web TypeScript check and production web build. If baseline problems exist, distinguish them from this change and resolve task-related failures.

Acceptance: mobile v2 logs are visible in the web dashboard; a supported edit preserves unrelated workout facts and metadata. Existing legacy use keeps working. No coach/inbox functionality changes.

## Task 4: Integrated review and verification

- [x] Independently review each task's diff and the final integrated change against the selected scope.
- [x] Run full mobile typecheck, lint, tests and UI contract verification after integration, plus web compatibility regression/build checks.
- [x] Exercise changed journeys through available preview/simulator tooling with fictional fixtures; inspect compact/normal width and both themes. Record device/build limitations accurately.
- [x] Fix failures found in changed behavior and rerun the affected checks. Preserve pre-existing unrelated work.
- [x] Produce a final validation report with exact commands, counts, changed files and any remaining verification limits. Do not claim native device acceptance from web screenshots.
