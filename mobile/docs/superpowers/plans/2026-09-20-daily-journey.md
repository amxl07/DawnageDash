# Daily Journey Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for focused implementation and independent review. The user already approved the design; continue without another approval pause.

**Goal:** A cohesive Home → check-in → training → completion experience that stays clear during recovery and offline delivery.

**Architecture:** Preserve existing query/cache, editor, outbox and workout-session logic. Compose reusable presentation components and reuse existing history/nutrition screens in the new navigation. Work in the current feature checkout, preserving all pre-task changes.

**Tech Stack:** Expo 57, React Native, React Query, Reanimated, existing theme and accessible UI controls.

**Spec:** `../specs/2026-09-20-daily-journey-design.md`.

## Global constraints

No Supabase configuration/schema/project changes, live auth/data writes, dependency additions, push or deployment. Do not alter the first-check-in program rule. No invented schedule, coach feedback or metrics. Keep record identities, draft/outbox recovery, legacy links, scalable text, keyboard access and reduced motion. Existing uncommitted work is part of the baseline, not disposable.

## Task 1 — Training and Nutrition (agent)

Own `app/(app)/(tabs)/{plans,logs,nutrition,_layout}.tsx`, new `src/features/training/`, appropriate extracted nutrition presentation and focused training/navigation tests. Reuse current history and meal data fetching. Training uses Plan/History controls; old logs route must still open history. Nutrition stays a clear tab. Preserve exit guards and plan provenance. Export history cards for existing tests if required by compatibility. Test assigned/template/error states, history navigation and record ownership. Do not edit Home, check-in, logger or shared theme.

- [x] Preserve baseline contracts; add focused regression tests for new navigation and legacy aliases.
- [x] Implement cohesive Training/History and separate Nutrition without nested scrolling or duplicated fetching.
- [x] Run scoped tests and report touched files/integration details.

## Task 2 — Completion screens (agent)

Own `src/features/checkin/components/CheckInReceipt.tsx`, `src/components/logger/WorkoutSummary.tsx`, new reusable completion presentation under `src/features/completion/`, and their focused tests. Root wires contextual receipt action. `CheckInReceipt` accepts optional `nextAction?: {label:string; detail?:string; onPress:()=>void}`; defaults to primary Home action. `WorkoutSummary` retains its current public contract and save callbacks. Keep old essential status copy/test IDs or update tests where behavior is intentionally improved. Respect reduced motion and do not add duplicate haptics.

- [x] Test queued/synced/blocked/review states and callback behavior.
- [x] Implement coherent visual hierarchy and honest metrics/statuses.
- [x] Run scoped tests and report integration requirements.

## Task 3 — Home and receipt integration (root)

Own `app/(app)/(tabs)/index.tsx`, `src/features/home/` presentation/selectors/tests, `app/(app)/(tabs)/check-in.tsx` and related screen tests. Preserve the recovery-first action selector. Compact the header, emphasize one action, move training ahead of progress, make secondary information deliberate, and keep weekly draft/retry recovery visible. Contextual receipt action opens Training only for confirmed current assigned plans and safe current-day synced state; otherwise Home. Use a pure selector and scoped query inputs so no fake session schedule or lost recovery is introduced.

- [x] Add regression tests for section priority, recovery reachability and receipt action eligibility.
- [x] Implement Home composition and contextual next action.
- [x] Integrate new Training route semantics and update only necessary UI/Maestro contracts.

## Task 4 — Review and verification (root + reviewer)

- [x] Independent source review against the saved pre-task snapshot; fix concrete findings.
- [x] Focused tests, TypeScript, lint and UI contracts; no blanket test additions for cosmetic changes.
- [x] Attempt a populated fixture preview in both themes; inspect accepted images. Report device/capture limitations if tools cannot verify them.
- [x] Document final results and the device/user-session acceptance checklist.

## Decisions and progress

Approval: user's “approved Implement it” applies to the preceding recommendations. The existing app is the visual/code target. No additional palette selection is needed.
Ruling: retain current feature checkout because the requested work builds directly on reviewed uncommitted changes; source snapshot preserves reviewability.
Ruling: use five tabs with Training Plan/History and a separate Nutrition destination; preserve logs as a compatibility route. This removes ambiguous parallel workout entry without hiding nutrition.
Ruling: check-in completion links to Training rather than inventing a scheduled workout. Home remains the recovery-aware fallback.

Preflight interface scan: Task 1 produces plans/history and nutrition routes consumed by Home and completion; preserve existing plans pathname. Task 2 adds optional nextAction consumed only by root's check-in route. Tasks 1/2/3 own separate source files. Shared theme/mutation contracts stay unchanged. Each task's tests cover its own public behavior and global constraints.

Final implementation and evidence: [daily journey review](../../review/2026-09-20-daily-journey.md). All implementation/review tasks are complete. The attempted browser capture could not start Chrome, and no native simulator was available; device/participant validation is explicitly left as a follow-up protocol, not claimed as complete.
