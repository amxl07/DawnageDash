# Dawnage Setup and Today Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when delegation is authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make account access, setup, and every return to Home feel personal, clear, and dependable.

**Architecture:** Keep existing routes and Supabase contracts. Move setup persistence into a small feature controller and compose Home from independently available query sections plus pure, tested selectors. Preserve existing coaching and plan-provenance hooks.

**Tech Stack:** Installed Expo SDK 54 family, Expo Router, React Query, Supabase, AsyncStorage, existing shared UI and motion primitives.

**Spec:** [Master](../specs/2026-09-15-premium-experience-design.md), [journeys O/H](../../redesign/2026-09-15/journey-specifications.md), [roadmap and foundations](2026-09-15-premium-experience.md).

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

Complete F01–F03 before broad UI work. H2's queue states require F04; final resume integration requires C1/W1. This work owns auth/setup routes and Home composition; coordinate any edits to shared hooks with their owner.

| Existing file | Change |
| --- | --- |
| src/contexts/AuthContext.tsx | Expose unresolved role and recovery state accurately |
| app/(app)/_layout.tsx | Render explicit loading/error/role gates |
| src/hooks/useOnboarding.ts | Preserve query failure and expose completion mutation state |
| app/(auth)/login.tsx; reset-password.tsx | Apply account-access frames and field/focus states |
| app/(app)/onboarding.tsx | Thin three-stage setup route |
| src/hooks/usePlans.ts | Keep canonical full UserProfile query |
| app/(app)/(tabs)/index.tsx | Thin Today Brief composition |
| src/hooks/useDashboardData.ts | Retain legacy consumers; split/adapt new Home reads |
| src/lib/today-action.ts | Extend existing action priority without breaking existing cases |
| src/lib/reminders.ts | Accurate copy and device-local schedule |
| app/(app)/(tabs)/plans.tsx | Acknowledge provenance only after actual plan presentation |

Create src/features/onboarding/useSetupController.ts and its tests; src/features/onboarding/SetupStage.tsx; src/features/home/useHomeData.ts; selectors.ts; selectors.test.ts; TodayBrief.tsx; WeekRecordStrip.tsx; NextSessionCard.tsx. Keep route-level navigation at the route boundary; presentational cards receive values and callbacks.

## O1 — Account and routing states

**Modify:** AuthContext.tsx; app/(app)/_layout.tsx; useOnboarding.ts; auth routes. **Create tests:** src/contexts/AuthContext.test.tsx; src/hooks/useOnboarding.test.ts; src/screens/__tests__/auth-routing.test.tsx, adapted to existing test helpers.

**Consumes:** Current auth session, role, passwordRecoveryPending, persisted onboarding_step. **Produces:** Explicit loading/failed/resolved routing states; retry and sign-out remain available.

- [ ] Write a test where the onboarding query rejects: the route must show recovery UI instead of treating the user as step zero.
- [ ] Preserve existing client/coach/admin boundaries. Give unresolved role lookup an explicit retry/sign-out screen; do not infer client access from an unavailable role.
- [ ] Retain signup metadata keys, existing validation, and the two signup stages. Display entered values through recoverable failures.
- [ ] Implement verification, existing-account, invalid-credentials, password visibility, disabled/busy submit, and password-reset states from O01/O02.
- [ ] Verify password recovery deep links take priority over normal onboarding/Home routing.
- [ ] Apply F02 input/keyboard/focus patterns; announce field-specific errors after submit without narrating each keystroke.
- [ ] Run auth/routing tests and the account portion of .maestro/onboarding.yaml.

Routing rule to encode and test:

~~~text
auth loading -> loading
password recovery pending -> reset-password route
no session -> sign-in
role lookup unavailable -> role recovery
role coach/admin -> existing client-only gate
client + onboarding query unavailable -> setup recovery
client + step < 3 -> setup
client + step >= 3 -> tabs
~~~

**Gate:** O-A1, O-A2, and O-A6, plus role boundaries, work without incorrect route flashes.

## O2 — Resumable three-stage setup

**Create:** src/features/onboarding/useSetupController.ts; useSetupController.test.ts; SetupStage.tsx.
**Modify:** onboarding.tsx; useOnboarding.ts; existing VideoStep and TimezonePicker only as required.

**Consumes:** Canonical UserProfile, mergeProfileData, onboarding milestone.
**Produces:**

~~~ts
export type PrimaryGoal = 'fat_loss' | 'muscle_gain' | 'performance' | 'consistency';
export type SetupValues = { primaryGoal: PrimaryGoal | null; timezone: string };
export type SetupStageIndex = 0 | 1 | 2;
export type SetupController = {
  stage: SetupStageIndex;
  values: SetupValues;
  isSaving: boolean;
  error: string | null;
  setGoal: (goal: PrimaryGoal) => void;
  setTimezone: (timezone: string) => void;
  back: () => void;
  continue: () => Promise<boolean>;
};
export function useSetupController(): SetupController;
~~~

- [ ] Characterize the existing four goal values and timezone keys from onboarding.tsx; retain their stored representation.
- [ ] Test hydration of saved goal/timezone, failed saves, repeated taps, and Back after a successful milestone.
- [ ] Implement Back as local presentation only. Continue persists the selected stage values and a non-decreasing milestone before showing the next stage.
- [ ] On final Continue, fetch the latest profile row and update merged profile_data plus onboarding_step: 3 in one users-row request. Update both query caches only after acknowledgment.
- [ ] If persistence fails, keep values and the same stage, show a useful retry, and keep navigation responsive.
- [ ] Render full-width goal rows, a concise coaching-rhythm explanation, optional video, timezone choice, and editable final review using selected frames.
- [ ] Keep video optional and prevent background playback after stage/route exit.
- [ ] Run the controller tests and native re-entry flow after backgrounding or reopening setup.

Critical behavior assertion, in the hook's fixture harness:

~~~ts
// Given a user persisted at milestone 2 and hydrated on review:
act(() => result.current.back());
expect(result.current.stage).toBe(1);
expect(updateUserRow).not.toHaveBeenCalled();
// Continuing forwards may retain 2; only final acknowledged completion writes 3.
~~~

Here result is renderHook(useSetupController)'s result; updateUserRow is the mocked users update boundary in that test. Assert the actual payload and invalidated keys as well as the local stage.

**Gate:** O-A1, O-A3, and O-A5. A failed final save never appears completed.

## O3 — Assessment continuity and contextual reminders

**Modify:** src/components/questionnaire/QuestionnaireWizard.tsx; app/(app)/profile.tsx; src/lib/reminders.ts; relevant assessment/settings entry.
**Tests:** Extend src/screens/__tests__/profile.test.tsx; create src/components/questionnaire/QuestionnaireWizard.test.tsx for resume/preservation behavior.

**Consumes:** Existing 87-question, ten-section assessment and reminder implementation.
**Produces:** Optional resumable assessment entry and accurate reminder permission states, without changing schema or mandatory setup length.

- [ ] Verify all question IDs, required fields, completed_sections, serialized answers, and profile overlap mappings remain compatible.
- [ ] Preserve Profile's existing four-answer synchronization using F03; test that primary_goal/timezone, other assessment answers, and completed sections survive.
- [ ] Present actual completed-section progress on Profile and quiet Home entry. Do not claim that partial answers complete onboarding or the assessment.
- [ ] Add the section overview and editable summary states from O07. Guard controlled exit with the existing server Save draft or deliberate discard; offline/failed save retains the editor. Resume exact acknowledged answers and section identity, without claiming that memory-only typing survives process termination.
- [ ] Offer reminder setup after a successful check-in or deliberate settings action; explain purpose before the system prompt.
- [ ] Distinguish permission denied, unavailable, and scheduled. Link to system settings when appropriate.
- [ ] Keep notification scheduling aligned with actual device-local behavior and remove unsupported promises such as automatic prefill or guaranteed sub-minute completion.
- [ ] Verify assessment resume and reminder settings on both platforms without requiring permission for basic app use.

**Gate:** O-A4 and O-A7; all 87 questions and existing answers remain accessible.

## H1 — Build truthful, independent Home data

**Create:** features/home/useHomeData.ts; selectors.ts; selectors.test.ts.
**Modify:** useDashboardData.ts only to extract reusable reads; Home's inline profile query; today-action.ts and today-action.test.ts.

**Consumes:** useUserProfile, check-ins, measurements, assigned plan, useCoach, usePlanProvenance. **Produces:** Independent query sections and selectors; unknown data remains distinct from empty data.

~~~ts
export type HomeSection<T> =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'ready'; data: T; stale: boolean; retry: () => void };

export type RecordDay = {
  date: string;
  state: 'absent' | 'draft' | 'queued' | 'synced' | 'blocked';
};
export type HomeData = {
  profile: HomeSection<UserProfile | null>;
  checkIns: HomeSection<DailyCheckIn[]>;
  measurements: HomeSection<BodyMeasurement[]>;
  plan: HomeSection<{ days: PlanDay[]; source: 'user' | 'template' | 'none' }>;
  coach: HomeSection<CoachLookup>;
};
export function useHomeData(): HomeData;
export function buildWeekRecords(
  dates: string[],
  records: RecordDay[],
): RecordDay[];
export function observedMean(values: Array<number | null>): {
  value: number | null;
  samples: number;
};
~~~

Import UserProfile/PlanDay from usePlans, DailyCheckIn/BodyMeasurement from types/db, and CoachLookup from useCoach. Extend HomeData with the H2 account-scoped draft/queue sections when those APIs land; keep their loading/error states explicit rather than defaulting to null.

- [ ] Remove the partial UserProfile query sharing the full-profile key; use the canonical hook and a local selector.
- [ ] Keep check-in, measurement, plan, and coach errors independent. Cached sections stay visible with stale status when refresh fails.
- [ ] Build seven calendar-day records using F03, not the last seven rows. Deduplicate one display state per date; queued/blocked overlays have explicit precedence.
- [ ] Compute means only from finite reported values; show sample coverage. Keep missing values distinct from zero.
- [ ] Distinguish reported workout status in check-ins from saved workout logs and from confirmed completed sessions.
- [ ] Show next assigned session only from actual assignment. Template fallback must be labeled; no scheduled-day claim without schedule data.
- [ ] Remove hardcoded numeric goals from the new Home unless an authoritative structured target is available.
- [ ] Keep legacy calculations intact for other consumers until intentionally migrated.

~~~ts
export function observedMean(values: Array<number | null>) {
  const present = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return {
    value: present.length
      ? present.reduce((total, value) => total + value, 0) / present.length
      : null,
    samples: present.length,
  };
}

it('distinguishes unreported from a reported zero', () => {
  expect(observedMean([null, null])).toEqual({ value: null, samples: 0 });
  expect(observedMean([0, null, 4])).toEqual({ value: 2, samples: 2 });
});
~~~

**Gate:** H-A3, H-A4, H-A6; a measurements failure does not block an available daily action.

## H2 — Coordinate primary action, drafts, and plan provenance

**Modify:** src/lib/today-action.ts; today-action.test.ts; features/home/useHomeData.ts.
**Consumes:** C1 findLatestCheckInDraft, W1 findLatestWorkoutDraft, F04 queue reads, confirmed query availability.
**Produces:** A deterministic action with explicit resume date/log identity.

Extend the existing input and TodayActionKind, preserving existing callers:

~~~ts
// Add optional fields to resolveTodayAction's existing input:
workoutDraft?: { date: string; logId: string | null } | null;
checkInDraft?: { date: string } | null;
queuedCheckInToday?: boolean;
// Add 'resume-workout' | 'resume-checkin' to TodayActionKind.
// Use route objects containing the original draft date/logId on resume.
~~~

- [ ] Read resumable drafts on Home focus and app foreground, including older reporting dates still inside retention; do not only inspect today's key.
- [ ] Guard reads with the current account identity; never display a completed request from the previous account.
- [ ] Resolve H02 priority: workout draft, check-in draft, absent daily record, unseen plan update, next assigned session, saved-day/history.
- [ ] Treat queued daily work as present for action selection. Show blocked work with a correction action, rather than inviting duplicate submission.
- [ ] Do not resolve an “absent” action while the authoritative relevant query is still unknown; show the available subset or a loading/retry action.
- [ ] Mark plan provenance seen only after the populated Plans view is presented. Home exposure alone does not acknowledge it.
- [ ] Update tests for every branch, especially simultaneous drafts, queued today, yesterday's workout, and partial query failure.

~~~ts
it('resumes an interrupted workout before prompting for a new check-in', () => {
  const action = resolveTodayAction({
    checkedInToday: false, hasWorkoutPlan: true, planChanged: true,
    workoutDraft: { date: '2026-09-14', logId: null },
  });
  expect(action.kind).toBe('resume-workout');
  expect(action.route).toEqual(expect.objectContaining({
    pathname: '/(app)/logger',
    params: expect.objectContaining({ date: '2026-09-14' }),
  }));
});
~~~

**Gate:** H-A1, H-A2, and H-A5. Home resumes the intended work across midnight.

## H3 — Compose and validate Today Brief

**Create:** features/home/TodayBrief.tsx; WeekRecordStrip.tsx; NextSessionCard.tsx.
**Modify:** app/(app)/(tabs)/index.tsx; src/screens/__tests__/tabs/index.test.tsx; .maestro/home-checkin.yaml.
**Consumes:** H1/H2 data and action; F02 components. **Produces:** The selected Today Brief layout and all H05 states.

- [ ] Build date/greeting/coach identity, one next action, current record/week, next session, and at most two factual observations in that order.
- [ ] Use coach assigned/unassigned/unavailable states from the actual RPC; do not invent reply status or chat.
- [ ] Make the week strip accessible with full date and record state; use a visible selected-day treatment and calendar affordance for older records.
- [ ] Apply editorial spacing rather than wrapping every row in a card. Keep only meaningful independently actionable surfaces enclosed.
- [ ] Add first-use, sparse, loading, empty, queued, blocked, stale, and partial-failure compositions with stable geometry.
- [ ] Provide accessible text summaries and dates for charts; P2 inspection uses selection and dated tooltips, with a non-gesture history alternative.
- [ ] Validate the Home → check-in → receipt → Home loop and Home → workout draft resume loop with real keyboard/navigation behavior.
- [ ] Capture matched frames and test large text, both themes, reduced motion, and screen-reader ordering.

**Gate:** H-A1–H-A6, O-A1–O-A7, Q01/Q04. Home clearly explains the next useful action and current save state. Commit only reviewed files from this workstream.
