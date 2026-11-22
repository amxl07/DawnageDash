# 002 — Premium check-in and set-by-set interaction

Status: IMPLEMENTED · Automated and browser verification passed; native-device acceptance pending · Baseline: `8ec16a7` plus current working tree · Depends on 001 · Priority: medium/high · Categories: causality, continuity, simplicity.

## Current evidence

Root: `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`.

- `src/components/checkin/CheckInRatingScale.tsx:60–70`: selection effect does `scale.set(motion.enabled ? motion.pressScale : 1)` then `withTiming(1)`. Touch feedback should be caused by touch; restoring a selected value should not impersonate a fresh press.
- `src/components/checkin/OptionalCheckInFields.tsx:27`: `if (expanded && commits?.flush() === false) return;` is a critical collapse guard.
- `src/components/logger/ExerciseSlide.tsx:60–78`: current set and completion summary replace in place; editor key is `active.id`.
- `CurrentSetEditor.tsx:71` requests a Light impact; `app/(app)/logger.tsx:215` calls `restActions.start(seconds)` on auto-start; `useRestTimer.ts:251` requests another Light impact.

## Target behavior and exact motion

Rating press starts immediately: tint plus scale0.97/120 ms, cubic-bezier(0.23,1,0.32,1); release/cancel returns from current presentation value. Selection changes fill/text/check over160 ms. No animation or haptic for restoring an answer or choosing the existing answer. Reduced motion keeps immediate color/shape/text only.

Disclosure chevron rotates0→180 degrees over160 ms. Input body mounts immediately or fades≤160 ms; do not animate focused input position/height. Step changes establish content/heading/scroll coherently, optionally opacity0.5→1 over160 ms. No navigation or save waits on an animation callback.

Set completion commits the captured stable set ID immediately. Add a local160 ms check and concise completed-set/Undo summary; next editor appears at the same anchor with≤160 ms opacity. Do not auto-focus a new keyboard, auto-scroll or auto-advance exercise. No tap/callback from a disappearing control can mutate the replacement set. Final exercise completion still requires explicit review/continuation.

A fresh save receipt may draw a check path over300 ms, finishing within500 ms total. The actual queued/synced/blocked text and actions are available immediately. Queue acknowledgement is not a server-success animation. Reduced motion is a static icon. Receipt replay is tied to new result identity, not mounting/restoring.

## Ordered implementation

1. Preserve the completed guided-flow layout and tests; inspect `docs/guided-daily-flows.md` and its data/keyboard boundaries.
2. Replace rating selection-driven press animation with actual press lifecycle. Retain two rows of five, exact1–10 values, labels, accessible radio state, repeated-selection guard and deliberate selection underline.
3. Apply shared pressed tint to copy/Undo/effort/Sets/rest/header links. Add one disclosure visual treatment without changing flush/reveal behavior. Invalid raw numeric text must keep the containing section open and focused, even on a second validation attempt.
4. Add local set handoff at the visual wrapper. Keep stable IDs and existing reducer/persistence. Add explicit completion Undo if absent; ensure its scope is the captured set, separate from Undo copy and restore removed set. It must not erase later edits or undo another set.
5. Give timer `start` an explicit causal option or separate silent auto-start action. Default/manual starts keep one haptic; auto-start after completion is silent. Propagate through actions context and test consumers. No changes to absolute time, persistence, expiry generation guards or notification permissions.
6. Add the same restrained receipt treatment to `src/features/checkin/components/CheckInReceipt.tsx` and `src/components/logger/WorkoutSummary.tsx` around existing truthful content. Confirm exact current receipt path before editing.

## Hard boundaries

Keep three daily steps plus review; optional measurements; direct NumericEntry stage/commit protocol; date/account isolation; drafts; outbox; authoritative receipts; explicit final save. No subjective auto-prefill, ruler, forced required optional fields, schema changes or network changes.

Keep workout weight/reps/duration/bodyweight/RPE semantics, copy provenance, stable IDs, editable completed sets, partial workouts, Overview and exit guards. The rest dock stays inline at compact height/large text/keyboard as currently implemented. No Skia or Lottie is needed for this slice.

## Verification

Extend existing behavior tests for held/cancelled/restored ratings, invalid numeric collapse/reveal, rapid completion/Undo with stable IDs, and exactly one haptic for auto-start completion/manual timer start. Reuse check-in/logger route and submission tests. Run relevant tests, typecheck, lint, UI contracts and guided browser journeys; full suite once integrated.

Physical feel checks: complete sets while keyboard dismisses; immediately edit/Undo; switch exercise mid-transition; background/resume timer; retry queued save; return to existing receipt; use VoiceOver/TalkBack and200% text. Compare normal motion with reduced motion. Done means no data/keyboard/exit regression, no action delay and no unnecessary repeated celebration.
