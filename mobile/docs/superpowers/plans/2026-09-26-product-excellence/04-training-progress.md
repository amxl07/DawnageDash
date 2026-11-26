# D — Training and Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make training easy to execute, alternatives trustworthy and progress understandable in relation to the client's goal.
**Architecture:** Add immutable published plan snapshots and workout context beside the existing v2 log format; share completion/progress calculations across clients.
**Tech Stack:** Existing Expo logger and charts, React coach editor, Supabase/RLS/RPC, shared TypeScript, Jest/pgTAP/Maestro.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## T01 — Version plans and identify exercises consistently

**Priority:** P1, required for reliable change tracking. **Depends on:** F02/F06/F07. **Feeds:** C02, T03, N01.
**Modify:** `client/src/components/EditableWorkoutPlan.tsx`, `client/src/components/EditableMealPlan.tsx`, `mobile/src/hooks/usePlans.ts`, `mobile/src/hooks/usePlanProvenance.ts`, `mobile/src/lib/workout-content.ts`, `mobile/src/lib/outbox.ts`.
**Create:** `shared/plan-version.ts`, `supabase/migrations/20260926000700_plan_versions.sql`, `supabase/tests/database/plan_versions.test.sql`, `mobile/src/features/training/plan-version.test.ts`, `mobile/src/features/training/workout-context.ts`.

- [ ] Define `plan_versions` with client, plan kind, revision, immutable published snapshot, author, publication time and source legacy plan ID. Maintain a distinct current assignment reference; edits to drafts must not change an already-started session.
- [ ] Publish through an assignment-checked transactional RPC. Use the same publication envelope for training and meals; domain-specific snapshot validation remains separate. Link responses from C01 to real published version IDs.
- [ ] Add a stable exercise catalog and aliases. Preserve display names; map legacy exercises only when identity is established. Similar names or different equipment must not automatically share PR history.
- [ ] Create `workout_log_context` keyed by workout log UUID with plan version, approved alternative ID, required work snapshot and stable exercise references. Keep `WorkoutContentV2` readable by existing clients; do not rename its session-local reducer IDs into pretend catalog IDs.
- [ ] Update the workout save RPC to commit log + sidecar + idempotency receipt together. Persist that same context in the offline operation before acknowledging local durability.
- [ ] Validate older readers and the no-context fallback. A legacy record remains usable, with unknown prescription adherence where appropriate. Starting before a coach update continues against the captured version unless the user deliberately starts a new session.

```ts
type WorkoutContext = {
  workoutLogId: string;
  planVersionId: string | null;
  alternativeId: string | null;
  exercises: {
    logExerciseIndex: number;
    catalogExerciseId: string | null;
    requiredWorkSets: number | null;
    tracking: 'weight-reps' | 'duration';
  }[];
};
// Test: publish v2 while a v1 draft is active; submitting the draft references v1.
// Editing v2 never changes the v1 summary or the original response's plan link.
```

**Acceptance:** coach changes are inspectable, session targets cannot drift after the fact, and mobile/web can read existing v2 logs throughout rollout.

## T02 — Make gym execution fast and recoverable

**Priority:** P1. **Depends on:** F03–F06/U02/T01.
**Modify:** `mobile/app/(app)/logger.tsx`, `mobile/src/components/logger/CurrentSetEditor.tsx`, `CompactSetRow.tsx`, `ExerciseSlide.tsx`, `WorkoutOverviewSheet.tsx`, `useRestTimer.ts` in that directory; `mobile/src/features/training/training-plan.tsx`.
**Create:** `mobile/src/features/training/useExerciseHistory.ts`, `mobile/src/features/training/exercise-history.ts`, `mobile/src/features/training/exercise-history.test.ts`, `mobile/.maestro/workout-interruption.yaml`.

- [ ] Add indexed, paginated history lookup by stable exercise identity, date and tracking mode. Retrieve relevant previous comparable performance beyond the existing ten-session window; label unknown/mismatched legacy history.
- [ ] Place prescription and previous actual values near the active set. Make repeat last set, adjust, complete and undo obvious with the keyboard visible. Keep optional detail in reachable sheets rather than competing primary actions.
- [ ] Acknowledge a set locally only after durable persistence. Optimistic visual feedback can happen sooner, but its status must not imply the write is safe before it is.
- [ ] Preserve existing RPE, warm-up/work-set distinction, duration, substitution, plate calculator and rest timer. Do not rebuild features already present. Fix measured friction and retain edit/undo after completing a set.
- [ ] Show an honest end-of-session review: completed work, skipped work, partial/complete/unknown and queued/synced. Offer resume when appropriate; avoid celebratory completion for unfinished prescribed work.
- [ ] Measure feedback/save latency on reference release builds. Test gloves/sweaty-hand-like imprecision through generous targets, one-handed use, incoming interruption, low battery, network loss and app termination.

**Example test:** enter a set, receive durable saved acknowledgment, terminate immediately and relaunch offline. The same actual values and completion state return, and retrying sync creates one row.

**Acceptance:** Home-to-ready-workout ≤2 deliberate actions, visual response p95 ≤100 ms and durable local acknowledgment p95 ≤500 ms on reference devices; zero acknowledged set loss in the fault matrix.

## T03 — Add coach-approved session alternatives

**Priority:** P1 differentiator. **Depends on:** T01/T02/C01.
**Modify:** `client/src/components/EditableWorkoutPlan.tsx`, `mobile/src/features/training/training-plan.tsx`, `mobile/src/features/home/NextSessionCard.tsx`.
**Create:** `shared/session-alternative.ts`, `mobile/src/features/training/ChooseAlternativeSheet.tsx`, `mobile/src/features/training/session-alternative.test.ts`, `supabase/migrations/20260926000800_session_alternatives.sql`, `supabase/tests/database/session_alternatives.test.sql`.

- [ ] Let a coach publish client-specific short-session and equipment alternatives with a name, duration estimate, allowed context and explicit prescription. An alternative is an approved plan snapshot, not an automatically improvised workout.
- [ ] Offer concise client choices such as time available or equipment available only when an assigned alternative supports them. When none exists, show a coach-contact path and the current plan honestly.
- [ ] Capture the chosen variant before starting and keep its requirements in T01 context. Count completion against that variant while retaining the relationship to the original assignment.
- [ ] If discomfort/injury is reported, provide a safe stop/contact-coach flow; do not turn a symptom into an automatic exercise or rehabilitation recommendation.
- [ ] Test withdrawn approval, stale cached variants, reassignment, midway switching and version updates. A midway change requires an explicit new-session/review decision; it cannot retroactively relabel logged work.

**Example test:** a six-set approved short alternative is fully completed. It counts completed against that alternative and is identified as such in the coach report; it does not claim the twelve-set original was performed.

**Acceptance:** a disrupted day has a genuinely authorized path, and the coach can see what the client actually chose and completed.

## T04 — Present credible exercise progression

**Priority:** P1. **Depends on:** T01/T02/F06.
**Create:** `shared/training-progress.ts`, `mobile/src/features/training/ExerciseProgress.tsx`, `mobile/src/features/training/training-progress.test.ts`, `scripts/training-progress.test.mjs`.
**Modify:** training/history routes, `mobile/src/components/charts/LineChart.tsx`, web workout detail summaries.

- [ ] Define comparable sets by catalog identity, tracking mode and normalized known units. Keep duration and weight/repetition domains separate. Exclude incomplete sets, warmups and unknown load from PR calculations.
- [ ] Show previous best comparable performance, actual recent sessions and a readable explanation of the comparison. Use simple transparent measures initially; estimated one-rep max requires a separate reviewed formula/label and is not necessary for this package.
- [ ] Distinguish a heavier load from more reps at the same load. Do not manufacture one universal “strength score” that hides incompatible observations.
- [ ] Handle bodyweight/assisted variants and equipment differences explicitly; defer comparisons when load semantics are unknown. Never merge exercises solely because their names look alike.
- [ ] Test kg/lb conversions with a defined rounding tolerance, a warmup heavier than work sets, edited/deleted logs, duplicate sync and multi-year paginated history.

**Example test:** an incomplete 100 kg set and a completed 80 kg warmup do not beat a completed 70 kg work set in the work-set record. An unknown-unit legacy set remains visible but excluded from the comparison.

**Acceptance:** every shown record can be traced to a valid actual set; clients and coaches can explain the comparison.

## T05 — Unify goal-specific progress and the weekly story

**Priority:** P1. **Depends on:** T04/C03/F07/U01.
**Create:** `mobile/app/(app)/progress.tsx`, `mobile/src/features/progress/ProgressScreen.tsx`, `mobile/src/features/progress/goal-progress.ts`, `mobile/src/features/progress/goal-progress.test.ts`.
**Modify:** `mobile/src/features/measurements/MeasurementProgress.tsx`, `mobile/src/features/measurements/observations.ts`, `mobile/src/features/home/ProgressSummary.tsx`, `mobile/src/features/home/weekly-recap.ts`, existing measurement/photo routes and Home entry.

- [ ] Define a goal-specific top panel with the coach: strength prioritizes comparable performance; body-composition goals prioritize observed measurement/weight trends with training context; consistency prioritizes agreed actions. Keep clients free to hide sensitive weight/photo emphasis.
- [ ] Connect exercise progression, measurements, photos and weekly coach interpretations in one discoverable destination. Keep detailed existing routes and deep links.
- [ ] Implement the spec's trend rule: a seven-day observed weight mean requires ≥3 valid distinct dates; comparisons require two qualifying, non-overlapping windows. Show sample count/date range and sparse-data explanations.
- [ ] Preserve missing/null observations, units and provenance. Avoid fat-loss/causality claims based on weight alone; a coach interpretation identifies its window and next action.
- [ ] Reuse private photo access and support side-by-side comparison with clear dates, consent and deletion behavior. Photos must not appear on lock screens, analytics or unrelated account caches.
- [ ] Test sparse/irregular data, changed goals, backfill, duplicate dates, out-of-order uploads, edited observations and long history. Provide text summaries equivalent to charts for assistive technology.

```ts
// New pure helper uses local DateKeys and already-validated observations.
expect(sevenDayMean([
  { date: '2026-09-21', value: 70 },
  { date: '2026-09-24', value: 71 },
], '2026-09-26')).toBeNull();
// Three distinct valid dates qualify; two entries on one date count once.
// Date windows are calendar-date windows, not "last seven recorded readings".
```

**Acceptance:** ≥10/12 formative clients can explain their next action and what the displayed trend does and does not show; no sparse-data screen fabricates certainty.

## Package verification

Run focused mobile/shared tests, root shared-domain contract tests and `supabase test db`. Verify existing v2 readers against new log/context fixtures. Complete the workout interruption Maestro flow and a physical-device workout with background/rest transitions. Attach exact source rows/fixtures for every displayed progression example, without real client data.

