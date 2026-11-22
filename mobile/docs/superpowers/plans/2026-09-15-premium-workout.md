# Dawnage Workout Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when delegation is authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make prescribed training fast to log one-handed, easy to resume, and safe to save, with a focused current-set interface.

**Architecture:** Retain the existing workout reducer, stable set IDs, save-generation helpers, V2 serializer, legacy parser, swipe work, and persistent rest timer. Extract route orchestration into a session controller and add compact/current-set presentations over the same domain state.

**Tech Stack:** Installed Expo SDK 54 family, Expo Router, Reanimated/Gesture Handler, existing reducer, AsyncStorage draft/queue, Supabase persistence, Jest, React Native Testing Library, Maestro.

**Spec:** [Master](../specs/2026-09-15-premium-experience-design.md), [journeys W01–W07](../../redesign/2026-09-15/journey-specifications.md), [quality](../../redesign/2026-09-15/production-quality-and-rollout.md), [foundations](2026-09-15-premium-experience.md).

## Global Constraints

- Application changes stay inside mobile; web, backend, and database work are separately scoped dependencies.
- Keep Expo SDK 54 and the installed native dependency family for the core redesign.
- Keep iOS and Android functional; iOS 26 glass is an enhancement, not a requirement.
- Keep the existing Supabase authentication, role boundaries, and onboarding_step completion threshold of 3.
- Keep all 16 check-in fields and the current required-field, enum, and payload contracts.
- Keep device-local reporting dates; freeze an editor's target date until the user explicitly changes it.
- Keep existing workout V2 and legacy readers; do not add wire-format fields in the core redesign.
- Use semantic theme tokens; add no application color literals outside src/theme.
- Ship light/dark, large text, reduced motion, loading, empty, error, and offline states with each journey.
- Do not claim exactly-once server delivery, cross-device conflict resolution, or coach read receipts without supporting contracts.

---

## Boundaries and dependencies

W1 starts after F03 and contract review. Delivery requires F04. Visual work requires selected F01 frames and F02 components. Coach-web compatibility is a release gate; local implementation can proceed with representative fixtures.

| Retain / modify | Extract / create |
| --- | --- |
| app/(app)/logger.tsx | features/workout/useWorkoutSession.ts: session orchestration |
| features/workout/workoutReducer.ts; workoutSave.ts | Retain existing generation, identity, stable-ID protections |
| hooks/useWorkoutDraft.ts | Scoped draft read/discovery/migration |
| lib/workoutPersistence.ts | Explicit-ID ownership and multiple-row recovery |
| components/logger/SetEditor.tsx; ExerciseSlide.tsx | CurrentSetEditor.tsx; CompactSetRow.tsx; WorkoutOverviewSheet.tsx |
| components/logger/SwipeableSlide.tsx | Preserve existing UI-thread gesture behavior |
| components/logger/useRestTimer.ts; RestTimer.tsx | RestDock.tsx: independently subscribed presentation |
| components/logger/WorkoutSummary.tsx | Finish review and honest volume/history |
| lib/workout-content.ts | Preserve V2 and legacy serialization/parsing |

## W1 — Make entry, hydration, and draft identity deterministic

**Create:** src/features/workout/workout-entry.ts; workout-entry.test.ts; useWorkoutSession.ts; useWorkoutSession.test.tsx.
**Modify:** logger.tsx; useWorkoutDraft.ts and tests; workoutPersistence.ts and tests; src/lib/outbox.ts workout target matching.

**Consumes:** Current account, validated reporting date, optional explicit logId, assigned plan, existing records, local draft.
**Produces:**

~~~ts
export type WorkoutScope = {
  userId: string;
  date: string;
  logId: string | null;
};
export type WorkoutEntry =
  | { kind: 'loading' }
  | { kind: 'error'; reason: 'unavailable' | 'missing-log' | 'draft-unreadable' }
  | { kind: 'choose-log'; ids: string[] }
  | { kind: 'ready'; source: 'draft' | 'server' | 'plan' | 'blank' };

export function resolveWorkoutEntry(input: {
  explicitLogId: string | null;
  records: { id: string }[] | undefined;
  recordsFailed: boolean;
  draft: DraftData | null | undefined;
  draftFailed: boolean;
  planReady: boolean;
  hasAssignedPlan: boolean;
}): WorkoutEntry;

export async function findLatestWorkoutDraft(
  userId: string,
): Promise<{ date: string; logId: string | null; savedAt: number } | null>;
// Extend readWorkoutDraft/useWorkoutDraft with optional logId scope.
// Preserve existing two-argument callers until migrated.

export type WorkoutSession = {
  scope: WorkoutScope;
  entry: WorkoutEntry;
  state: WorkoutState;
  draftState: 'clean' | 'writing' | 'saved' | 'error';
  deliveryState: 'idle' | 'sending' | 'queued' | 'synced' | 'blocked';
  edit: (action: WorkoutEditAction) => void;
  save: () => Promise<'synced' | 'queued' | 'blocked' | 'invalid' | 'storage-error'>;
  flushDraft: () => Promise<boolean>;
};
export function useWorkoutSession(scope: WorkoutScope): WorkoutSession;
~~~

DraftData is the existing exported type in useWorkoutDraft.ts; WorkoutState and WorkoutEditAction come from workoutReducer.ts and workoutSave.ts. Entry selection gives matching local edits precedence; loading/failed inputs remain explicit. An explicit missing log must never silently become a different existing log or a new insert.

- [ ] Test initialization with server-first, plan-first, draft-first, failed request, and account/date change orderings.
- [ ] Do not mark the session initialized until the relevant dependencies resolve. Guard every async response with user/date/logId identity and an initialization epoch.
- [ ] Honor explicit logId from history/deep links. Query owned rows and block missing/deleted IDs with recovery; do not fall through to arbitrary date replacement.
- [ ] Replace single “latest row” lookup with a query returning all matching owned IDs. Zero may create, one may resume, multiple require selection. Keep existing multiple rows readable without introducing a new multi-session creation policy.
- [ ] Add logId to local draft identity for existing-record edits. Migrate a legacy date draft only when its embedded existingLogId matches the requested scope; save the new key successfully before deleting the old key.
- [ ] Discover the newest account draft by savedAt within the existing 24-hour window, including a previous reporting date after midnight. Preserve its original date and logId in Home's resume link.
- [ ] Keep storage failure visible. A failed migration/read cannot be treated as absence followed by plan seeding.
- [ ] Make selecting a different plan/day deliberate: save/keep current draft, discard confirmed local edits, or cancel before replacing exercises.
- [ ] Scope workout outbox targets by explicit log identity where present; two existing logs on one date must not supersede each other. When a new record receives an ID, attach it to the current session and queued identity without clearing newer revisions or rerunning initial hydration over current edits.
- [ ] Test legacy-key migration failure, multiple rows, stale account responses, and explicit-ID permission/missing cases.

~~~ts
it('does not replace an explicit missing log with another log from that date', () => {
  expect(resolveWorkoutEntry({
    explicitLogId: 'requested', records: [{ id: 'other' }],
    recordsFailed: false, draft: null, draftFailed: false,
    planReady: true, hasAssignedPlan: true,
  })).toEqual({ kind: 'error', reason: 'missing-log' });
});

it('waits for a plan before deciding to seed a new session', () => {
  expect(resolveWorkoutEntry({
    explicitLogId: null, records: [], recordsFailed: false,
    draft: null, draftFailed: false,
    planReady: false, hasAssignedPlan: false,
  })).toEqual({ kind: 'loading' });
});
~~~

Persistence adapter change, migrated together with tests/callers:

~~~ts
// Replace WorkoutLogPersistence.findByDate with:
findAllByDate: (userId: string, date: string) =>
  Promise<{ data: { id: string }[] | null; error: unknown }>;
// updateById must constrain both id and payload.user_id.
// requestedId + zero updated rows => explicit missing/unauthorized failure.
// No requestedId + >1 rows => conflict requiring selection, never arbitrary update.
~~~

**Gate:** W-A1–W-A3. No silent overwrite or incorrect plan hydration. A server uniqueness/idempotency contract remains a separate requirement for true concurrent-device protection.

## W2 — Build the current-set instrument and useful shortcuts

**Create:** src/components/logger/CurrentSetEditor.tsx; CompactSetRow.tsx; WorkoutOverviewSheet.tsx; src/features/workout/set-validation.ts and tests if the F01 completion-policy delta is approved.
**Modify:** SetEditor.tsx; ExerciseSlide.tsx; SwipeableSlide.tsx; workoutReducer.ts and tests.
**Consumes:** WorkoutState, WorkoutExercise, WorkoutSet, current prescription and dated previous values.
**Produces:** One clearly active set, compact surrounding sets, explicit completion, reversible local operations.

~~~ts
export type SetCompletionIssue = {
  field: 'reps' | 'weight' | 'duration';
  message: string;
};
export function validateSetCompletion(
  set: WorkoutSet,
  tracking: WorkoutExercise['tracking'],
): SetCompletionIssue[];

// Presentational interface:
export type CurrentSetEditorProps = {
  exercise: WorkoutExercise;
  setId: string;
  onChange: (setId: string, patch: Partial<WorkoutSet>) => void;
  onComplete: (setId: string) => void;
};
// Imports use the existing workoutReducer types; do not create a second set model.
~~~

- [ ] Freeze F01's completion policy. Recommended new completions: positive integer reps, blank bodyweight or finite nonnegative load, positive duration seconds. Retain current RPE behavior until its accepted scale is confirmed.
- [ ] Keep legacy/incomplete strings recoverable in drafts and history. New validation applies at deliberate completion, with a correction path; it must not silently erase old values.
- [ ] Render prescription and dated previous values near the active set. Show large weight/reps controls with units, optional RPE detail, and explicit Complete set.
- [ ] Replace the current fixed-minimum-width layout assumption with responsive field composition. At large text, stack controls intentionally while keeping completion reachable.
- [ ] Render completed/future sets as compact rows with accessible edit/complete controls. Do not auto-scroll away while the user is editing another row.
- [ ] Keep exercise swipe gestures and add visible Previous/Next/overview equivalents; preserve native vertical scrolling and keyboard focus.
- [ ] Copy previous values only into the selected target/empty fields as specified; show a bounded Undo action and never mark copied sets completed.
- [ ] Keep substitution local to the workout log, leaving the assigned plan unchanged. Confirm replacement when entered sets would be lost.
- [ ] Implement remove-set Undo with stable set IDs; preserve warmup/work kind, duration, completion, and the existing plate calculator.
- [ ] Run reducer/validation/interaction tests plus a physical one-handed three-set task.

~~~ts
it('does not allow an empty timed set to be newly marked complete', () => {
  const set: WorkoutSet = {
    id: 'set-1', reps: '', weight: '', rpe: '', duration: '',
    kind: 'work', completed: false,
  };
  expect(validateSetCompletion(set, 'duration')).toEqual([
    { field: 'duration', message: 'Enter a duration in seconds.' },
  ]);
});
~~~

If the new completion policy is not selected at F01, retain the existing policy and use the focused UI without silently imposing new rules. The production plan requires an explicit recorded decision, not a made-up coaching convention.

**Gate:** W-A5 and W-A6. All operations preserve data and have a visible non-gesture path.

## W3 — Refine rest without distracting from the workout

**Create:** src/components/logger/RestDock.tsx.
**Modify:** RestTimer.tsx; useRestTimer.ts and tests; logger.tsx timer composition.
**Consumes:** Existing absolute-deadline rest hook, prescription restSeconds, explicit local rest preference.
**Produces:** Independently updating persistent dock with pause/resume/skip/extend.

- [ ] Retain the existing persisted absolute deadline, pause/resume, and restoration logic; add only missing lifecycle coverage.
- [ ] Mount the timer subscription inside RestDock so one-second ticks do not rerender the full logger and all set editors.
- [ ] Use actual prescribed rest where present. Otherwise offer an explicit user-selected duration; do not present an invented duration as coach guidance.
- [ ] Auto-start after completion only if explicitly enabled in a device/account-scoped preference; default off unless an existing saved preference says otherwise.
- [ ] Keep the dock compact during entry and expand only on deliberate interaction. Reserve measured bottom space through F02.
- [ ] Ensure one meaningful rest-complete signal per timer, including foreground return; do not replay celebration/haptics repeatedly on rerender.
- [ ] Verify time after backgrounding, process restart, wall-clock changes, and pause/resume. Label behavior honestly if the device clock itself changes.
- [ ] Provide accessible time/status and named pause/resume/extend/skip actions. Avoid announcing every second to a screen reader.
- [ ] Profile three-set entry with a running timer; confirm unaffected set components do not update each tick.

~~~text
Given rest ends at absolute time T:
  background app
  advance device test clock to T + 5 seconds
  restore app
Expected: rest is finished, no negative countdown, at most one completion signal.
Given paused with R seconds remaining:
  relaunch without resume
Expected: still paused with R remaining.
~~~

Use fake-clock tests for deadline logic and actual background/device runs for lifecycle behavior. Background notifications are separately scoped; no always-running-JavaScript promise is made.

**Gate:** W-A7 and Q05 timer isolation.

## W4 — Finish accurately and protect every exit

**Modify:** WorkoutSummary.tsx and tests; workoutSave.ts and tests; logger.tsx; src/screens/__tests__/tabs/logs.test.tsx; lib/workout-content.test.ts; .maestro/workout-interruption.yaml.
**Create:** src/screens/__tests__/logger.test.tsx if absent.
**Consumes:** Session controller, F04 delivery, existing acquire/release/apply/finalize save helpers, existing V2 serializer.
**Produces:** Accurate review/receipt and safe navigation across all exit paths.

- [ ] Show completed versus incomplete sets and validated volume with clear units. Remove the screen-open duration metric and unsupported all-time PR claim derived from a limited ten-log window.
- [ ] Use date-qualified previous-session comparisons. Missing/incompatible history yields no comparison, not a fabricated baseline.
- [ ] Keep Finish as an explicit review step with clear save outcome and a return-to-edit path for incomplete/invalid work.
- [ ] Retain save locks and edit-generation protection. A late save must not clear a newer edit, its draft, or a newly attached persisted ID.
- [ ] Guard close, native back, Android hardware back, gesture back, and programmatic navigation. Flush or confirm deliberate discard before leaving; failed storage keeps the editor present.
- [ ] Interpret discard as local changes to this session, not deletion of a saved server record.
- [ ] Render queued, blocked, and synced receipts truthfully; keep retry/recovery available and preserve queued content through app restart.
- [ ] Run mobile V2/legacy fixture round-trips without adding wire fields or downgrading V2 content.
- [ ] Hand the exact fixture set to the separately scoped coach-web compatibility check. Do not declare release readiness before supported readers/editors pass.
- [ ] Run interruption, existing-record edit, copy/undo, date change, account switch, queued save, and later synchronization on both native platforms.
- [ ] Capture selected frames, VoiceOver/TalkBack completion, compact/largest text, and measured runtime traces.

Existing helper test example:

~~~ts
it('keeps newer work when the submitted generation has changed', async () => {
  const clearDraft = jest.fn(async () => true);
  const repersistLatestDraft = jest.fn(async () => true);
  const result = await finalizeWorkoutSave({
    savedGeneration: 4,
    getCurrentGeneration: () => 5,
    clearDraft,
    repersistLatestDraft,
  });
  expect(result).toBe('edited');
  expect(clearDraft).not.toHaveBeenCalled();
  expect(repersistLatestDraft).toHaveBeenCalledTimes(1);
});
~~~

**Gate:** W-A1–W-A10 and Q01–Q06, including coach-web compatibility before release. Commit only reviewed workstream files.
