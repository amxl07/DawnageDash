# Daily Check-In Single-Scroll Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reversible single-scroll daily check-in with the complete 16-field contract, neutral personal-history captions, tactile rulers for weight/sleep/water, visible carry-forward actions, and durable offline submission.

**Architecture:** Keep the existing section renderer and wizard, compose those sections into a new panel behind a build-time flag, and isolate history, field metadata, ruler math, and persistence into focused tested modules. Reuse React Query history and AsyncStorage rather than adding SQLite.

**Tech Stack:** Expo SDK 54, Expo Router, React Native 0.81, React 19, Reanimated 4, Gesture Handler 2, Expo Haptics, React Query 5, Supabase, AsyncStorage, Jest.

**Spec:** `docs/superpowers/specs/2026-08-31-checkin-single-scroll-design.md`

## Global Constraints

- Preserve all 16 existing payload fields and exact database enum values.
- Preserve current validation and conditional workout-performance behavior.
- Run in Expo Go; add no native-only dependencies.
- Gesture motion stays on the UI thread and becomes instant under Reduce Motion.
- Controls retain 44pt targets, screen-reader roles/values/actions, Dynamic Type, and colour-independent state.
- Copy reports facts and never praises, judges, or pressures.
- Keep the current wizard as the feature-flag fallback.

---

### Task 1: Field registry and feature flag

**Files:**
- Create: `mobile/src/features/checkin/config/fields.ts`
- Create: `mobile/src/features/checkin/config/featureFlags.ts`
- Test: `mobile/src/features/checkin/config/fields.test.ts`

**Interfaces:**
- Produces: `CHECK_IN_FIELDS`, `NumericHistoryFieldId`, `isSingleScrollCheckInEnabled(value?)`.
- Consumes: production `FormState`, `WorkoutStatus`, and `Digestion` names.

- [ ] Write a test asserting the literal 16 field IDs, exact enum values, and flag true/false behavior.
- [ ] Run the test and confirm it fails because the modules do not exist.
- [ ] Add the minimal typed registry and flag parser.
- [ ] Run the focused test and confirm it passes.

### Task 2: Neutral history model

**Files:**
- Create: `mobile/src/features/checkin/history.ts`
- Create: `mobile/src/features/checkin/history.test.ts`
- Create: `mobile/src/features/checkin/components/HistoryCaption.tsx`
- Test: `mobile/src/features/checkin/components/HistoryCaption.test.tsx`

**Interfaces:**
- Produces: `buildHistoryStats(checkIns, targetDate)`, `HistoryStat`, and `HistoryCaption`.
- Consumes: production `DailyCheckIn` rows and numeric registry metadata.

- [ ] Write failing tests for target-date exclusion, 14-value windows, null/zero preservation, and neutral captions.
- [ ] Implement the pure history reducer and formatting.
- [ ] Write and run a failing component test for hidden-before-answer and visible-after-answer states.
- [ ] Implement the accessible caption with a reduced-motion-aware reveal.
- [ ] Run both focused suites.

### Task 3: Tactile ruler prototype

**Files:**
- Create: `mobile/src/features/checkin/components/TickRuler.tsx`
- Create: `mobile/src/features/checkin/components/TickRuler.test.tsx`
- Modify: `mobile/src/components/checkin/CheckInForm.tsx`

**Interfaces:**
- Produces: `valueAfterRulerDrag` and `TickRuler`.
- Consumes: existing motion/theme tokens and form setters.

- [ ] Write failing pure tests for rounding, clamping, direction, and null behavior.
- [ ] Implement the math and accessible ruler shell.
- [ ] Add UI-thread tick translation, release-only commit, reduced-motion snap, and one commit haptic.
- [ ] Replace only weight, sleep, and water steppers.
- [ ] Run ruler and existing check-in form tests.

### Task 4: Direct numeric entry, history captions, and carry-forward

**Files:**
- Create: `mobile/src/features/checkin/components/NumericEntry.tsx`
- Create: `mobile/src/features/checkin/components/PreviousValueButton.tsx`
- Test: `mobile/src/features/checkin/components/NumericEntry.test.tsx`
- Test: `mobile/src/features/checkin/components/PreviousValueButton.test.tsx`
- Modify: `mobile/src/components/checkin/CheckInForm.tsx`

**Interfaces:**
- Produces: controlled numeric keypad fields and explicit previous-value actions.
- Consumes: `HistoryStat` values and existing form state.

- [ ] Write failing tests for blank/null, zero, clamp, decimal precision, and visible previous-value labels.
- [ ] Implement numeric entry and previous-value button.
- [ ] Replace calories and steps steppers; retain macros as numeric inputs.
- [ ] Add history captions to answered numeric and rating fields.
- [ ] Add carry-forward buttons only to approved objective fields.
- [ ] Run component and check-in form tests.

### Task 5: Single-scroll panel and fallback

**Files:**
- Create: `mobile/src/features/checkin/components/CheckInPanel.tsx`
- Test: `mobile/src/features/checkin/components/CheckInPanel.test.tsx`
- Modify: `mobile/src/components/checkin/CheckInForm.tsx`
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`
- Modify: `mobile/src/screens/__tests__/tabs/check-in.test.tsx`

**Interfaces:**
- Produces: one scroll containing the existing three sections plus notes.
- Consumes: feature flag, existing form state, history map, validation, and sticky action bar.

- [ ] Write failing tests that panel mode renders all sections and one submit action while fallback mode renders the wizard.
- [ ] Add a notes-only option to the finish section to avoid duplicating the full summary in panel mode.
- [ ] Compose all sections in `CheckInPanel`.
- [ ] Branch screen rendering and submit behavior on the feature flag; preserve wizard navigation unchanged.
- [ ] Run screen, form, and panel suites.

### Task 6: Generic durable outbox and check-in sync

**Files:**
- Create: `mobile/src/lib/asyncOutbox.ts`
- Test: `mobile/src/lib/asyncOutbox.test.ts`
- Modify: `mobile/src/lib/outbox.ts`
- Create: `mobile/src/features/checkin/checkInOutbox.ts`
- Test: `mobile/src/features/checkin/checkInOutbox.test.ts`
- Modify: `mobile/src/hooks/useCheckInMutation.ts`
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`

**Interfaces:**
- Produces: serialized keyed queue storage, `persistCheckIn`, `saveCheckIn`, and `flushCheckInOutbox`.
- Consumes: AsyncStorage, NetInfo, Supabase, and React Query invalidation.

- [ ] Write failing generic queue tests for replace-by-ID, per-user reads, durable removal, and concurrent mutation serialization.
- [ ] Implement the generic queue and refactor the workout outbox without changing its public API.
- [ ] Write failing check-in tests for online persistence, offline queueing, same-date replacement, and reconnect flush.
- [ ] Extract `persistCheckIn` and implement offline-aware save/flush.
- [ ] Integrate the mutation result and reconnect listener into the screen with factual sync copy.
- [ ] Run both outbox suites and screen tests.

### Task 7: Full verification and device handoff

**Files:**
- Modify only files required by failures caused by this feature.

- [ ] Run `npm run typecheck` in `mobile`.
- [ ] Run `npm run lint` and confirm no new warnings.
- [ ] Run `npm test -- --runInBand` and confirm every suite passes.
- [ ] Run `npm run verify:ui`.
- [ ] Run `CI=1 npx expo export --platform ios` to a temporary directory.
- [ ] Run `git diff --check` and inspect the final diff for unrelated files.
- [ ] Record that ruler velocity, haptic timing, and ≥55fps still require the slowest supported physical Android device.

