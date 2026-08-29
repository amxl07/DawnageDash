# Dawnage Home and Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home immediately communicate today's coaching priority and make daily Check In fast, recoverable, accessible, and reliable on compact devices.

**Architecture:** Keep server access in the existing hooks and extract only deterministic presentation decisions into pure utilities. Home composes small cards from those derived states; Check In retains its four-step flow while gaining explicit step validation, focus management, and visible local-save state.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, Expo Router 6, React Query 5, Reanimated 4.1, Gorhom Bottom Sheet 5, AsyncStorage, Jest Expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Global Constraints

- Complete `2026-08-29-dawnage-ui-foundations-motion.md` first.
- Keep the five-tab navigation and current Dawnage light/dark themes.
- Keep every interactive target at least 44x44pt.
- Compact means width below 360dp or font scale at/above 1.30.
- Do not make heatmap cells individually interactive.
- Preserve entered check-in values across navigation, failure, and retry.
- Do not introduce new database fields or fabricate coach data.
- Motion must use the shared tokens and collapse under Reduced Motion.
- Preserve the current dirty working tree; stage only task-owned paths.
- Run `npm`/`npx` commands from `mobile/`; run `git` commands from the repository root.

---

### Task 1: Make the week model represent today independently of completion

**Files:**
- Modify: `mobile/src/lib/streak.ts`
- Create: `mobile/src/lib/streak.test.ts`
- Modify: `mobile/src/components/dashboard/WeekStrip.tsx`
- Create: `mobile/src/components/dashboard/WeekStrip.test.tsx`

**Interfaces:**
- Consumes: `ProcessedCheckIn[]` and an optional deterministic date.
- Produces: `buildWeekStrip(processed, today?)` and `WeekDay.isToday`.

- [ ] **Step 1: Write failing date-model tests**

```ts
it('marks today even when today is already complete', () => {
  const today = new Date(2026, 7, 26, 12);
  const processed = [{ date: today, dateString: '2026-08-26', dayNumber: 1, status: 'done' as const }];
  const result = buildWeekStrip(processed, today);
  expect(result.find((day) => day.dateString === '2026-08-26')).toMatchObject({
    isToday: true,
    state: 'done',
  });
});
```

Add coverage for a pending today, a past missed day, and a future disabled day.

- [ ] **Step 2: Run the model test to verify failure**

```bash
npm test -- src/lib/streak.test.ts
```

Expected: FAIL because `buildWeekStrip` has no date parameter and `WeekDay` has no `isToday` field.

- [ ] **Step 3: Implement the deterministic model**

Change the signature and return type:

```ts
export type WeekDay = {
  date: Date;
  dateString: string;
  initial: string;
  isToday: boolean;
  state: 'done' | 'missed' | 'today-pending' | 'future';
  workoutStatus: string | null;
};

export function buildWeekStrip(processed: ProcessedCheckIn[], today = new Date()): WeekDay[] {
  // Derive todayStr and weekStart from the injected date.
}
```

- [ ] **Step 4: Make the strip compact-safe**

Replace the fixed `space-between` row with a horizontal `ScrollView`:

```tsx
<ScrollView
  ref={scrollRef}
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: spacing.sm }}
  accessibilityRole="adjustable"
  accessibilityLabel="This week"
>
  {days.map((day) => <DayButton key={day.dateString} day={day} />)}
</ScrollView>
```

Each day remains 44x44pt, uses `day.isToday` for selected state even when completed, and future days remain disabled. On mount, scroll the current day into view with `scrollTo({ x: Math.max(0, todayIndex * 52 - 104), animated: false })`.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/lib/streak.test.ts src/components/dashboard/WeekStrip.test.tsx
npm run typecheck
git add mobile/src/lib/streak.ts mobile/src/lib/streak.test.ts mobile/src/components/dashboard/WeekStrip.tsx mobile/src/components/dashboard/WeekStrip.test.tsx
git diff --cached --check
git commit -m "fix(mobile): make the week strip compact-safe"
```

### Task 2: Replace tiny heatmap actions with one accessible history action

**Files:**
- Create: `mobile/src/lib/consistency.ts`
- Create: `mobile/src/lib/consistency.test.ts`
- Modify: `mobile/src/components/dashboard/ConsistencyGrid.tsx`
- Create: `mobile/src/components/dashboard/CheckInHistorySheet.tsx`
- Create: `mobile/src/components/dashboard/ConsistencyGrid.test.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `ProcessedCheckIn[]`, `onSelectDay(dateString)`, and the shared `Sheet`.
- Produces: `buildConsistencyHistory(processed, today?, weekCount?)`, `ConsistencyGrid({ processed, onOpenHistory })`, and `CheckInHistorySheet({ visible, processed, onClose, onSelectDay })`.

- [ ] **Step 1: Write failing pure-data tests**

```ts
it('builds newest-first accessible history without future dates', () => {
  const result = buildConsistencyHistory(processed, new Date(2026, 7, 29), 8);
  expect(result[0].dateString).toBe('2026-08-29');
  expect(result.every((item) => item.dateString <= '2026-08-29')).toBe(true);
  expect(result[0]).toEqual(expect.objectContaining({ level: expect.any(Number), label: expect.any(String) }));
});
```

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/lib/consistency.test.ts
```

Expected: FAIL because the consistency builder does not exist.

- [ ] **Step 3: Extract consistency data construction**

Define:

```ts
export type ConsistencyLevel = 0 | 1 | 2 | 3 | 4;
export type ConsistencyDay = {
  date: Date;
  dateString: string;
  level: ConsistencyLevel;
  inRange: boolean;
  label: string;
};

export function buildConsistencyHistory(
  processed: ProcessedCheckIn[],
  today = new Date(),
  weekCount = 21,
): ConsistencyDay[];
```

Keep status-to-level mapping identical to the current component and make the output independent of screen width.

- [ ] **Step 4: Make the visual grid noninteractive**

Remove `Pressable`, `onPress`, and individual accessibility nodes from `GridCell`. Wrap the card content in one `Pressable` with:

```tsx
accessibilityRole="button"
accessibilityLabel={`Consistency: ${tracked} of ${elapsed} days, ${pct} percent. Open check-in history.`}
style={{ minHeight: 44 }}
```

Replace the diagonal per-cell spring with one first-mount opacity/color reveal capped at `motion.duration.enter`; start any scale at `0.92`, never `0` or `0.4`.

- [ ] **Step 5: Add the accessible history sheet**

`CheckInHistorySheet` uses `SheetFlatList` with stable `dateString` keys. Each row is at least 44pt, states the full date and check-in/workout status, disables future dates, and calls `onSelectDay(dateString)` before closing.

```tsx
<SheetFlatList
  data={history}
  keyExtractor={(item) => item.dateString}
  renderItem={({ item }) => (
    <ListRow title={format(item.date, 'EEEE d MMMM')} subtitle={item.label}
      disabled={!item.inRange} onPress={() => select(item.dateString)} />
  )}
/>
```

Use the dashboard screen to own `historyOpen` and route selection to Check In after closing the sheet.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- src/lib/consistency.test.ts src/components/dashboard/ConsistencyGrid.test.tsx
npm run typecheck
git add mobile/src/lib/consistency.ts mobile/src/lib/consistency.test.ts mobile/src/components/dashboard/ConsistencyGrid.tsx mobile/src/components/dashboard/CheckInHistorySheet.tsx mobile/src/components/dashboard/ConsistencyGrid.test.tsx 'mobile/app/(app)/(tabs)/index.tsx'
git diff --cached --check
git commit -m "fix(mobile): make consistency history accessible"
```

### Task 3: Define and render one daily priority

**Files:**
- Create: `mobile/src/lib/today-action.ts`
- Create: `mobile/src/lib/today-action.test.ts`
- Create: `mobile/src/components/dashboard/TodayActionCard.tsx`
- Create: `mobile/src/components/dashboard/TodayActionCard.test.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `{ checkedInToday, hasWorkoutPlan, planChanged }`.
- Produces: `resolveTodayAction(input): TodayAction` and `TodayActionCard({ action, onPress })`.

- [ ] **Step 1: Write the failing priority tests**

```ts
it.each([
  [{ checkedInToday: false, hasWorkoutPlan: true, planChanged: true }, 'check-in'],
  [{ checkedInToday: true, hasWorkoutPlan: true, planChanged: true }, 'review-update'],
  [{ checkedInToday: true, hasWorkoutPlan: true, planChanged: false }, 'open-plan'],
  [{ checkedInToday: true, hasWorkoutPlan: false, planChanged: false }, 'review-progress'],
] as const)('chooses one primary action', (input, kind) => {
  expect(resolveTodayAction(input).kind).toBe(kind);
});
```

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/lib/today-action.test.ts
```

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the pure priority resolver**

```ts
export type TodayActionKind = 'check-in' | 'review-update' | 'open-plan' | 'review-progress';
export type TodayAction = { kind: TodayActionKind; title: string; detail: string; route: string };

export function resolveTodayAction(input: {
  checkedInToday: boolean;
  hasWorkoutPlan: boolean;
  planChanged: boolean;
}): TodayAction {
  if (!input.checkedInToday) return { kind: 'check-in', title: 'Complete today’s check-in', detail: 'A few minutes keeps your coach up to date.', route: '/(app)/(tabs)/check-in' };
  if (input.planChanged) return { kind: 'review-update', title: 'Review your updated plan', detail: 'Your coach changed your training plan.', route: '/(app)/(tabs)/plans' };
  if (input.hasWorkoutPlan) return { kind: 'open-plan', title: 'Open your training plan', detail: 'Choose today’s session when you are ready.', route: '/(app)/(tabs)/plans' };
  return { kind: 'review-progress', title: 'Review your progress', detail: 'See the patterns from your latest check-ins.', route: '/(app)/measurements' };
}
```

- [ ] **Step 4: Build and place the action card**

Render the localized full date beneath the greeting, then place the card directly after the greeting/date/coach-identity block and before the streak. It has one primary button, an accessible summary, and no nested press targets. Remove the duplicate plan-update card because `review-update` now occupies the primary action. The coach identity itself is wired in Plan 4 after the authorized lookup state is normalized.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/lib/today-action.test.ts src/components/dashboard/TodayActionCard.test.tsx
npm run typecheck
git add mobile/src/lib/today-action.ts mobile/src/lib/today-action.test.ts mobile/src/components/dashboard/TodayActionCard.tsx mobile/src/components/dashboard/TodayActionCard.test.tsx 'mobile/app/(app)/(tabs)/index.tsx'
git diff --cached --check
git commit -m "feat(mobile): prioritize today's coaching action"
```

### Task 4: Make dashboard metrics responsive and progressively disclosed

**Files:**
- Modify: `mobile/src/components/dashboard/MetricCard.tsx`
- Create: `mobile/src/components/dashboard/MetricCard.test.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`
- Modify: `mobile/app/(app)/(tabs)/logs.tsx`

**Interfaces:**
- Consumes: `AdaptiveGrid` from the foundations plan.
- Produces: metric cards that wrap text and fill their adaptive grid cell.

- [ ] **Step 1: Write failing compact-layout tests**

Render the dashboard metric section with compact responsive state and assert Weight and Workouts are in separate grid wrappers. Render `MetricCard` with a long caption and assert the label/caption do not specify `numberOfLines={1}`.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/dashboard/MetricCard.test.tsx
```

- [ ] **Step 3: Migrate metric rows**

Replace each hard-coded two-card row on Home, Logs, Measurements, and workout summary with:

```tsx
<AdaptiveGrid>
  <MetricCard ... />
  <MetricCard ... />
</AdaptiveGrid>
```

Remove `numberOfLines={1}` from required labels/captions. Keep charts and weekly targets behind the existing “Insights & trends” disclosure. Animate the chevron with a 160ms rotation only when motion is enabled; the content itself may use a 200ms opacity entrance, without height animation.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- src/components/dashboard/MetricCard.test.tsx
npm run typecheck
git add mobile/src/components/dashboard/MetricCard.tsx mobile/src/components/dashboard/MetricCard.test.tsx 'mobile/app/(app)/(tabs)/index.tsx' 'mobile/app/(app)/(tabs)/logs.tsx'
git diff --cached --check
git commit -m "fix(mobile): adapt dashboard metrics to compact layouts"
```

### Task 5: Add explicit Check In validation and accessible focus movement

**Files:**
- Create: `mobile/src/lib/checkin-validation.ts`
- Create: `mobile/src/lib/checkin-validation.test.ts`
- Modify: `mobile/src/components/ui/Stepper.tsx`
- Modify: `mobile/src/components/checkin/CheckInForm.tsx`
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`

**Interfaces:**
- Consumes: `FormState` and `CheckInStep`.
- Produces: `validateCheckInStep(step, form): Partial<Record<keyof FormState, string>>`; `Stepper.error?: string`; `CheckInForm.errors`.

- [ ] **Step 1: Write failing validation tests**

```ts
it('requires the minimum useful fields for each step', () => {
  expect(validateCheckInStep('readiness', EMPTY_FORM)).toMatchObject({
    energyLevel: 'Choose your energy level.',
    stressLevel: 'Choose your stress level.',
  });
  expect(validateCheckInStep('recovery', EMPTY_FORM)).toMatchObject({
    sleepHours: 'Add your sleep hours.',
    hungerLevel: 'Choose your hunger level.',
    digestion: 'Choose your digestion status.',
  });
  expect(validateCheckInStep('adherence', EMPTY_FORM)).toMatchObject({
    workoutStatus: 'Choose today’s training status.',
    nutritionScore: 'Choose your nutrition score.',
  });
  expect(validateCheckInStep('finish', EMPTY_FORM)).toEqual({});
});

it('requires performance only after training or cardio', () => {
  expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'done' }))
    .toHaveProperty('workoutPerformance');
  expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'rest_day' }))
    .not.toHaveProperty('workoutPerformance');
});
```

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/lib/checkin-validation.test.ts
```

- [ ] **Step 3: Implement validation and inline errors**

Change `CheckInStep` to `'readiness' | 'recovery' | 'adherence' | 'finish'` and return the exact messages in the tests. Also reject values outside existing control bounds: weight 20–400kg, sleep 0–24h, ratings 1–10, steps 0–200000, calories 0–20000, and water 0–20L. Pass errors into `CheckInForm`; render each error directly beneath its control with `accessibilityLiveRegion="polite"`. Add `error?: string` to `Stepper` and show error in place of hint.

- [ ] **Step 4: Gate step changes and move accessibility focus**

Before advancing or submitting:

```ts
const nextErrors = validateCheckInStep(activeStep.key, form);
if (Object.keys(nextErrors).length > 0) {
  setErrors(nextErrors);
  AccessibilityInfo.announceForAccessibility('Please complete the highlighted fields.');
  requestAnimationFrame(() => {
    const node = findNodeHandle(errorSummaryRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  });
  return;
}
```

On successful step change, clear errors, scroll to top without animation under Reduced Motion, and announce the new step title.

At the same time, regroup the existing fields into the approved four-step rhythm without changing payload keys:

1. **Readiness and energy:** morning weight, energy, stress, and digestion.
2. **Sleep and recovery:** sleep hours plus concise recovery context.
3. **Nutrition and adherence:** workout status/performance, nutrition score, calories, water, steps, and optional macro disclosure.
4. **Notes and confirmation:** notes plus a read-only summary of the values about to be saved.

Keep “Same as yesterday” limited to objective measurements supported by `prefillFrom`; never copy subjective ratings silently.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/lib/checkin-validation.test.ts
npm run typecheck
git add mobile/src/lib/checkin-validation.ts mobile/src/lib/checkin-validation.test.ts mobile/src/components/ui/Stepper.tsx mobile/src/components/checkin/CheckInForm.tsx 'mobile/app/(app)/(tabs)/check-in.tsx'
git diff --cached --check
git commit -m "feat(mobile): validate and focus check-in steps"
```

### Task 6: Expose check-in draft and save status

**Files:**
- Create: `mobile/src/components/ui/StatusPill.tsx`
- Create: `mobile/src/components/ui/StatusPill.test.tsx`
- Modify: `mobile/src/components/ui/index.ts`
- Modify: `mobile/src/hooks/useCheckInDraft.ts`
- Create: `mobile/src/hooks/useCheckInDraft.test.ts`
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`

**Interfaces:**
- Consumes: AsyncStorage and existing draft key/expiry behavior.
- Produces: `SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'`; `StatusPill({ status, label? })`; `useCheckInDraft(...).draftStatus`.

- [ ] **Step 1: Write failing draft-status tests**

With fake timers and mocked AsyncStorage:

```ts
it('moves from saving to saved after the debounced write', async () => {
  const { result } = renderHook(() => useCheckInDraft('user-1', '2026-08-29'));
  act(() => result.current.saveDraft(EMPTY_FORM, 1));
  expect(result.current.draftStatus).toBe('saving');
  await act(async () => jest.advanceTimersByTimeAsync(500));
  expect(result.current.draftStatus).toBe('saved');
});
```

Add rejection coverage expecting `error` while preserving the in-memory form.

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/hooks/useCheckInDraft.test.ts
```

- [ ] **Step 3: Implement the status state and pill**

Use the same status lifecycle as `useWorkoutDraft`. `StatusPill` maps status to text and icon:

```ts
const DEFAULT_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved on this device',
  offline: 'Saved here · waiting to sync',
  error: 'Couldn’t save draft',
};
```

The pill uses a semantic icon plus text, `accessibilityLiveRegion="polite"`, and no entrance replay when its status is unchanged.

- [ ] **Step 4: Integrate the status into Check In**

Show `StatusPill` in `StickyActionBar.status` or extend that prop to accept `ReactNode`. Keep the step count visible alongside the state. Submission errors remain above the sticky bar with a Retry button that invokes `submit` without clearing the form.

- [ ] **Step 5: Run the feature suite**

```bash
npm test -- src/lib/streak.test.ts src/lib/consistency.test.ts src/lib/today-action.test.ts src/lib/checkin-validation.test.ts src/hooks/useCheckInDraft.test.ts src/components/dashboard/WeekStrip.test.tsx src/components/dashboard/ConsistencyGrid.test.tsx src/components/dashboard/MetricCard.test.tsx src/components/dashboard/TodayActionCard.test.tsx src/components/ui/StatusPill.test.tsx
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/ui/StatusPill.tsx mobile/src/components/ui/StatusPill.test.tsx mobile/src/components/ui/StickyActionBar.tsx mobile/src/components/ui/index.ts mobile/src/hooks/useCheckInDraft.ts mobile/src/hooks/useCheckInDraft.test.ts 'mobile/app/(app)/(tabs)/check-in.tsx'
git diff --cached --check
git commit -m "feat(mobile): expose resilient check-in save state"
```

## Plan 2 completion gate

- [ ] Run `npm test -- --runInBand` and `npm run typecheck` from `mobile/`.
- [ ] At 320dp width, confirm the week strip scrolls, metric cards stack, and no target shrinks below 44pt.
- [ ] With largest practical font scale, complete all four Check In steps without clipping.
- [ ] Turn on Reduced Motion and verify step changes remain understandable without spatial animation.
- [ ] Simulate an AsyncStorage failure and a network submission failure; confirm values remain and Retry succeeds.
- [ ] Traverse Home and Check In with VoiceOver or TalkBack and record focus-order defects before starting another plan.
