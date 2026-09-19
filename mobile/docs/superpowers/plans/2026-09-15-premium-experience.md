# Dawnage Premium Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when delegation is authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an exceptional, coherent onboarding, Home, Check-in, and workout experience with dependable data recovery and measured native quality.

**Architecture:** Evolve the existing mobile app using its theme, Expo Router, query hooks, check-in model, and workout reducer. Extract orchestration from the large routes into focused feature controllers; keep presentation independent of persistence and share the same contracts with fallback views. Sequence three independently reviewable workstreams after shared foundations.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript, Expo Router 6, Reanimated 4.1, Gesture Handler 2.28, Gorhom Bottom Sheet 5, React Query 5, Supabase, AsyncStorage, Jest, React Native Testing Library, Maestro.

**Spec:** [Master design](../specs/2026-09-15-premium-experience-design.md). Read its [journey](../../redesign/2026-09-15/journey-specifications.md), [design-system](../../redesign/2026-09-15/design-system-and-motion.md), and [quality](../../redesign/2026-09-15/production-quality-and-rollout.md) companions before execution.

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

## 1. Delivery order and ownership

All paths below are relative to mobile unless explicitly called an external dependency. This package proposes future code changes; it does not claim they are implemented.

| Sequence | Workstream | Owner capability | Dependency / output |
| --- | --- | --- | --- |
| 0 | F01 evidence, visual direction, and contract checkpoint | Product designer + mobile engineer | Matched baseline, selected frames, approved behavior deltas |
| 1 | F02 shared UI; F03 date/profile contracts; F04 durable delivery | Mobile engineer(s) | Stable components, domain helpers, truthful persistence |
| 2A | [Setup and Today Brief](2026-09-15-premium-onboarding-home.md) | Mobile engineer + designer | O1–O3, H1–H3; app shell and Home |
| 2B | [Daily Record](2026-09-15-premium-checkin.md) | Mobile engineer + designer | C1–C4; safe check-in and receipt |
| 2C | [Workout Focus](2026-09-15-premium-workout.md) | Mobile engineer + designer | W1–W4; focused logger and recovery |
| 3 | F05 integrated validation and rollout | Engineering + design + QA + responsible backend owner | Native evidence, compatibility, privacy, rollback |

Home's draft-resume integration waits for C1/W1. Its static composition and independent query states can proceed earlier. Shared-file ownership stays with the foundation owner; concurrent workers should not independently edit theme, outbox, or root navigation.

A realistic **planning allowance is 8–12 calendar weeks** with two experienced React Native engineers, a product designer, and part-time QA, assuming usable test accounts/devices and timely decisions. This is not an estimate derived from measured velocity. Re-estimate after F01. External storage/web remediation, App Store review, and major dependency upgrades are outside that allowance.

Suggested allocation: 1–2 weeks evidence/design/contracts; 1–2 weeks foundations; 3–5 weeks journeys with staggered integration; 2–3 weeks real-device refinement and opt-in validation. Work overlaps; do not add those ranges as a fixed promise. A solo implementation needs a separately estimated schedule.

## 2. File ownership

| Area | Modify / retain | Create with a narrow responsibility |
| --- | --- | --- |
| Theme and primitives | src/theme/*; src/components/ui/{Text,Button,Input,Screen,Sheet,StickyActionBar}.tsx; useMotion in src/theme/ThemeProvider.tsx | src/components/ui/RecordStatus.tsx for shared save-state presentation |
| Dates and profile | src/lib/dates.ts; src/hooks/usePlans.ts; profile/assessment writers | src/lib/profile-data.ts for non-destructive field patches |
| Delivery | src/lib/asyncOutbox.ts; src/lib/outbox.ts; features/checkin/checkInOutbox.ts; their consumers/tests | src/lib/delivery-errors.ts for sanitized typed failure classification |
| Setup and Home | AuthContext, useOnboarding, onboarding, Home, today-action; retain useCoach/usePlanProvenance | features/onboarding/controller; features/home/data/selectors/components as the subsystem plan defines |
| Check-in | Retain field registry, validation, history, controls, single-scroll/wizard | features/checkin/model.ts and useCheckInEditor.ts; receipt/review presentation |
| Workout | Retain workoutReducer/workoutSave, parsers, persistence, draft and rest hooks | features/workout/useWorkoutSession.ts, workout-entry.ts; focused set/rest/overview composition |
| Verification | Existing tests, .maestro flows, docs/ui-validation-matrix.md | Sanitized fixture catalog and immutable evidence folder per build |

Extract only responsibilities changed by this work. Do not rewrite the whole app into a new state-management framework, styling framework, navigation library, or generic form engine.

## 3. Shared interfaces

These are proposed code contracts to establish before downstream work. Keep current public APIs where practical; update all consumers together when a union expands.

~~~ts
// src/lib/delivery-errors.ts
export type DeliveryFailure = {
  kind: 'transport' | 'temporary-server' | 'auth' |
    'permission' | 'validation' | 'conflict' | 'unknown';
  retryable: boolean;
  code: string; // allowlisted, sanitized; never a response body
};
export function classifyDeliveryFailure(error: unknown): DeliveryFailure;

// src/lib/asyncOutbox.ts
export type OutboxSaveResult<T> =
  | { status: 'synced'; value: T }
  | { status: 'offline'; value: null } // retained API name; UI says queued
  | { status: 'blocked'; value: null; failure: DeliveryFailure };

// src/components/ui/RecordStatus.tsx
export type RecordStatusValue =
  | 'saving-local' | 'draft' | 'queued' | 'synced' | 'blocked';
export type RecordStatusProps = {
  value: RecordStatusValue;
  updatedAt?: number;
  onRetry?: () => void;
};
// RecordStatus(props: RecordStatusProps): React.ReactElement

// src/lib/profile-data.ts
export function mergeProfileData(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown>;

// src/lib/dates.ts — preserve current helpers and add strict route validation
export function isDateKeyStrict(value: string): boolean;
export function calendarDaysEnding(dateKey: string, count: number): string[];
~~~

A domain save wraps this result without hiding blocked failures. Local-storage failure throws to the editor and never returns a queued/synced success. An unknown remote failure is blocked until classified, rather than silently described as offline.

## 4. F01 — Capture baseline, prove the direction, freeze contracts

**Read:** Existing route implementations, the master and all four supporting specifications, docs/ui-validation-matrix.md, and the approved root-level 2026-08-31 check-in specification.

**Create:** docs/redesign/evidence/baseline/manifest.md; docs/redesign/evidence/design/manifest.md; docs/redesign/evidence/contracts.md; src/testing/redesignFixtures.ts. Design frame exports belong under the design evidence folder. Use the existing development entry approach; do not add a public production fixture route.

**Consumes:** Existing source and fictional data. **Produces:** Versioned frame/fixture IDs and the settled contract decisions required by the following tasks.

- [ ] Record the actual starting commit and dirty files; isolate the implementation without overwriting existing work.
- [ ] Establish a runnable native preview and capture the Q01 state set. If the local simulator remains unavailable, use a preview build on test devices; record any unavailable state as unverified.
- [ ] Build named fictional fixtures for first use, populated history, sparse dates, missing plan, queued save, permanent error, existing edit, overnight draft, and legacy/V2 workout content.
- [ ] Export matched 390 × 844 dark/light frames for setup review, Today Brief, populated Daily Record, and active Workout Focus; add 320-point compact and 200% text variants.
- [ ] Prototype four interactions: ruler versus vertical scroll, invalid-field focus under keyboard, set-completion/rest, and leave/resume. Evaluate both themes and Reduced Motion.
- [ ] Run the eight-participant formative protocol from research-and-decisions.md. Record observations and unresolved decisions; do not invent results if recruitment is pending.
- [ ] Settle the precise behavior deltas: workout completion validation, RPE scale, any macro-bound enforcement difference, legacy negative/malformed value treatment, and next-session “logged” versus “completed” semantics. Keep current accepted behavior until a contract change is explicitly selected.
- [ ] Record web-reader fixture requirements and progress-photo remediation ownership as release dependencies. They need not prevent local design work.
- [ ] Review the selected frames against the current screenshots. Save the chosen frame IDs and explanations for major changes before broad shared-theme implementation.

**Gate:** Reviewable designs exist and contract changes are explicit. Research can continue during implementation, but unresolved primary-task confusion is not accepted as finished visual design.

## 5. F02 — Build the visual and interaction foundation

**Modify:** src/theme/colors.ts; src/theme/tokens.ts; src/theme/ThemeProvider.tsx; src/theme/layout.ts; src/components/ui/Text.tsx; Button.tsx; Input.tsx; Screen.tsx; StickyActionBar.tsx; Sheet.tsx; app/(app)/(tabs)/_layout.tsx.

**Create:** src/components/ui/RecordStatus.tsx; RecordStatus.test.tsx. Extend existing Screen.test.tsx and Sheet.test.tsx for meaningful geometry/focus behavior.

**Consumes:** Selected frames and exact tokens/motion values from the design-system specification. **Produces:** Shared readable controls and RecordStatusProps above.

- [ ] Add the proposed semantic fill/border tokens in both themes; apply system font on iOS and Inter on Android. Preserve the saved theme preference.
- [ ] Give primary actions a minimum 52-point visual height; keep a stable label while loading, set disabled/busy accessibility state, and suppress duplicate activation.
- [ ] Replace StickyActionBar's fixed-height assumption with measured occupied height. Expose its measured height to the owning Screen so scroll padding follows wrapping, safe-area insets, and keyboard state.
- [ ] Keep exactly one vertical scroll owner per screen archetype. Test a multiline error and a two-line action at 200% text with the keyboard visible.
- [ ] Preserve Gorhom keyboard behavior; implement focus entry/return, explicit dismissal rules, hardware-back behavior, and a visible equivalent for drag-to-dismiss.
- [ ] Add RecordStatus with explicit text/icon, accessible status announcement only on meaningful transitions, and optional retry. Match the shared copy matrix; never infer “coach read.”
- [ ] Keep five visible labeled tabs; change More's visible label to You while retaining the route. Add glass only behind supported functional chrome with solid fallback.
- [ ] Verify existing Plans, Logs, You, Profile, measurements, feedback, and assessment screens after shared tokens change.
- [ ] Run the relevant component tests and inspect all F01 proof frames on iOS/Android. Use manual visual checks for static styling; do not create snapshots that merely duplicate JSX.

Example behavioral test, with the existing test setup/providers:

~~~tsx
it('offers retry without describing a blocked save as synced', () => {
  const retry = jest.fn();
  const view = render(<RecordStatus value="blocked" onRetry={retry} />);
  expect(view.queryByText('Saved and synced')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Retry save' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
~~~

**Gate:** Shared geometry, focus, contrast, themes, and reduced-motion behavior work before journey-level polish. Native tabs remain an isolated optional experiment, not a dependency.

## 6. F03 — Correct local dates and preserve profile fields

**Modify:** src/lib/dates.ts; src/lib/dates.test.ts; app/(app)/profile.tsx; src/components/questionnaire/QuestionnaireWizard.tsx; relevant profile tests.

**Create:** src/lib/profile-data.ts; src/lib/profile-data.test.ts.

**Consumes:** Current users.profile_data JSON and device-local date convention. **Produces:** Shared mergeProfileData, isDateKeyStrict, calendarDaysEnding.

- [ ] Write tests for preserving unknown profile keys, explicit null, omitted undefined, and assessment/profile overlap before changing writers.
- [ ] Implement the shared patch rule below. On each write, fetch the latest row through the existing authenticated client; throw on fetch failure rather than merge against an invented empty object.
- [ ] Update Profile's profile_data writer with the shared rule and retain its q14/q56/q64/q33 assessment sync. Preserve the assessment's other answers and completed sections; a failed read must not trigger an empty replacement or duplicate insert. If the second write fails after the first succeeds, show partial-save recovery and retry only the unresolved work. Do not claim atomic cross-row or cross-device JSON merging.
- [ ] Add strict YYYY-MM-DD parsing with local component round-trip validation. Reject invalid dates and future editor routes explicitly; do not normalize 2026-02-30 into March.
- [ ] Implement calendar windows by stepping local calendar dates, not subtracting 86,400,000 milliseconds. Use it only in the new screen selectors unless existing consumer semantics are deliberately migrated.
- [ ] Run focused tests under Asia/Kolkata, America/Los_Angeles, and a DST-transition fixture.

~~~ts
export function mergeProfileData(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  return { ...(current ?? {}), ...defined };
}

it('retains onboarding and unknown keys when profile fields change', () => {
  expect(mergeProfileData(
    { primary_goal: 'performance', timezone: 'Asia/Kolkata', custom: 7 },
    { injuries: null, timezone: undefined },
  )).toEqual({
    primary_goal: 'performance', timezone: 'Asia/Kolkata',
    custom: 7, injuries: null,
  });
});

it('validates real calendar dates and builds calendar-day windows', () => {
  expect(isDateKeyStrict('2026-02-30')).toBe(false);
  expect(isDateKeyStrict('2024-02-29')).toBe(true);
  expect(calendarDaysEnding('2026-03-09', 3)).toEqual([
    '2026-03-07', '2026-03-08', '2026-03-09',
  ]);
});
~~~

Run from mobile:

~~~sh
npm test -- --runTestsByPath src/lib/profile-data.test.ts src/lib/dates.test.ts
TZ=America/Los_Angeles npm test -- --runTestsByPath src/lib/dates.test.ts
TZ=Asia/Kolkata npm test -- --runTestsByPath src/lib/dates.test.ts
~~~

**Gate:** No writer in scope drops unrelated profile fields; new date paths pass local-calendar fixtures.

## 7. F04 — Make delivery durable and truthful

**Modify:** src/lib/asyncOutbox.ts; asyncOutbox.test.ts; src/lib/outbox.ts; outbox.test.ts; src/features/checkin/checkInOutbox.ts; checkInOutbox.test.ts; src/hooks/useCheckInMutation.ts; all save-result consumers.

**Create:** src/lib/delivery-errors.ts; delivery-errors.test.ts.

**Consumes:** Existing queue payloads and persistence functions. **Produces:** Expanded OutboxSaveResult, typed failure classifier, readable blocked/queued records, durable replacement ordering.

- [ ] Add failing tests proving the replacement intent is stored before persist runs, even if persist never resolves.
- [ ] Add local queue metadata for monotonically increasing per-target revision and last sanitized failure. Read old items as revision zero. These fields never enter Supabase workout/check-in content.
- [ ] Serialize read-modify-write storage operations. Persist the replacement item first; only then attempt the network call. Remove a delivered item only if its revision is still current.
- [ ] Keep network calls out of the storage mutation lock. Coordinate one in-flight delivery per logical target, then deliver any newer revision. Unrelated draft writes must not wait for a slow request.
- [ ] Classify verified transport failures and retryable 429/5xx responses as queued. Auth may use the existing session refresh once; unresolved auth, permission, validation, conflicts, and unknown errors remain blocked with preserved intent.
- [ ] Stop flush from retrying permanent errors indefinitely. Expose explicit retry/reload/edit actions without throwing away the rejected payload.
- [ ] Surface storage read/parse failures; do not return an empty queue on corruption. Retain the original raw storage value until recovery is deliberate.
- [ ] Update both domain wrappers and every consumer of the status union together. A queued intent occupies its date on Home; blocked work remains visible for correction.
- [ ] Preserve account-scoped filtering for reads and delivery. Test account switch while a request is in flight.
- [ ] Verify storage failures before network, server success followed by local cleanup failure, two rapid replacements, and process restart with old queue format.

Core algorithm contract:

~~~text
save(target, input)
  revision := next local revision for target
  await storage.replaceTarget(target, input, revision)
  request per-target delivery
  if already delivering: preserve new intent; report queued for this revision
  else attempt persist(snapshot)
       on success: remove only the same revision; schedule any newer revision
       on retryable failure: retain snapshot as queued
       on permanent/unknown failure: retain snapshot as blocked
  never clear or label newer edits synced because an older snapshot succeeded
~~~

Focused test shape, using the existing AsyncStorage mock:

~~~ts
it('durably records intent before the first network call', async () => {
  const queue = createAsyncOutbox({
    storageKey: 'test-queue',
    belongsTo: (item: TestItem, userId: string) => item.userId === userId,
    sameTarget: (item: TestItem, input: TestInput) =>
      item.userId === input.userId && item.date === input.date,
    toItem: (input: TestInput): TestItem => ({
      ...input, id: 'record', queuedAt: 1,
    }),
  });
  const input: TestInput = { userId: 'fixture-user', date: '2026-09-15', value: 1 };
  const persist = jest.fn(async () => {
    const raw = await AsyncStorage.getItem('test-queue');
    expect(JSON.parse(raw ?? '[]')).toEqual([
      expect.objectContaining(input),
    ]);
    return 'server-id';
  });
  expect(await queue.save(input, persist)).toEqual({
    status: 'synced', value: 'server-id',
  });
});
type TestInput = { userId: string; date: string; value: number };
type TestItem = TestInput & { id: string; queuedAt: number };
~~~

Extend existing tests with actual Supabase error fixtures, not only Error('offline'). A generic Error is insufficient evidence of connectivity loss.

**Gate:** Controlled interruption tests protect acknowledged intent and errors are classified honestly. Document that retries remain at-least-once and workout cross-device duplication needs a server contract.

## 8. F05 — Integrate, measure, and release deliberately

**Modify:** .maestro/onboarding.yaml; .maestro/home-checkin.yaml; .maestro/workout-interruption.yaml; docs/ui-validation-matrix.md; existing app build configuration only where necessary.

**Create:** .maestro/checkin-backfill.yaml; .maestro/sync-recovery.yaml; docs/redesign/evidence/<build-id>/manifest.md; src/lib/experience-events.ts and its allowlist test if observability is activated.

**Consumes:** All subsystem gates. **Produces:** Immutable native evidence and release decision for an actual build.

- [ ] Run typecheck, lint, Jest, verify:ui, installed Expo dependency validation, and bundle/export verification. Record command, commit, outcome, and any environment issue.
- [ ] Run Q02 recovery scenarios and Q04 accessibility tasks on physical iOS/Android. Check every exit path, keyboard, large text, account switch, offline save, and later sync.
- [ ] Compare matched before/after frames and measured task outcomes against the selected design. Repeat formative tasks with identical data; publish exact participant counts and limitations.
- [ ] Profile the Q05 fixtures and budgets in release-equivalent builds. Investigate full-logger rerenders, slow charts, memory growth, and missed touch feedback.
- [ ] Validate V2/legacy workout fixtures in actual supported coach-web readers and editors. Record a separately scoped web fix if needed; close this gate only with evidence.
- [ ] Close the progress-photo privacy dependency through the responsible backend/storage workstream and authorization tests; do not mark it solved by UI changes.
- [ ] If enabling telemetry, implement a strict allowlist adapter with no raw health/input/network-body data. Confirm provider configuration and retention before activation; keep replay and screenshots disabled.
- [ ] Rehearse presentation rollback with existing drafts and queued work. Record whether rollback uses an installed build or an explicitly configured update channel; build-time flags are not remote controls.
- [ ] Run the opt-in pilot and 7–14 day diary phase. Fix P0/P1 issues and repeat affected evidence.
- [ ] Obtain named design, engineering, accessibility, backend-compatibility, and privacy sign-off on the immutable build record.

**Gate:** The evidence, not a completed checklist alone, supports release.

## 9. Review and change discipline

Each task ends in a reviewable increment: targeted behavioral checks, relevant native states, and a focused commit containing only that task's files. Use explicit paths when staging; do not include pre-existing user changes. Changes to contracts or screen hierarchy update the spec and fixture manifest in the same increment.

Do not repeatedly run the full suite after documentation or static-token-only changes. Run focused checks first, then complete the integrated suite at F05 and after changes that justify repetition.

## 10. Coverage and completion

| Specification | Implementing work |
| --- | --- |
| Product direction, alternatives, measured craft | F01, F02, F05 |
| Apple hierarchy/materials/motion/accessibility | F02 and native gates in every subsystem |
| J01–J05 shared identity/state/privacy | F03, F04, C1, W1, F05 |
| O01–O07 and O-A1–O-A7 | O1–O3 |
| H01–H05 and H-A1–H-A6 | H1–H3 |
| C01–C06 and C-A1–C-A8 | C1–C4 |
| W01–W07 and W-A1–W-A10 | W1–W4 |
| Q01–Q09 | F01, F04, F05 plus subsystem gates |

The core redesign is complete only when all four journeys work, supporting routes remain coherent, and the native/recovery/accessibility/compatibility evidence is recorded. P2 refinements and separately scoped native/backend features are not silently required to call the core release complete.
