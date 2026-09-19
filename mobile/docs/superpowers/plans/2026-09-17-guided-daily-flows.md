# Guided Daily Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make daily check-ins and workout logging guided, quick and less overwhelming.

**Architecture:** Retain the existing check-in editor and workout session persistence. Change presentation and navigation around those controllers; reuse NumericEntry's staged commit protocol instead of draggable rulers. Keep independent ownership of numeric input, check-in UI and workout UI.

**Tech Stack:** Installed Expo SDK 57, React Native, React, TypeScript, Expo Router, Reanimated, Jest/RNTL, existing Supabase/AsyncStorage.

**Spec:** `docs/superpowers/specs/2026-09-17-guided-daily-flows-design.md`

## Global Constraints

- Expo SDK 57 and the installed dependency versions remain unchanged; add no dependency.
- Use existing theme tokens, typography, buttons, sheets and motion preference. Both dark and light themes remain supported.
- Touch targets are at least 44 points; optional/expanded state and selected values are announced accessibly. Layout wraps for small screens and large text. The keyboard must not hide the current action or input.
- Do not change database payload keys, required fields, numeric bounds, saved record formats, account/date isolation or draft/outbox semantics.
- All existing optional values survive collapsed UI and review/edit navigation. Never silently copy subjective daily answers.
- Implement in the user's current mobile checkout, preserving existing uncommitted redesign/SDK work. A separate source snapshot supplies the review baseline. Do not reset, stash, commit unrelated work, merge, push or publish.

## Task 1: Reliable quick numeric entry

**Files:** `src/features/checkin/components/NumericEntry.tsx` and its existing test; new input-only helper/test beside it if necessary.

**Interfaces:** Preserve all current props and add:

```ts
quickValues?: readonly number[];
```

Quick choices render below the input using explicit units, 44-point targets and wrapping. A press writes the chosen number to the visible draft, its draft/value refs and the controlled value, clears changed/error/adjustment state, and settles the existing commit registration. A later blur/background commit must not restore stale typed content. A blank field stays null until the user types or selects a choice.

- [x] Add a behavioral test that types a partial value, selects a quick value, then blurs/commits and verifies the selected number remains authoritative.
- [x] Add tests for explicit zero, bounded decimal values, accessible selected state, and preserving the no-presets behavior.
- [x] Run the focused NumericEntry tests and record the expected failing assertions.
- [x] Implement quick choices inside the existing component without replacing the NumericCommitProvider or changing ordinary parsing semantics.
- [x] Run the focused tests and self-review pending-edit/background behavior. Report exact changed files and results; do not commit the shared dirty checkout.

Example contract:

```tsx
<NumericEntry label="Sleep" value={form.sleepHours} onChange={onSleep}
  unit="h" min={0} max={24} precision={1} quickValues={[6, 7, 8, 9]} />
```

## Task 2: Three short check-in sections and review

**Files:** `app/(app)/(tabs)/check-in.tsx`, `src/components/checkin/CheckInForm.tsx`, `CheckInStageHeader.tsx`, `checkin-presentation.ts`, `CheckInFieldBlock.tsx`/`CheckInRatingScale.tsx` only when necessary for visual density, `src/features/checkin/components/DailyRecordHeader.tsx`, and their affected screen/component/integration tests. A focused `OptionalCheckInFields.tsx` component may own commit-safe disclosures. Do not edit NumericEntry; Task 1 owns it.

**Interfaces:** Existing `CheckInForm` props remain; an optional `onEditSection?: (step: CheckInStep) => void` supports inline review editing. Task 1 provides `quickValues`. Existing editor `step`, `setStep`, `getSnapshot`, `updateForm`, `submit` and NumericCommitProvider stay the persistence boundary.

- [x] Add a route test that only the active section mounts, Continue validates that section without calling `editor.submit`, Back preserves entries, and only final submission calls submit.
- [x] Add component/integration tests for optional disclosure visibility, pending numeric commits before collapse, hidden invalid-field reveal, sleep presets, all exact rating values and review editing.
- [x] Record the pre-change verification limitation: filesystem stalls prevented observing RED before implementation. The completed flow is covered by the final full suite; no pre-change RED is claimed.
- [x] Route the application exclusively through the existing four persisted steps; remove the single-scroll branch from this route. Keep the feature flag module only if another consumer still needs it.
- [x] Implement current-step error state locally rather than calling submit to display step errors. Keep full validation on final submit and preserve all date/exit/retry guards.

```ts
const errors = validateCheckInStep(STEPS[editor.step], editor.getSnapshot());
setStepErrors(errors);
const first = CHECK_IN_FIELDS.find(({ id }) => errors[id]);
if (first) { revealField(first.id); return; }
editor.setStep(Math.min(3, editor.step + 1));
```

- [x] Simplify headers, mount one section, replace weight/sleep/water rulers with NumericEntry, hide optional measurements behind explicit disclosures, and provide review edit access. On close/back/continue, honor failed numeric commits. On reveal, open the disclosure and focus after the target mounts.
- [x] Keep required ratings on their exact 1–10 scale; reduce nested cards and redundant default hints rather than discarding required coach data.
- [x] Run focused check-in tests, including existing date scope, in-flight submission, offline queue and recovery cases. Update layout-specific expectations only where the intentional flow changes them; retain their behavioral assertions.
- [x] Self-review restored drafts at every step, optional values in historical records, compact height/large type and keyboard access. Report results without committing.

## Task 3: A clear next action while logging workouts

**Files:** `app/(app)/logger.tsx`, `src/components/logger/ExerciseSlide.tsx`, `CurrentSetEditor.tsx` only as needed, `WorkoutOverviewSheet.tsx`, `RestDock.tsx`, a small `workout-guidance.ts` helper if needed, and the affected logger/component tests. Do not edit check-in files or shared UI primitives.

**Interfaces:** Extend ExerciseSlide with optional `onContinue?: () => void` and `continueLabel?: string`; WorkoutOverviewSheet may accept `onFinish`, plus an add-exercise form slot or explicit name/change/add props. Existing workout edit actions and stable set IDs remain authoritative.

- [x] Add behavior tests showing that completing the final set reveals completion guidance instead of returning to a completed set editor, and that completed sets remain editable through a Sets disclosure.
- [x] Add route tests for next unfinished exercise, final review, partial-workout review via overview, and Add exercise only in the management surface. Preserve the draft exit test for an unfinished exercise name.
- [x] Implement the completion state and a collapsed list of other sets, preserving stable set identity. Pre-change RED was not observed because of filesystem stalls; final behavioral verification is recorded separately.
- [x] Choose the next unfinished exercise in session order, searching after the current exercise then earlier entries. If none exists, open existing workout review. Do not auto-complete sets or auto-save.

```ts
const unfinished = (exercise: WorkoutExercise) =>
  exercise.sets.length === 0 || exercise.sets.some((set) => !set.completed);
```

- [x] Move Add exercise into Overview while preserving its route-owned text and exit guard. Place explicit Review/Finish access in Overview and the completion path.
- [x] Replace the permanent competing Finish footer with a compact rest dock. Keep measured footer clearance, safe-area/keyboard behavior and all timer preferences. Advanced rest settings remain available on demand.
- [x] Run focused logger, ExerciseSlide, current-set, timer and recovery tests. Self-review empty plans, duration/bodyweight sets, removed sets, historical sessions and save failures. Report without committing.

## Task 4: Integrate, review and verify

**Files:** affected `.maestro` flows, `scripts/capture-redesign.mjs`, `docs/ui-validation-matrix.md`, and a new verification/evidence folder. Only adapt fixtures/selectors where intentional UI changes require it; never weaken error capture or geometry assertions.

- [x] Review each implementation against the spec and its source-snapshot diff. Fix integration issues and retain test evidence for numeric/date/account boundaries.
- [x] Run TypeScript and standard lint, then the complete Jest suite and UI-contract verifier with bounded memory and one worker. Run heavy commands sequentially on this Mac.
- [x] Export iOS, Android and web. Use fictional environment values for local evidence; do not modify `.env`.
- [x] Exercise the guided check-in, optional disclosures, review/edit, set completion/next-exercise and add-exercise management in the browser. Capture dark/light phone layouts and a compact viewport.
- [x] Perform a fresh independent code review; resolve actionable findings and rerun affected checks. Record exact verified behavior and native-device limitations.
- [x] Update the plan checkboxes and a concise handover. Stop temporary fixture servers and preserve all unrelated source work.
