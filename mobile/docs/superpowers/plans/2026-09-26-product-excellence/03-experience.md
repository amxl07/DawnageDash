# C — UI and Daily Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app feel coherent and personal while reducing the effort required to act, report and return.
**Architecture:** Retain the existing theme and feature modules; define shared state/interaction patterns, validate navigation, then improve the daily journey incrementally.
**Tech Stack:** Existing Expo Router, native controls, React Native, theme tokens, Jest/Testing Library, Maestro and physical-device capture.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## U01 — Capture the current product and choose a visual/navigation direction

**Priority:** P0. **Depends on:** F01 for native captures. **Owner:** designer + mobile engineer.
**Inspect:** all routes in `mobile/app/`, `mobile/src/theme/tokens.ts`, `mobile/src/theme/colors.ts`, `mobile/src/components/ui/`, existing September design artifacts.
**Create:** `mobile/docs/release/product-excellence/design/screen-inventory.md`, `mobile/docs/release/product-excellence/design/direction.md`, `mobile/docs/release/product-excellence/design/navigation-study.csv` and current screenshot assets beside them.

- [ ] Capture signed current iOS/Android builds using fictional new, active, returning and unassigned clients. Include Home, every editor/receipt, coach path, plan/history, nutrition, progress/photos, account/privacy and public entry. Record device/build/state with every image.
- [ ] Audit hierarchy, readability, reach, spacing, native conventions and friction from those captures. Separate directly observed defects from hypotheses. Old screenshots and blank browser frames cannot validate current visual quality.
- [ ] Produce two focused phone-scale options: refine current five tabs with prominent Coach/Progress entry, or Today/Training/Nutrition/Coach/Progress with direct Today check-in and profile avatar. Keep the existing route contract in both prototypes.
- [ ] Test finding the daily check-in, assigned workout, coach reply and progress with 12 representative clients. Counterbalance option order. Record first action, completion, time, wrong turns and comments.
- [ ] Adopt the candidate only when ≥10/12 find every critical destination unaided, the current layout misses that threshold, and check-in discovery does not regress. If both pass or evidence is inconclusive, refine the current navigation.
- [ ] Deliver a chosen visual specification: type hierarchy, spacing rhythm, page/card/list composition, restrained accent usage, icon rules, numeric formatting, light/dark examples, interaction motion and state matrix. Product owner reviews these concrete artifacts before production visual rollout.

**Acceptance:** current evidence supports the decisions; at least Home, check-in, logger, Coach and Progress have approved normal/loading/empty/error/offline specimens. This task contains no invented pixel diagnosis.

## U02 — Make reusable UI states and interactions consistent

**Priority:** P1. **Depends on:** U01/F03; C01 state contracts.
**Modify:** `mobile/src/theme/tokens.ts`, `mobile/src/theme/colors.ts`, `mobile/src/components/ui/Button.tsx`, `mobile/src/components/ui/Button.ios.tsx`, `Input.tsx`, `Screen.tsx`, `Sheet.tsx`, `RecordStatus.tsx`, `StickyActionBar.tsx` in that same UI directory; `mobile/src/testing/NativeControlGallery.tsx`.
**Create:** `mobile/src/components/ui/AsyncState.tsx`, `mobile/src/components/ui/AsyncState.test.tsx`, `mobile/docs/release/product-excellence/design/component-contracts.md`.

- [ ] Inventory existing primitives before creating new ones. Define a single contract for loading, empty, offline cached, queued, blocked and retryable error states; present delivery separately from completion/review.
- [ ] Implement the chosen tokens and shared components in small batches. Keep numeric alignment legible, line lengths controlled, primary actions reachable and destructive actions distinct. Avoid duplicating a platform primitive solely for a new appearance.
- [ ] Document minimum touch targets (44 pt iOS / 48 dp Android where applicable), labels, focus restoration, dynamic type/wrapping and contrast. Do not rely on color alone to show status.
- [ ] Specify motion by purpose: selection, sheet continuity and save feedback. Use native/Reanimated infrastructure already available; interruptible motion must not block repeated set entry. Reduced motion removes nonessential movement; reduced transparency preserves contrast.
- [ ] Test in the native component gallery with keyboard open, long labels, slow state changes and large text. Verify a failed request retains user input and presents one useful recovery action.
- [ ] Apply shared states to feature screens as they are completed; Q03 performs the final cross-flow accessibility check.

**Example test:** a queued workout renders “Saved on this device — waiting to sync” with an accessible text description; it never renders a server-success indicator. Retrying an error preserves the user's entered form values.

**Acceptance:** five critical screen families reuse the same state and control rules, and their native specimens match the chosen direction.

## U03 — Improve first use, Home and returning after a break

**Priority:** P0. **Depends on:** F04/F05/U02/C01; C03 for published coach content.
**Modify:** `mobile/src/features/onboarding/SetupStage.tsx`, `mobile/src/features/onboarding/setup-model.ts`, `mobile/app/(app)/onboarding.tsx`, `mobile/src/components/questionnaire/QuestionnaireWizard.tsx`, `mobile/src/lib/questionnaire-data.ts`, `mobile/src/features/home/TodayBrief.tsx`, `mobile/src/features/home/selectors.ts`, `mobile/src/features/home/NextSessionCard.tsx`, `mobile/app/(app)/(tabs)/index.tsx`.
**Create:** `mobile/src/features/home/return-state.ts`, `mobile/src/features/home/return-state.test.ts`, `mobile/docs/release/product-excellence/design/first-week.md`.

- [ ] Make initial setup answer the essentials: goal, relevant preferences, coach/assignment status and the next useful action. Explain the service without requiring the full 87-question assessment before seeing value.
- [ ] Keep the long assessment separately resumable. Branch by relevant answers, show honest section progress, preserve hidden previous answers safely and fix confusing copy. Coach lead reviews field relevance; clinical/injury answers route to coach review rather than automated prescriptions.
- [ ] Define Home's primary-action priority: recover an active task → time-relevant assigned action → review a new coach decision → appropriate check-in/weekly task. Keep other useful actions visible without multiple competing primary buttons.
- [ ] Show a concise daily brief, last coach decision, plan context and truthful sync status. Explain unassigned/empty plans with an actual next step, not a dead end or fake personalized template.
- [ ] Create first-week guidance around completing one useful loop, with contextual permissions. After a break, offer “Continue today” and recoverable old work; do not require clearing every missed day.
- [ ] Test midnight, rest day, no coach, partial workout, unsent check-in, updated plan and a seven-day absence. Preserve existing deep links and sign-in return destinations.

**Example test:** a returning user with an old unsubmitted draft and today's assignment sees a recoverable draft link plus today's actionable plan. No fabricated overdue requirement prevents starting today.

**Acceptance:** at least 11/12 study users reach their assigned first task unaided; ≥10/12 explain what they should do next. Home-to-ready-workout requires at most two deliberate actions.

## U04 — Reduce check-in effort while preserving the required protocol

**Priority:** P0. **Depends on:** F04/F05/F07/U02; N04 for meal totals, Q01 for native import evidence.
**Modify:** `mobile/src/features/checkin/CheckInEditorScreen.tsx`, `useCheckInEditor.ts`, `config/fields.ts`, `model.ts`, `components/CheckInReviewSheet.tsx`, `components/NumericCommitProvider.tsx` within that feature; `mobile/src/lib/checkin-validation.ts`, `mobile/src/features/health/health-review-sheet.tsx`.
**Create:** `mobile/src/features/checkin/entry-provenance.ts`, `mobile/src/features/checkin/entry-provenance.test.ts`, `mobile/docs/release/product-excellence/design/checkin-effort.md`.
**Extend:** `mobile/src/features/checkin/CheckInJourney.integration.test.tsx`.

- [ ] Record time/effort for manual strict entry and reviewed-import entry before changing the journey. Track required missing fields, keyboard transitions and repeated copying.
- [ ] Allow incremental entry through the day into one date-owned draft. Keep all applicable required fields, including existing required notes/nutrition fields, until U05 explicitly defines another protocol. Avoid preselecting subjective ratings.
- [ ] Offer reviewed health values, confirmed meal totals, relevant logged-workout suggestions and explicit “use previous value” where appropriate. Show date, source and freshness; a suggestion is not a confirmed answer.
- [ ] Improve keyboard next/done, unit labels, raw-number editing, progress-to-valid-submit and jump-to-error. Keep the review step concise and editable; validation must explain how to finish without discarding entered data.
- [ ] Carry per-field provenance to the server through an additive typed sidecar/metadata contract coordinated with F07. A manual edit supersedes the source label and remains authoritative until the client explicitly accepts another proposal.
- [ ] Test backfill, midnight, water 2.25, no health permission, stale import, manual override, partial daily meal coverage, offline handoff and conflict after another device edits.

```ts
type FieldOrigin = {
  source: 'manual' | 'health_import' | 'confirmed_meal' | 'legacy_unknown';
  sourceDate: string;
  confirmedAt: string | null;
};
// Test: imported steps for yesterday are not silently accepted for today;
// reviewing an import never overwrites a later manual edit.
```

**Acceptance:** strict manual median time improves ≥30% from baseline without lower coach-rated usefulness; reviewed-import median ≤60 seconds and p90 ≤120 seconds. These are targets to validate, not assumed gains.

## U05 — Evaluate a coach-assigned shorter protocol, behind a gate

**Priority:** P2 experiment; completion can be a documented decision to retain strict mode. **Depends on:** U04/R02 baseline and explicit service-owner decision.
**Create if the pilot is approved:** `shared/checkin-protocol.ts`, `supabase/migrations/20260926000600_checkin_protocols.sql`, `supabase/tests/database/checkin_protocols.test.sql`, `mobile/src/features/checkin/protocol.test.ts`, `mobile/docs/release/product-excellence/short-protocol-experiment.md`.
**Modify if approved:** mobile/server/web validation and coach protocol assignment UI in `client/src/components/ClientDetailsSheet.tsx`.

- [ ] Present the coach lead with U04 effort and data-use evidence. Decide which fields genuinely inform decisions for the chosen client segment. If the strict protocol is retained, record the decision and keep the pilot flag off; no schema change is required.
- [ ] If approved, author a versioned protocol with required fields, allowed “not measured” reasons, cadence and eligible clients. Explicitly assign it through a privileged server operation; never infer it from app version or a client-side flag.
- [ ] Store the assigned protocol version on every submission and queued draft. Old queued submissions validate against their captured protocol; protocol changes do not silently invalidate retained work.
- [ ] Give web/mobile/server one validation contract. Preserve missing versus measured-zero values and label protocol differences in coach review.
- [ ] Run a small controlled pilot with time-to-submit, completion, missing-information follow-up and coach-rated usefulness. Compare with the optimized strict experience; stop or revise if decision quality declines.
- [ ] Record the rollout/retain/reject decision and recovery path for pilot users. Do not retroactively rewrite historical answers.

**Example test:** a version 1 strict draft queued yesterday still requires its version 1 fields after the client is assigned version 2. A client cannot submit a version they were never assigned.

**Acceptance:** the default required protocol remains unchanged unless an explicit versioned service decision is implemented and validated. This experiment is not a prerequisite for a safe initial private beta.

## Package verification and handoff

Use focused component/journey tests for state transitions and validation, not tests that merely duplicate copy. Run full mobile verification at integration. Keep before/after native captures and study raw counts under the design evidence directory. Record U01's navigation decision, U05's protocol decision and every remaining critical usability issue for R02/R04.

