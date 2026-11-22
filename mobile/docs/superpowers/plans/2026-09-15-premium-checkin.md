# Dawnage Daily Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when delegation is authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing 16-field check-in into a precise, low-friction daily record with dependable drafts, clear submission, and meaningful receipts.

**Architecture:** Keep the canonical field registry and payload, extract the domain model from the old renderer, and give both single-scroll and wizard presentations one editor controller. Refine existing Reanimated controls instead of introducing a second form or animation framework.

**Tech Stack:** Installed Expo SDK 54 family, Reanimated/worklets, Gesture Handler, AsyncStorage, existing React Query/Supabase persistence, Jest and React Native Testing Library.

**Spec:** [Master](../specs/2026-09-15-premium-experience-design.md), [journeys C01–C06](../../redesign/2026-09-15/journey-specifications.md), [motion](../../redesign/2026-09-15/design-system-and-motion.md), [foundations](2026-09-15-premium-experience.md).

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

C1 can begin after F03 and the contract checkpoint. C2 submission requires F04. Visual C3/C4 require F01/F02. Do not change the 16 fields, order, labels, enums, stored keys, or required rules under the name of simplifying the form.

| Retain / modify | Extract / create |
| --- | --- |
| components/checkin/CheckInForm.tsx | features/checkin/model.ts: FormState and conversion functions |
| features/checkin/config/fields.ts | Imports from model, not a presentation component |
| hooks/useCheckInDraft.ts | Serialized immediate save, explicit errors, draft discovery |
| app/(app)/(tabs)/check-in.tsx | features/checkin/useCheckInEditor.ts: state and transitions |
| features/checkin/components/CheckInPanel.tsx | DailyRecordHeader.tsx, CheckInReviewSheet.tsx, CheckInReceipt.tsx |
| NumericEntry, TickRuler, rulerMath, RatingScale components | Refine current controls and meaningful tests |
| features/checkin/history.ts | Dated factual summaries, preserved eligibility rules |
| hooks/useCheckInMutation.ts and checkInOutbox.ts | Foundation delivery result integration |

## C1 — Extract the model and protect every draft

**Create:** src/features/checkin/model.ts; model.test.ts.
**Modify:** src/components/checkin/CheckInForm.tsx; config/fields.ts; src/lib/checkin-validation.ts; useCheckInDraft.ts and tests; dependent imports.

**Consumes:** Existing FormState, EMPTY_FORM, fromRow, prefillFrom, toPayload, CheckInStep. **Produces:** Same domain functions from model.ts; temporary re-exports from CheckInForm preserve older consumers during migration.

Additional draft interfaces:

~~~ts
export type CheckInDraft = {
  form: FormState;
  step: number;
  savedAt: number;
};
export async function readCheckInDraft(
  userId: string, date: string,
): Promise<CheckInDraft | null>;
export async function findLatestCheckInDraft(
  userId: string,
): Promise<{ date: string; savedAt: number } | null>;

// useCheckInDraft retains saveDraft/loadDraft/draftStatus and adds:
saveDraftNow: (form: FormState, step: number) => Promise<boolean>;
clearDraft: () => Promise<boolean>;
~~~

- [ ] Freeze a golden fixture containing all 16 form fields and its exact payload; test round-trip conversions, optional nulls, enums, and performance hidden for Rest/No.
- [ ] Move the existing model code unchanged; re-export temporarily and update registry/validation/history imports to eliminate presentation coupling.
- [ ] Replace cancellation-only debounce behavior with serialized immediate writes and a current-scope generation guard. Mark saved only after storage acknowledges the matching generation.
- [ ] Export strict draft reads. Missing/expired may return null; storage/parse failure must reach the caller as recovery state instead of masquerading as no draft.
- [ ] Flush the current snapshot before controlled exit/date change and attempt flush on background. Do not promise recovery if the OS kills before acknowledgment.
- [ ] Support drafts for edits to existing rows as well as new records. Hydrate once per account/date and never allow a late server response to overwrite local edits.
- [ ] Discover latest valid drafts across that account's date keys, including backfilled days. Filter by savedAt inside the existing 72-hour retention; expose the original reporting date. Use an account-key scan on focus initially, then cache the metadata; do not scan on every render.
- [ ] Preserve legacy draft format and step. Never expire a queued submission through draft cleanup.
- [ ] Test save/clear ordering, edits inside debounce, unmount, scope change, old storage format, expiry, storage failure, and account isolation.

Golden contract assertion using the source model's actual field names:

~~~ts
it('keeps subjective answers empty until explicitly entered', () => {
  const previous = fromRow(fixtureDailyCheckIn); // complete fictional row
  const copy = prefillFrom(fixtureDailyCheckIn);
  expect(previous.energyLevel).not.toBeNull();
  expect(copy.energyLevel).toBeUndefined();
  expect(copy.stressLevel).toBeUndefined();
  expect(copy.hungerLevel).toBeUndefined();
  expect(copy.nutritionScore).toBeUndefined();
  expect(copy.morningWeight).toBe(fixtureDailyCheckIn.morning_weight);
});

it('removes inapplicable workout performance from the payload', () => {
  const payload = toPayload({
    ...EMPTY_FORM, workoutStatus: 'rest_day', workoutPerformance: 8,
  }, '2026-09-15');
  expect(payload.workout_performance).toBeNull();
});
~~~

fixtureDailyCheckIn comes from F01's typed fictional fixture catalog; it includes the complete current row shape, not production client data.

**Gate:** C-A1, C-A4, and C-A5. Acknowledged new/edit drafts recover correctly within documented retention.

## C2 — Coordinate submission, dates, and delivery

**Create:** src/features/checkin/useCheckInEditor.ts; useCheckInEditor.test.tsx.
**Modify:** check-in.tsx; useCheckInMutation.ts; existing route tests.
**Consumes:** model, registry, validation, C1 draft API, F03 dates, F04 delivery.
**Produces:**

~~~ts
export type CheckInSubmitResult =
  | 'synced' | 'queued' | 'blocked' | 'invalid' | 'storage-error';
export type CheckInEditor = {
  date: string;
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  loadState: 'loading' | 'ready' | 'error';
  draftState: 'clean' | 'writing' | 'saved' | 'error';
  deliveryState: 'idle' | 'sending' | 'queued' | 'synced' | 'blocked';
  generation: number;
  submittedGeneration: number | null;
  isSubmitting: boolean;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  submit: () => Promise<CheckInSubmitResult>;
  flushDraft: () => Promise<boolean>;
  requestDateChange: (date: string) => Promise<boolean>;
};
export function useCheckInEditor(date: string): CheckInEditor;
~~~

Presentation-specific review visibility and field layout refs can remain outside the controller. The controller owns record identity, edit generation, submit lock, and domain state; it does not own animation values.

- [ ] Validate route dates strictly and freeze the selected reporting date while editing. Future dates show an explanation and a deliberate return-to-today action.
- [ ] Reconcile source precedence once: explicit unsynced local edit, durable queued payload, selected server record, then empty form. Explain any unresolved ambiguity; never silently overwrite.
- [ ] Commit the focused NumericEntry text before snapshot/validation, including Submit tapped without a blur.
- [ ] Validate all required fields with the canonical function; return invalid and reveal/focus the first invalid field in registry order.
- [ ] Acquire a submit lock, capture the current edit generation and payload, persist durable intent through F04, and map its result to truthful UI state.
- [ ] Clear a draft only when the saved generation is still current. If a new edit races cleanup, re-persist the latest draft and keep editing; never navigate away due to the older save.
- [ ] Keep draft status independent of delivery status. A synced older version plus a new unsaved edit is a valid state and must be visible.
- [ ] On date change or exit, require confirmed flush or deliberate discard. Storage failure keeps the editor open with Retry.
- [ ] Map auth/permission/validation/conflict failures to recovery actions; preserve values and rejected intent.
- [ ] Test two rapid taps, late network acknowledgment, edit-during-save, save-then-change-date, queued replacement, corruption, and retry.

Concurrency test contract:

~~~text
Given generation 4 is submitting:
  edit Notes -> generation 5
  server acknowledges generation 4
Expected:
  receipt may acknowledge the submitted snapshot
  generation 5 remains dirty with its Notes value
  latest draft is persisted
  no automatic route exit or clearing of generation 5
~~~

Use deferred promises in useCheckInEditor.test.tsx to control those exact ordering points, following the existing workoutSave.test.ts approach. Test the asynchronous boundary, not a source-string match.

**Gate:** C-A2, C-A4, C-A5, C-A7, and J01/J02. The user can always tell which work is local, queued, blocked, or synced.

## C3 — Refine the daily instruments

**Modify:** TickRuler.tsx; rulerMath.ts and tests; NumericEntry.tsx and tests; CheckInRatingScale.tsx and tests; PreviousValueButton.tsx; HistoryCaption.tsx; history.ts and tests.
**Consumes:** Field registry bounds/steps, F02 tokens, motion specification.
**Produces:** Accurate, accessible, interruptible controls with deliberate history reuse.

Add one pure geometry contract to rulerMath.ts:

~~~ts
export type RulerProjection = { value: number; offset: number };
export function projectRulerDrag(input: {
  initial: number;
  translationX: number;
  pixelsPerStep: number;
  step: number;
  min: number;
  max: number;
}): RulerProjection;
// value = clamp(initial - translationX / pixelsPerStep * step), snapped to step
// offset = -(value - initial) / step * pixelsPerStep
// Derive preview, tick alignment, and final commit from this same projection.
~~~

- [ ] Add tests for min/max, fractional step precision, large drags, reversal, and the same visual/committed projection.
- [ ] Center the tick strip around the current marker. Remove the mismatch between a visually clamped drag and an unclamped committed value.
- [ ] Keep transient value/tick movement on the UI runtime; schedule one form commit on successful gesture end. Reset correctly on cancellation/finalization and external value change.
- [ ] Reject vertical intent early so form scrolling wins. Test diagonal gestures and begin-scroll-then-touch-ruler on native devices.
- [ ] Implement the supported UI-thread numeric preview adapter only after checking SDK 54/worklets behavior. If it fails the prototype, use an honestly aligned committed value until the adapter is sound.
- [ ] Keep direct numeric typing and accessible increment/decrement available. Empty, invalid, and out-of-range input must not silently become zero.
- [ ] Use two rows of five large rating targets on compact phones, with clear selected value and labeled scale endpoints. Verify reading order and selected state.
- [ ] Make copying previous objective values explicit with date and Undo. Never apply subjective history automatically.
- [ ] Show history captions only with at least three earlier observations; ranges use up to 14 observations, exclude the selected day, and retain source dates.
- [ ] Limit haptics to meaningful commits; follow the exact reduced-motion and interruption rules from the motion specification.

~~~ts
it('keeps the visual position aligned with a clamped value', () => {
  const result = projectRulerDrag({
    initial: 50, translationX: -1000, pixelsPerStep: 10,
    step: 1, min: 20, max: 60,
  });
  expect(result).toEqual({ value: 60, offset: -100 });
});
~~~

**Gate:** C-A3 and C-A6. Gesture tests include physical devices; passing pure math tests is insufficient.

## C4 — Compose Daily Record, Review, and persistent receipt

**Create:** features/checkin/components/DailyRecordHeader.tsx; CheckInReviewSheet.tsx; CheckInReceipt.tsx.
**Modify:** CheckInPanel.tsx; check-in.tsx; CheckInForm.tsx fallback wiring; relevant screen tests; .maestro/home-checkin.yaml.
**Consumes:** C2 controller, C3 controls, F02 shared components. **Produces:** Complete single-scroll experience sharing the same model/controller with the wizard fallback.

- [ ] Render date/save strip and Readiness, Recovery, Adherence, Notes in original order with generous grouping and restrained borders.
- [ ] Keep all 16 fields present. Optional macros may collapse together; preserve values and expand automatically when an error requires attention.
- [ ] Use measured bottom action geometry. Submit remains the deliberate primary action; Review is optional and does not add a compulsory daily step.
- [ ] Render the review sheet as a readable summary with field-level Edit navigation and accessible focus return.
- [ ] Render queued and synced receipts with explicit selected date, edit option, and at most two neutral factual observations. Keep a receipt visible when returning to the same saved day.
- [ ] Distinguish historical edit from today's entry in titles and submit copy. Keep the original date frozen through midnight.
- [ ] Add stale history, no history, first use, blocked save, offline queue, existing edit, and backfill states from C06.
- [ ] Preserve the build-time wizard flag. Both modes must use the same draft and delivery contracts; switching presentation must not erase work.
- [ ] Run contract/control/controller/screen tests and the backfill/queue Maestro flows.
- [ ] Capture full native scroll recordings, keyboard/error focus, screen-reader completion, both themes, 200% text, and Reduced Motion.

**Gate:** C-A1–C-A8, Q01–Q04. Check-in performance and perceived repetition must be evaluated with repeated use, not just a first impression. Commit only reviewed workstream files.
