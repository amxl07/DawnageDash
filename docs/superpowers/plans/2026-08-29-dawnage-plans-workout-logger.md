# Dawnage Plans and Workout Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Plans and the workout logger into a coherent, responsive training experience with reliable plan provenance, explicit set state, previous-session context, persistent rest timing, offline feedback, and a useful completion summary.

**Architecture:** Introduce a backward-compatible versioned workout-content serializer and move logger state into a pure reducer. Presentational plan/set/timer components consume explicit typed state, while existing hooks remain responsible for Supabase and AsyncStorage access. Rest timing is provided above the app stack so it survives route changes.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, Expo Router 6, React Query 5, Supabase, AsyncStorage, Reanimated 4.1, Gesture Handler 2.28, Expo Haptics, Jest Expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Global Constraints

- Complete `2026-08-29-dawnage-ui-foundations-motion.md` first.
- Keep Expo SDK 54 and Expo Go compatibility; add no Skia dependency.
- Keep existing array and legacy workout-log content readable.
- Store new plan-day/completion metadata inside `workout_logs.content`; do not add database columns.
- Keep buttons as alternatives to horizontal swipe.
- Rest timing must derive from an absolute timestamp and survive backgrounding.
- Compact or large-text layouts stack set controls and summary metrics.
- All changes preserve local drafts and queued offline workouts.
- Preserve the current dirty working tree; stage only task-owned paths.
- Run `npm`/`npx` commands from `mobile/`; run `git` commands from the repository root.

---

### Task 1: Version workout content without breaking historical logs

**Files:**
- Modify: `mobile/src/lib/workout-content.ts`
- Create: `mobile/src/lib/workout-content.test.ts`

**Interfaces:**
- Consumes: existing array, legacy object, and plain-text content shapes.
- Produces: `LoggedSet.completed`, `ParsedContent.planDayNumber`, and `serializeWorkoutContent(input)`.

- [ ] **Step 1: Write failing compatibility tests**

```ts
it('continues parsing the current array format', () => {
  const parsed = parseWorkoutContent('[{"exercise":"Squat","sets":[{"setNumber":1,"reps":"5","weight":"80","rpe":"8"}]}]');
  expect(parsed).toMatchObject({ kind: 'exercises', exercises: [{ name: 'Squat' }] });
});

it('round-trips version two metadata and explicit completion', () => {
  const content = serializeWorkoutContent({
    planDayNumber: 2,
    exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: true }] }],
  });
  expect(parseWorkoutContent(content)).toEqual({
    kind: 'exercises',
    version: 2,
    planDayNumber: 2,
    exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: true }] }],
  });
});

it('infers completion for historical rows', () => {
  const parsed = parseWorkoutContent('[{"exercise":"Squat","sets":[{"reps":"5","weight":"80"}]}]');
  expect(parsed.kind === 'exercises' && parsed.exercises[0].sets[0].completed).toBe(true);
});
```

Retain tests for legacy objects and non-JSON strings.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/lib/workout-content.test.ts
```

Expected: FAIL because the versioned serializer and completion metadata do not exist.

- [ ] **Step 3: Implement the versioned contract**

Define:

```ts
export type LoggedSet = {
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  completed: boolean;
  duration?: string;
  kind?: 'warmup' | 'work';
};

export type WorkoutContentV2 = {
  version: 2;
  planDayNumber: number | null;
  exercises: ParsedExercise[];
};

export function serializeWorkoutContent(input: Omit<WorkoutContentV2, 'version'>): string {
  return JSON.stringify({ version: 2, ...input });
}
```

Parse the version-two object before the existing array branch. For historical arrays, infer `completed` from non-empty repetitions and either non-empty weight or an explicitly stored `completed: true`. Preserve plain text and legacy-object behavior.

- [ ] **Step 4: Update derived metrics**

`countSets()` counts `set.completed`; `totalVolume()` includes only completed sets with numeric weight and repetitions; `maxWeightFor()` considers completed sets and accepts historical inferred completion.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/lib/workout-content.test.ts
npm run typecheck
git add mobile/src/lib/workout-content.ts mobile/src/lib/workout-content.test.ts
git diff --cached --check
git commit -m "feat(mobile): version workout log content"
```

### Task 2: Extract and test the workout reducer

**Files:**
- Create: `mobile/src/features/workout/workoutReducer.ts`
- Create: `mobile/src/features/workout/workoutReducer.test.ts`
- Modify: `mobile/src/hooks/useWorkoutDraft.ts`
- Modify: `mobile/app/(app)/logger.tsx`

**Interfaces:**
- Consumes: versioned workout-content types.
- Produces: `WorkoutSet`, `WorkoutExercise`, `WorkoutState`, `WorkoutAction`, `initialWorkoutState`, `workoutReducer`, and `normalizeDraftExercise()`.

- [ ] **Step 1: Write failing reducer tests**

```ts
it('updates only the addressed set', () => {
  const next = workoutReducer(stateWithTwoSets, {
    type: 'UPDATE_SET',
    payload: { exerciseIndex: 0, setIndex: 1, field: 'reps', value: '10' },
  });
  expect(next.exercises[0].sets[0].reps).toBe('8');
  expect(next.exercises[0].sets[1].reps).toBe('10');
  expect(next.isDirty).toBe(true);
});

it('toggles explicit set completion without changing values', () => {
  const next = workoutReducer(stateWithTwoSets, {
    type: 'TOGGLE_SET',
    payload: { exerciseIndex: 0, setIndex: 0 },
  });
  expect(next.exercises[0].sets[0]).toMatchObject({ reps: '8', weight: '60', completed: true });
});
```

Add tests for loading a plan, restoring an old draft without `completed`, adding/removing sets, adding an exercise, and marking clean.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/features/workout/workoutReducer.test.ts
```

- [ ] **Step 3: Implement the reducer module**

Use these public types:

```ts
export type WorkoutSet = {
  id: string;
  reps: string;
  weight: string;
  rpe: string;
  duration: string;
  kind: 'warmup' | 'work';
  completed: boolean;
};
export type WorkoutExercise = {
  id: string;
  name: string;
  tracking: 'weight-reps' | 'duration';
  sets: WorkoutSet[];
};
export type WorkoutState = {
  title: string;
  exercises: WorkoutExercise[];
  existingLogId: string | null;
  selectedDay: number | null;
  isDirty: boolean;
};
```

Export the reducer and actions, including `TOGGLE_SET` and `REPLACE_EXERCISE`. Normalize old draft sets with a stable generated `id`, `duration: ''`, `kind: 'work'`, and `completed ?? Boolean(reps.trim() && weight.trim())`.

- [ ] **Step 4: Migrate logger and draft types**

Replace the private reducer in `logger.tsx` with imports from the new module. Alias `DraftExercise` to `WorkoutExercise` in `useWorkoutDraft.ts`, keeping the exported name temporarily so existing imports remain valid.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/features/workout/workoutReducer.test.ts
npm run typecheck
git add mobile/src/features/workout/workoutReducer.ts mobile/src/features/workout/workoutReducer.test.ts mobile/src/hooks/useWorkoutDraft.ts 'mobile/app/(app)/logger.tsx'
git diff --cached --check
git commit -m "refactor(mobile): isolate workout logger state"
```

### Task 3: Add reliable plan-day progress and focused plan cards

**Files:**
- Create: `mobile/src/hooks/usePlanProgress.ts`
- Create: `mobile/src/hooks/usePlanProgress.test.ts`
- Create: `mobile/src/components/plans/PlanDayCard.tsx`
- Create: `mobile/src/components/plans/PlanDayCard.test.tsx`
- Modify: `mobile/app/(app)/(tabs)/plans.tsx`
- Modify: `mobile/src/hooks/useWorkoutDraft.ts`

**Interfaces:**
- Consumes: version-two `planDayNumber`, current-week workout logs, today's local draft, and `PlanDay[]`.
- Produces: `PlanDayStatus = 'today' | 'active' | 'complete' | 'upcoming'`; `usePlanProgress(days)`; `PlanDayCard({ day, status, onStart })`.

- [ ] **Step 1: Write failing status tests**

```ts
it('prioritizes an active draft over completed and upcoming states', () => {
  expect(derivePlanDayStatuses([1, 2, 3], { activeDay: 2, completedDays: [1] })).toEqual({
    1: 'complete',
    2: 'active',
    3: 'upcoming',
  });
});

it('marks the first incomplete day as today when there is no active draft', () => {
  expect(derivePlanDayStatuses([1, 2, 3], { activeDay: null, completedDays: [1] })).toEqual({
    1: 'complete',
    2: 'today',
    3: 'upcoming',
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/hooks/usePlanProgress.test.ts
```

- [ ] **Step 3: Implement progress derivation and data access**

Export pure `derivePlanDayStatuses(dayNumbers, progress)` beside the hook. Query current-week `workout_logs.content`, parse version-two content, and collect unique completed `planDayNumber` values. Export a pure AsyncStorage reader from `useWorkoutDraft.ts` so the hook can detect today's active draft without mounting the logger.

- [ ] **Step 4: Extract `PlanDayCard`**

Move the existing `DayCard` out of `plans.tsx`. Add a visible text badge for status, use `Continue Day N` for active, `Repeat Day N` for complete, and `Start Day N` otherwise. Preserve the video alternative, notes, exercise count, expanded state, and 44pt controls. Expansion uses a 160ms chevron rotation plus an opacity entrance, disabled under Reduced Motion.

- [ ] **Step 5: Integrate into Plans**

Keep the Training/Nutrition segmented control. Order content as plan identity/provenance, today/active card, remaining days, then coach notes. `provenance.markSeen()` runs only after the Training content has rendered, not while data is loading.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- src/hooks/usePlanProgress.test.ts src/components/plans/PlanDayCard.test.tsx
npm run typecheck
git add mobile/src/hooks/usePlanProgress.ts mobile/src/hooks/usePlanProgress.test.ts mobile/src/hooks/useWorkoutDraft.ts mobile/src/components/plans/PlanDayCard.tsx mobile/src/components/plans/PlanDayCard.test.tsx 'mobile/app/(app)/(tabs)/plans.tsx'
git diff --cached --check
git commit -m "feat(mobile): show actionable plan-day progress"
```

### Task 4: Build an adaptive set editor with explicit completion

**Files:**
- Create: `mobile/src/components/logger/SetEditor.tsx`
- Create: `mobile/src/components/logger/SetEditor.test.tsx`
- Modify: `mobile/src/components/logger/ExerciseSlide.tsx`
- Modify: `mobile/app/(app)/logger.tsx`

**Interfaces:**
- Consumes: `WorkoutSet`, responsive mode, target repetitions, previous-set value, and update/toggle/remove callbacks.
- Produces: `SetEditor({ index, set, previous, targetReps, isCurrent, canRemove, onUpdate, onToggle, onRemove })`.

- [ ] **Step 1: Write failing responsive and accessibility tests**

```tsx
it('renders stacked labeled controls in compact mode', () => {
  mockResponsiveLayout({ isCompact: true });
  const { getByLabelText, getByRole } = renderSetEditor();
  expect(getByLabelText('Set 1 weight in kilograms')).toBeTruthy();
  expect(getByLabelText('Set 1 repetitions')).toBeTruthy();
  expect(getByRole('checkbox', { name: 'Mark set 1 complete' })).toBeTruthy();
});

it('shows previous performance as text, not color alone', () => {
  const { getByText } = renderSetEditor({ previous: { weight: '60', reps: '8', rpe: '7', completed: true } });
  expect(getByText('Last: 60 kg × 8 @ 7')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/logger/SetEditor.test.tsx
```

- [ ] **Step 3: Implement the adaptive editor**

- Regular mode: set number/completion, weight, repetitions, RPE, and remove action in one row only when the available width fits.
- Compact mode: one card per set with completion/header row, then weight and repetitions stacked; RPE and remove appear below.
- The completion control is a 44pt checkbox with text state and `accessibilityState={{ checked: set.completed }}`.
- Current incomplete set uses a primary border plus “Current set” text; completed sets use a check and reduced emphasis.
- The completion transition is 120–180ms, starts at scale 0.92, and triggers a light haptic at state change.

- [ ] **Step 4: Replace the hard-coded row in `ExerciseSlide`**

Remove the `28/56/32` fixed-width table and inline `SetStepper`. Map sets to `SetEditor`, determine the first incomplete set, and pass `isCurrent`. Keep previous-session copy, demo video, notes, add-set action, and stable set identity. Add an internal `id` to newly created `WorkoutSet` values so removing a row does not change React keys.

- [ ] **Step 5: Wire completion into logger actions**

Dispatch:

```ts
dispatch({ type: 'TOGGLE_SET', payload: { exerciseIndex: index, setIndex } });
```

Save with `serializeWorkoutContent({ planDayNumber: state.selectedDay, exercises })`. Summary set count uses explicit `completed` state.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- src/components/logger/SetEditor.test.tsx src/features/workout/workoutReducer.test.ts src/lib/workout-content.test.ts
npm run typecheck
git add mobile/src/components/logger/SetEditor.tsx mobile/src/components/logger/SetEditor.test.tsx mobile/src/components/logger/ExerciseSlide.tsx 'mobile/app/(app)/logger.tsx' mobile/src/features/workout/workoutReducer.ts mobile/src/lib/workout-content.ts
git diff --cached --check
git commit -m "feat(mobile): add adaptive explicit set tracking"
```

### Task 5: Make exercise swipes velocity-aware and testable

**Files:**
- Modify: `mobile/src/components/logger/SwipeableSlide.tsx`
- Create: `mobile/src/components/logger/swipeDecision.ts`
- Create: `mobile/src/components/logger/swipeDecision.test.ts`

**Interfaces:**
- Consumes: translation, velocity, width, and edge availability.
- Produces: `decideSwipe(input): 'previous' | 'next' | 'stay'` and `projectSwipe(translationX, velocityX)`.

- [ ] **Step 1: Write failing decision tests**

```ts
it.each([
  [{ translationX: -20, velocityX: -900, width: 320, canPrev: true, canNext: true }, 'next'],
  [{ translationX: 20, velocityX: 900, width: 320, canPrev: true, canNext: true }, 'previous'],
  [{ translationX: -100, velocityX: -200, width: 320, canPrev: true, canNext: false }, 'stay'],
  [{ translationX: 15, velocityX: -700, width: 320, canPrev: true, canNext: true }, 'next'],
] as const)('resolves swipe intent', (input, expected) => {
  expect(decideSwipe(input)).toBe(expected);
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/logger/swipeDecision.test.ts
```

- [ ] **Step 3: Implement projection and gesture behavior**

Use `projectedX = translationX + velocityX * 0.18`; require `abs(projectedX) >= max(60, width * 0.18)`. Direction comes from `projectedX`, not translation alone. Clamp edge movement with a `0.25` resistance multiplier. On success, animate the card approximately one-quarter screen in the intended direction with opacity before invoking navigation and resetting; on stay, spring to zero. Keep Reduced Motion and visible Previous/Next controls.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- src/components/logger/swipeDecision.test.ts
npm run typecheck
git add mobile/src/components/logger/SwipeableSlide.tsx mobile/src/components/logger/swipeDecision.ts mobile/src/components/logger/swipeDecision.test.ts
git diff --cached --check
git commit -m "fix(mobile): honor swipe velocity and boundaries"
```

### Task 6: Lift the rest timer above navigation and refine completion

**Files:**
- Modify: `mobile/src/components/logger/useRestTimer.ts`
- Create: `mobile/src/components/logger/useRestTimer.test.tsx`
- Modify: `mobile/src/components/logger/RestTimer.tsx`
- Modify: `mobile/src/components/logger/CircularTimer.tsx`
- Create: `mobile/src/components/logger/CircularTimer.test.tsx`
- Modify: `mobile/app/(app)/_layout.tsx`

**Interfaces:**
- Produces: `RestTimerProvider`, `useRestTimer()`, and pure `remainingAt(endsAt, now)`; consumers retain `RestTimerState`.

- [ ] **Step 1: Write failing timer tests**

```ts
it('derives remaining seconds from absolute time', () => {
  expect(remainingAt(10_000, 8_600)).toBe(1);
  expect(remainingAt(10_000, 10_001)).toBe(0);
});

it('keeps one timer state across consumer remounts', () => {
  const wrapper = ({ children }: PropsWithChildren) => <RestTimerProvider>{children}</RestTimerProvider>;
  const first = renderHook(() => useRestTimer(), { wrapper });
  act(() => first.result.current.start(90));
  expect(first.result.current.running).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/logger/useRestTimer.test.tsx src/components/logger/CircularTimer.test.tsx
```

- [ ] **Step 3: Implement provider-owned timer state**

Move the existing hook body into `RestTimerProvider`, expose it through context, and throw a clear error if `useRestTimer()` is called outside the provider. Wrap the authenticated `Stack` in `RestTimerProvider` in `(app)/_layout.tsx`. Keep absolute `endsAt`, foreground recomputation, one completion haptic, pause/resume/reset/skip, and the 250ms display tick.

- [ ] **Step 4: Tighten the completion choreography**

- Initialize `tickScale` to `0.92`, not `0`.
- Fill for 180ms, fade ring/countdown for 120ms, and settle the tick for 160ms.
- Under Reduced Motion, render the final tick immediately.
- Ensure starting or resetting a timer restores opacity and tick scale before the next completion.
- Change preset controls from 40pt to at least 44pt.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/components/logger/useRestTimer.test.tsx src/components/logger/CircularTimer.test.tsx
npm run typecheck
git add mobile/src/components/logger/useRestTimer.ts mobile/src/components/logger/useRestTimer.test.tsx mobile/src/components/logger/RestTimer.tsx mobile/src/components/logger/CircularTimer.tsx mobile/src/components/logger/CircularTimer.test.tsx 'mobile/app/(app)/_layout.tsx'
git diff --cached --check
git commit -m "feat(mobile): persist and polish rest timing"
```

### Task 7: Integrate logger status, navigation, and completion summary

**Files:**
- Modify: `mobile/app/(app)/logger.tsx`
- Modify: `mobile/app/(app)/(tabs)/logs.tsx`
- Create: `mobile/src/components/logger/WorkoutSummary.tsx`
- Create: `mobile/src/components/logger/WorkoutSummary.test.tsx`

**Interfaces:**
- Consumes: extracted reducer, `StatusPill`, `AdaptiveGrid`, versioned serializer, shared rest timer, and swipe decision.
- Produces: a responsive logger and `WorkoutSummary({ result, syncStatus, onDone })`.

- [ ] **Step 1: Write failing summary tests**

```tsx
it('states local-only completion without presenting it as synced', () => {
  const { getByText } = render(<WorkoutSummary result={result} syncStatus="offline" onDone={jest.fn()} />);
  expect(getByText('Saved here · waiting to sync')).toBeTruthy();
});

it('announces PR names and completed set count', () => {
  const { getByLabelText } = render(<WorkoutSummary result={{ ...result, sets: 8, prs: ['Squat'] }} syncStatus="saved" onDone={jest.fn()} />);
  expect(getByLabelText(/8 completed sets.*Squat/)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/logger/WorkoutSummary.test.tsx
```

- [ ] **Step 3: Build the summary and status flow**

Use `AdaptiveGrid` for volume, completed sets, and duration. Show PRs in one semantic card. Pass an explicit `syncStatus: 'saved' | 'offline'`; offline completion uses `StatusPill` and never says only “Workout saved.”

- [ ] **Step 4: Refine the logger shell**

- Header exposes Close, elapsed session time, exercise position, and Finish/Save.
- Draft status uses `StatusPill` and remains visible without taking over the exercise card.
- Previous/Next buttons and pager remain; each active page change is announced.
- The first incomplete set receives current-set emphasis.
- The bottom action area uses `StickyActionBar` instead of a second hand-built safe-area bar.
- Saving serializes version-two content and does not clear the draft until the server write or local outbox enqueue succeeds.

- [ ] **Step 5: Update Logs offline presentation**

Replace the custom pending card with `StatusPill status="offline" label="N workouts saved here · waiting to sync"`. Keep the list virtualized and preserve legacy log rendering. Use `AdaptiveGrid` for log metrics.

- [ ] **Step 6: Run the plan suite**

```bash
npm test -- src/lib/workout-content.test.ts src/features/workout/workoutReducer.test.ts src/hooks/usePlanProgress.test.ts src/components/plans/PlanDayCard.test.tsx src/components/logger/SetEditor.test.tsx src/components/logger/swipeDecision.test.ts src/components/logger/useRestTimer.test.tsx src/components/logger/CircularTimer.test.tsx src/components/logger/WorkoutSummary.test.tsx
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 7: Commit**

```bash
git add 'mobile/app/(app)/logger.tsx' 'mobile/app/(app)/(tabs)/logs.tsx' mobile/src/components/logger/WorkoutSummary.tsx mobile/src/components/logger/WorkoutSummary.test.tsx
git diff --cached --check
git commit -m "feat(mobile): complete focused workout logging flow"
```

### Task 8: Add prescription details, supported substitutions, warmups, and plate calculation

**Files:**

- Modify: `mobile/src/hooks/usePlans.ts`
- Create: `mobile/src/hooks/usePlans.test.ts`
- Create: `mobile/src/components/plans/ExercisePrescriptionSheet.tsx`
- Create: `mobile/src/components/plans/ExercisePrescriptionSheet.test.tsx`
- Create: `mobile/src/lib/plate-calculator.ts`
- Create: `mobile/src/lib/plate-calculator.test.ts`
- Create: `mobile/src/components/logger/PlateCalculatorSheet.tsx`
- Modify: `mobile/src/features/workout/workoutReducer.ts`
- Modify: `mobile/src/features/workout/workoutReducer.test.ts`
- Modify: `mobile/src/components/logger/ExerciseSlide.tsx`
- Modify: `mobile/app/(app)/(tabs)/plans.tsx`

**Interfaces:**

- Extends `PlanExercise` with optional `duration`, `restSeconds`, `warmupSets`, and `substitutions` parsed only from existing JSON.
- Produces `ExercisePrescriptionSheet({ exercise, onSubstitute? })` and `calculatePlates(targetKg, barKg, availablePairs)`.
- Substitution changes the active local workout only; it does not rewrite the coach-authored plan.

- [ ] **Step 1: Write failing plan-normalization tests**

Add exported `normalizeExercisesForTest(raw)` coverage in `usePlans.test.ts`:

```ts
it('retains optional duration, rest, warmup, and substitution metadata', () => {
  expect(normalizeExercisesForTest(JSON.stringify([{
    Exercise: 'Row',
    Sets: 4,
    Duration: '45 sec',
    Rest: 90,
    warmup_sets: 1,
    substitutions: [{ name: 'Chest-supported row', sets: 4, reps: '10' }],
  }]))[0]).toMatchObject({
    name: 'Row',
    duration: '45 sec',
    restSeconds: 90,
    warmupSets: 1,
    substitutions: [{ name: 'Chest-supported row' }],
  });
});

it('does not invent substitutions when source metadata has none', () => {
  expect(normalizeExercisesForTest('[{"Exercise":"Squat","Sets":3}]')[0].substitutions).toEqual([]);
});
```

- [ ] **Step 2: Write failing plate-calculator tests**

Create `mobile/src/lib/plate-calculator.test.ts`:

```ts
it('calculates plates per side for a metric barbell', () => {
  expect(calculatePlates(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({
    platesPerSide: [25, 15],
    remainderKg: 0,
  });
});

it('reports an unreachable remainder without rounding the requested load', () => {
  expect(calculatePlates(63, 20, [20, 10, 5, 2.5, 1.25])).toEqual({
    platesPerSide: [20, 1.25],
    remainderKg: 0.5,
  });
});
```

- [ ] **Step 3: Run both suites to verify failure**

```bash
npm test -- src/hooks/usePlans.test.ts src/lib/plate-calculator.test.ts
```

Expected: FAIL because the metadata and calculator do not exist.

- [ ] **Step 4: Normalize only data that the current plan JSON actually supplies**

Extend `PlanExercise`:

```ts
export type PlanExercise = {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  duration?: string;
  restSeconds?: number;
  warmupSets: number;
  substitutions: PlanExercise[];
  videoLink?: string;
  notes?: string;
};
```

Parse both existing upper/lower-case legacy keys. Clamp `warmupSets` from zero through `sets`. Accept substitutions only when the source value is an array of objects with a non-empty name. Do not infer alternatives from exercise names or make a network request to a third-party exercise database.

- [ ] **Step 5: Implement plan details and substitution UI in the shared sheet**

`ExercisePrescriptionSheet` shows exercise name, work/warmup set counts, repetitions or duration, rest, coach note, and video action. If `substitutions` is empty, render no substitution heading or action. If `onSubstitute` is absent, show alternatives as read-only plan information. In the active logger, each alternative gets a 44pt “Use [name]” button that dispatches `REPLACE_EXERCISE` only after confirmation that entered sets for the current exercise will be replaced.

Both Plans and Logger open the same sheet from a visible “Details” action. The sheet preserves surrounding list position, moves accessibility focus to its title, and has the standard Close action from Plan 1.

- [ ] **Step 6: Represent duration and warmup sets without densifying the default row**

When a plan exercise has `duration` and no repetition target, initialize `tracking: 'duration'` and have `SetEditor` render one duration field instead of weight/repetition fields. Initialize the first `warmupSets` as `kind: 'warmup'` and label them “Warm-up 1”, “Warm-up 2”; exclude warmups from PR detection while keeping them in the completed-set count. Persist `duration` and `kind` in version-two log content. Historical content defaults to `kind: 'work'`.

- [ ] **Step 7: Implement the progressive plate-calculator utility**

`calculatePlates` subtracts the bar, divides the remaining load equally between sides, greedily selects pairs from the descending configured plate list, and returns the unrepresentable total remainder. `PlateCalculatorSheet` is available from the weight field's secondary “Plates” action only for `weight-reps` exercises. It defaults to a 20kg bar, allows 15kg/20kg/custom bar selection, announces “per side,” and never changes the entered weight unless the user taps “Use this load.”

- [ ] **Step 8: Preserve the calmer Nutrition hierarchy**

In `plans.tsx`, retain the accessible Training/Nutrition segmented control. Order Nutrition as target/diet summary, meal cards in meal order, supplements, then coach nutrition/cardio/steps notes. Keep macro values textual, let long meal descriptions wrap, and use the same loading/empty/error primitives as Training. Do not copy the logger's set-table density into Nutrition.

- [ ] **Step 9: Verify and commit**

```bash
npm test -- src/hooks/usePlans.test.ts src/components/plans/ExercisePrescriptionSheet.test.tsx src/lib/plate-calculator.test.ts src/features/workout/workoutReducer.test.ts src/components/logger/SetEditor.test.tsx
npm run typecheck
git add mobile/src/hooks/usePlans.ts mobile/src/hooks/usePlans.test.ts mobile/src/components/plans/ExercisePrescriptionSheet.tsx mobile/src/components/plans/ExercisePrescriptionSheet.test.tsx mobile/src/lib/plate-calculator.ts mobile/src/lib/plate-calculator.test.ts mobile/src/components/logger/PlateCalculatorSheet.tsx mobile/src/features/workout/workoutReducer.ts mobile/src/features/workout/workoutReducer.test.ts mobile/src/components/logger/ExerciseSlide.tsx 'mobile/app/(app)/(tabs)/plans.tsx'
git diff --cached --check
git commit -m "feat(mobile): add progressive workout utilities"
```

## Plan 3 completion gate

- [ ] Start a plan day, enter values, mark sets complete, swipe and button-navigate exercises, run/pause/background/resume the timer, and finish the workout.
- [ ] Repeat the flow at 320dp width and font scale 1.30.
- [ ] Disable connectivity before save; confirm local summary wording, outbox visibility, reconnect sync, and log-list refresh.
- [ ] Open historical array, legacy-object, plain-text, and version-two log content without a crash.
- [ ] Open exercise details from Plans and Logger; verify substitution is absent without data and local-only when provided.
- [ ] Verify warmup and duration prescriptions, then calculate one exact and one remainder-bearing plate load.
- [ ] Traverse Plans, Logger, full-screen Rest, and Summary with VoiceOver or TalkBack.
- [ ] Run `npm test -- --runInBand`, `npm run typecheck`, and `npx expo install --check`.
