# Phase 3: Fast workout logging implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. No owner gate in this phase.

**Goal:** Make repeating a set one tap and make the end of a workout feel earned (F4, F6):
- suggested values from the last session or the coach's target
- ± buttons
- a visible list of sets
- exercise-name suggestions
- personal records and a comparison with the last session

**Architecture:**
- Four new pure modules in `src/features/workout/`: `set-suggestion.ts`, `step-value.ts`, `exercise-suggestions.ts` and `personal-records.ts`. Each has unit tests.
- One shared data hook, `src/hooks/useWorkoutLogHistory.ts`.
- UI changes stay inside the existing logger components.
- **Suggestions are never saved silently.** A suggestion is written into the set, and so shown on screen, only when the user completes that set. Until then it appears as muted placeholder text.

**Tech stack:** React Native `TextInput` placeholders, `expo-haptics` `selectionAsync` / `notificationAsync`, @tanstack/react-query, the existing `workoutReducer` actions (`UPDATE_SET`, `TOGGLE_SET`, `ADD_EXERCISE`).

**Spec:** [F4, F6](../../specs/2026-09-26-market-review-findings.md#f4-p1-logging-a-set-is-slow).

**Existing behaviour to keep:**
- The completion lock (no double completion).
- "Undo" after completing a set.
- Remove and restore of a set.
- The plate calculator.
- The exercise guide.
- Rest timer auto-start.
- Screen-reader labels of the form "Set 1 weight in kilograms".

---

### Task 3.1: Set suggestions (pure)

**Files:**
- Create: `src/features/workout/set-suggestion.ts`
- Test: `src/features/workout/set-suggestion.test.ts`

**Interfaces:**
- Consumes: `WorkoutSet`, `WorkoutExercise` from `./workoutReducer`
- Produces:
  - `type SetValues = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'duration'>>`
  - `firstWholeNumber(text?: string): string`
  - `targetSeconds(text?: string): string`
  - `suggestSet(input: { set: WorkoutSet; tracking: WorkoutExercise['tracking']; previous?: SetValues; targetReps?: string; targetDuration?: string }): SetValues`
  - `describeSuggestion(values: SetValues, tracking: WorkoutExercise['tracking']): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workout/set-suggestion.test.ts
import { describeSuggestion, firstWholeNumber, suggestSet, targetSeconds } from './set-suggestion';
import type { WorkoutSet } from './workoutReducer';

const empty: WorkoutSet = { id: 's1', weight: '', reps: '', rpe: '', duration: '', kind: 'work', completed: false };

it('reads the first whole number of a coach target', () => {
  expect(firstWholeNumber('8-12')).toBe('8');
  expect(firstWholeNumber('10 reps')).toBe('10');
  expect(firstWholeNumber('AMRAP')).toBe('');
  expect(firstWholeNumber(undefined)).toBe('');
});

it('converts duration targets to seconds', () => {
  expect(targetSeconds('45')).toBe('45');
  expect(targetSeconds('30 sec')).toBe('30');
  expect(targetSeconds('1 min')).toBe('60');
  expect(targetSeconds('2 minutes')).toBe('120');
  expect(targetSeconds('')).toBe('');
});

it('suggests last session values for empty fields only', () => {
  expect(suggestSet({ set: empty, tracking: 'weight-reps', previous: { weight: '60', reps: '8' } })).toEqual({ weight: '60', reps: '8' });
  expect(suggestSet({ set: { ...empty, weight: '65' }, tracking: 'weight-reps', previous: { weight: '60', reps: '8' } })).toEqual({ reps: '8' });
});

it('falls back to the coach target for reps but never invents a weight', () => {
  expect(suggestSet({ set: empty, tracking: 'weight-reps', targetReps: '8-12' })).toEqual({ reps: '8' });
  expect(suggestSet({ set: empty, tracking: 'weight-reps' })).toEqual({});
});

it('suggests durations from history, then target', () => {
  expect(suggestSet({ set: empty, tracking: 'duration', previous: { duration: '40' }, targetDuration: '1 min' })).toEqual({ duration: '40' });
  expect(suggestSet({ set: empty, tracking: 'duration', targetDuration: '1 min' })).toEqual({ duration: '60' });
});

it('describes a suggestion for a set row', () => {
  expect(describeSuggestion({ weight: '60', reps: '8' }, 'weight-reps')).toBe('60 kg × 8 reps');
  expect(describeSuggestion({ reps: '10' }, 'weight-reps')).toBe('10 reps');
  expect(describeSuggestion({ duration: '45' }, 'duration')).toBe('45 sec');
  expect(describeSuggestion({}, 'weight-reps')).toBe('');
});
```

- [ ] **Step 2: Run it.** `npx jest src/features/workout/set-suggestion.test.ts --runInBand`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
// src/features/workout/set-suggestion.ts
import type { WorkoutExercise, WorkoutSet } from './workoutReducer';

export type SetValues = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'duration'>>;

const filled = (value: string | undefined): value is string => Boolean(value?.trim());

/** "8-12" → "8", "10 reps" → "10", "AMRAP" → "". */
export function firstWholeNumber(text?: string): string {
  const match = text?.match(/\d+/);
  return match ? String(Number(match[0])) : '';
}

/** Plan durations are free text: "45", "30 sec", "1 min". Logged duration is seconds. */
export function targetSeconds(text?: string): string {
  const minutes = text?.match(/(\d+)\s*m(?:in(?:ute)?s?)?\b/i);
  if (minutes) return String(Number(minutes[1]) * 60);
  return firstWholeNumber(text);
}

/**
 * What an EMPTY field would become if the set were completed now: the same set
 * last session, else the coach's target. Never invents a weight.
 */
export function suggestSet(input: {
  set: WorkoutSet;
  tracking: WorkoutExercise['tracking'];
  previous?: SetValues;
  targetReps?: string;
  targetDuration?: string;
}): SetValues {
  const { set, tracking, previous } = input;
  const suggestion: SetValues = {};
  if (tracking === 'duration') {
    if (!filled(set.duration)) {
      const value = filled(previous?.duration) ? previous.duration.trim() : targetSeconds(input.targetDuration);
      if (value) suggestion.duration = value;
    }
    return suggestion;
  }
  if (!filled(set.weight) && filled(previous?.weight)) suggestion.weight = previous.weight.trim();
  if (!filled(set.reps)) {
    const reps = filled(previous?.reps) ? previous.reps.trim() : firstWholeNumber(input.targetReps);
    if (reps) suggestion.reps = reps;
  }
  return suggestion;
}

export function describeSuggestion(values: SetValues, tracking: WorkoutExercise['tracking']): string {
  if (tracking === 'duration') return values.duration ? `${values.duration} sec` : '';
  const weight = values.weight ? `${values.weight} kg` : '';
  const reps = values.reps ? `${values.reps} reps` : '';
  return weight && reps ? `${weight} × ${reps}` : weight || reps;
}
```

- [ ] **Step 4: Run the test.** Expected: PASS (6 tests).
- [ ] **Step 5: Commit**

```bash
git add src/features/workout/set-suggestion.ts src/features/workout/set-suggestion.test.ts
git commit -m "feat(mobile): add set suggestion rules"
```

---

### Task 3.2: One-tap completion using suggestions

**Files:**
- Modify: `src/components/logger/ExerciseSlide.tsx`
- Modify: `src/components/logger/CurrentSetEditor.tsx`
- Modify: `src/components/logger/CompactSetRow.tsx`
- Test: `src/components/logger/ExerciseSlide.suggestion.test.tsx` (create)
- Update: `src/components/logger/CurrentSetEditor.test.tsx` (delete the two "copies … Undo" tests)

**Interfaces:**
- Consumes: `suggestSet`, `describeSuggestion`, `SetValues` (Task 3.1)
- Produces:
  - `CurrentSetEditor` prop `suggestion?: SetValues`
  - `CompactSetRow` prop `suggestion?: string`

- [ ] **Step 1: Write the failing test.** This covers Review Focus 1.

```tsx
// src/components/logger/ExerciseSlide.suggestion.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Text as NativeText } from 'react-native';

import { initialWorkoutState, workoutReducer, type WorkoutExercise } from '@/features/workout/workoutReducer';
import { ExerciseSlide } from './ExerciseSlide';

jest.mock('lucide-react-native', () => ({ Check: () => null, ChevronRight: () => null }));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/logger/PlateCalculatorSheet', () => ({ PlateCalculatorSheet: () => null }));
jest.mock('@/components/plans/ExercisePrescriptionSheet', () => ({ ExercisePrescriptionSheet: () => null }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, TextInput } = require('react-native');
  return {
    Text,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>,
    Input: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
  };
});
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useMotion: () => ({ enabled: false, duration: { feedback: 160 } }), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').light }) }));

const bench: WorkoutExercise = { id: 'b', name: 'Bench press', tracking: 'weight-reps', sets: [1, 2].map((n) => ({ id: `b-${n}`, weight: '', reps: '', rpe: '', duration: '', kind: 'work', completed: false })) };

function Probe() {
  const [state, setState] = useState({ ...initialWorkoutState, exercises: [bench] });
  const dispatch = (action: Parameters<typeof workoutReducer>[1]) => setState((current) => workoutReducer(current, action));
  const exercise = state.exercises[0];
  const indexOf = (id: string) => exercise.sets.findIndex((set) => set.id === id);
  return <>
    <NativeText testID="state">{JSON.stringify(exercise.sets)}</NativeText>
    <ExerciseSlide exercise={exercise} previous={[{ weight: '60', reps: '8', rpe: '' }]} targetReps="8-10"
      onUpdateSet={(id, field, value) => dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: indexOf(id), field, value } })}
      onToggleSet={(id) => dispatch({ type: 'TOGGLE_SET', payload: { exerciseIndex: 0, setIndex: indexOf(id) } })}
      onAddSet={() => {}} onRemoveSet={() => {}} />
  </>;
}

it('shows the suggestion as a placeholder without writing it', async () => {
  const view = await render(<Probe />);
  expect(view.getByLabelText('Set 1 weight in kilograms').props.placeholder).toBe('60');
  expect(view.getByLabelText('Set 1 weight in kilograms').props.value).toBe('');
});

it('completing an empty set with a suggestion shows the applied values in the row', async () => {
  const view = await render(<Probe />);
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  const sets = JSON.parse(view.getByTestId('state').props.children);
  expect(sets[0]).toMatchObject({ weight: '60', reps: '8', completed: true });
  expect(view.getByLabelText(/^Edit set 1: 60 kg × 8 reps, completed/)).toBeTruthy();
});

it('one-tap checks a set from the list using the same suggestion', async () => {
  const view = await render(<Probe />);
  await fireEvent.press(view.getByRole('checkbox', { name: 'Mark set 2 complete' }));
  const sets = JSON.parse(view.getByTestId('state').props.children);
  // Set 2 had no history of its own, so it reuses the last known set.
  expect(sets[1]).toMatchObject({ weight: '60', reps: '8', completed: true });
});
```

- [ ] **Step 2: Run it.** `npx jest src/components/logger/ExerciseSlide.suggestion.test.tsx --runInBand`. Expected: FAIL (placeholder is "—", and the row is hidden behind "Sets").
  The third test also depends on Task 3.4 (the list is visible by default). Do Step 3 item 5 below now, so all three pass at the end of this task.
- [ ] **Step 3: Implement in `ExerciseSlide.tsx`**
  1. Add the import:
     `import { describeSuggestion, suggestSet } from '@/features/workout/set-suggestion';`
  2. After `const completed = …;`, add:

```tsx
  // ponytail: same set index last session, else its last set. Per-warm-up matching if it ever matters.
  const previousFor = (index: number) => previous?.[index] ?? previous?.at(-1);
  const suggestionFor = (set: WorkoutSet, index: number) => suggestSet({ set, tracking: exercise.tracking, previous: previousFor(index), targetReps, targetDuration });
  const applySuggestion = (set: WorkoutSet, index: number) => {
    for (const [field, value] of Object.entries(suggestionFor(set, index))) onUpdateSet(set.id, field as Editable, value as string);
  };
```
  3. In the `onComplete` handler passed to `CurrentSetEditor`, insert `applySuggestion(captured, capturedIndex);` on the line **before** `onToggleSet(setId);` in the completing path (after `setLastCompleted({ … })`). Do not add it to the early `if (captured.completed) { … }` un-complete branch.
  4. Pass `suggestion={suggestionFor(active, activeIndex)}` to `<CurrentSetEditor …>`.
  5. Make the list visible by default:
     - Change `useState(false)` for `setsOpen` to `useState(true)`.
     - In the reset `useEffect`, change `setSetsOpen(false)` to `setSetsOpen(true)`.
     - Change the toggle's right-hand text from `{setsOpen ? 'Hide' : 'Manage'}` to `{setsOpen ? 'Hide' : 'Show'}`.
  6. In the `CompactSetRow` map, pass:

```tsx
suggestion={set.completed ? undefined : describeSuggestion(suggestionFor(set, index), exercise.tracking)}
onToggle={() => { if (!set.completed) applySuggestion(set, index); onToggleSet(set.id); }}
```
- [ ] **Step 4: Implement in `CompactSetRow.tsx`.**
  - Add `suggestion?: string` to the props.
  - Replace the `description` constant's final fallback `'Not logged'`, in both places it appears, with `suggestion ? suggestion + ' (suggested)' : 'Not logged'`.
  - When a suggestion is shown, render it with `tone="muted"`: pass `tone={set.reps || set.weight || set.duration ? 'default' : 'muted'}` to the description `<Text>`.
- [ ] **Step 5: Implement in `CurrentSetEditor.tsx`**
  1. Add `suggestion?: SetValues` to `CurrentSetEditorProps` (import the type from `@/features/workout/set-suggestion`) and destructure it.
  2. Delete the "Use previous" / "Undo copy" feature:
     - the `canUndo` state
     - the `undo` ref
     - the `copyable` and `copy` constants
     - the `useEffect` that clears `undo`
     - the `{copyable || canUndo ? (…) : null}` block
     - `setCanUndo(false); undo.current = null;` inside the `[setId]` effect
     - the `Copy` and `RotateCcw` imports

     Keep the `previousText` line ("2026-09-12 · 50 kg × 8 reps").
  3. Pass `suggested={suggestion?.weight}` to the weight `SetNumber`, `suggested={suggestion?.reps}` to the reps one, and `suggested={suggestion?.duration}` to the duration one.
  4. In `SetNumber`:
     - Add `suggested?: string` to its props.
     - On the `TextInput`, change `placeholder="—"` to `placeholder={suggested || '—'}`.
     - Add `accessibilityHint={!value.trim() && suggested ? \`Suggested ${suggested} ${unit}. Completing the set uses it.\` : undefined}`.
     - Keep every other `TextInput` prop.
- [ ] **Step 6: Update `CurrentSetEditor.test.tsx`.**
  - Delete the tests "copies only empty fields of the chosen set and allows Undo without completing it" and "copies and undoes a previous duration without changing other set data".
  - Remove `Copy` and `RotateCcw` from its lucide mock.
  - Add:

```tsx
it('shows a suggested value as the placeholder with a spoken hint', async () => {
  const view = await render(<CurrentSetEditor exercise={exercise} setId="set-1" suggestion={{ reps: '8' }} onChange={() => {}} onComplete={() => {}} />);
  const reps = view.getByLabelText('Set 1 repetitions');
  expect(reps.props.placeholder).toBe('8');
  expect(reps.props.accessibilityHint).toBe('Suggested 8 reps. Completing the set uses it.');
});
```
- [ ] **Step 7: Run the logger tests.**
  `npx jest src/components/logger --runInBand`. Expected: PASS. If `ExerciseSlide.test.tsx` "keeps completed sets editable behind a collapsed Sets disclosure" fails, rename it to "shows the other sets by default and can hide them", and change its first assertion to expect the row **present**. Then press `workout-sets-toggle` and expect it absent.
- [ ] **Step 8: Commit**

```bash
git add src/components/logger/ExerciseSlide.tsx src/components/logger/CurrentSetEditor.tsx src/components/logger/CompactSetRow.tsx src/components/logger/ExerciseSlide.suggestion.test.tsx src/components/logger/CurrentSetEditor.test.tsx src/components/logger/ExerciseSlide.test.tsx
git commit -m "feat(mobile): complete sets in one tap from suggestions"
```

---

### Task 3.3: ± buttons for weight, reps and duration

**Files:**
- Create: `src/features/workout/step-value.ts`
- Test: `src/features/workout/step-value.test.ts`
- Modify: `src/components/logger/CurrentSetEditor.tsx` (`SetNumber` and its three call sites)
- Update: `src/components/logger/CurrentSetEditor.test.tsx`

**Interfaces:**
- Produces: `stepValue(current: string, delta: number, decimals: number, fallback?: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workout/step-value.test.ts
import { stepValue } from './step-value';

it('adds and subtracts with the field precision', () => {
  expect(stepValue('60', 2.5, 2)).toBe('62.5');
  expect(stepValue('7.5', 2.5, 2)).toBe('10');
  expect(stepValue('8', -1, 0)).toBe('7');
});
it('starts an empty field from the suggestion, else zero', () => {
  expect(stepValue('', 2.5, 2, '60')).toBe('62.5');
  expect(stepValue('', 1, 0)).toBe('1');
});
it('never goes below zero and leaves non-numbers alone', () => {
  expect(stepValue('1', -2.5, 2)).toBe('0');
  expect(stepValue('abc', 1, 0)).toBe('abc');
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/workout/step-value.ts
/** Steps a numeric text field. An empty field starts from `fallback` (the suggestion) or 0. Never below 0. */
export function stepValue(current: string, delta: number, decimals: number, fallback = ''): string {
  const source = current.trim() || fallback.trim() || '0';
  const base = Number(source);
  if (!Number.isFinite(base)) return current;
  return String(Number(Math.max(0, base + delta).toFixed(decimals)));
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Add the buttons to `SetNumber`**
  1. Add a required prop `step: number` to `SetNumber`, and import `stepValue`, plus `Pressable` if it isn't already imported.
  2. Directly after the bordered number `View` (before the `hint`), render:

```tsx
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[-step, step].map((delta) => (
        <Pressable key={delta} accessibilityRole="button"
          accessibilityLabel={`${delta < 0 ? 'Decrease' : 'Increase'} ${title.toLowerCase()} by ${step} ${unit === 'kg' ? 'kilograms' : unit}`}
          onPress={() => { onChange(stepValue(value, delta, decimal ? 2 : 0, suggested)); void Haptics.selectionAsync(); }}
          style={({ pressed }) => ({ flex: 1, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center', borderRadius: radius.input, backgroundColor: pressed ? colors.pressed : colors.elevated })}>
          <Text variant="label" numeric>{delta < 0 ? `−${step}` : `+${step}`}</Text>
        </Pressable>
      ))}
    </View>
```
  3. Call sites: weight `step={2.5}`, reps `step={1}`, duration `step={5}`.
- [ ] **Step 6: Add a test to `CurrentSetEditor.test.tsx`**

```tsx
it('steps an empty weight from the suggestion', async () => {
  const change = jest.fn();
  const empty: WorkoutExercise = { ...exercise, sets: [{ ...exercise.sets[0], weight: '' }] };
  const view = await render(<CurrentSetEditor exercise={empty} setId="set-1" suggestion={{ weight: '60' }} onChange={change} onComplete={() => {}} />);
  await fireEvent.press(view.getByRole('button', { name: 'Increase weight by 2.5 kilograms' }));
  expect(change).toHaveBeenCalledWith('set-1', { weight: '62.5' });
});
```
  Add `Pressable` handling if the file's `@/components/ui` mock doesn't cover it. `Pressable` comes from `react-native` directly, so no mock is needed.
- [ ] **Step 7: Run.** `npx jest src/features/workout/step-value.test.ts src/components/logger --runInBand`. Expected: PASS.
- [ ] **Step 8: Commit**

```bash
git add src/features/workout/step-value.ts src/features/workout/step-value.test.ts src/components/logger/CurrentSetEditor.tsx src/components/logger/CurrentSetEditor.test.tsx
git commit -m "feat(mobile): add plus and minus steppers to set entry"
```

---

### Task 3.4: Visible sets list

Folded into Task 3.2 Step 3 item 5, because the one-tap test depends on it. Mark this task done when Task 3.2 is committed.

- [ ] **Step 1:** Confirm `ExerciseSlide.tsx` initialises `setsOpen` to `true` and shows "Hide"/"Show".

---

### Task 3.5: Exercise-name suggestions when adding an exercise

**Files:**
- Create: `src/features/workout/exercise-suggestions.ts`
- Test: `src/features/workout/exercise-suggestions.test.ts`
- Modify: `src/components/logger/WorkoutOverviewSheet.tsx`
- Modify: `app/(app)/logger.tsx` (previous-data query keeps names; `addExercise` takes a name; pass suggestions)

**Interfaces:**
- Consumes: `PlanDay` from `@/hooks/usePlans`
- Produces:
  - `planExerciseNames(days: readonly PlanDay[]): string[]`
  - `exerciseSuggestions(query: string, names: readonly string[], exclude?: readonly string[], limit?: number): string[]`
  - `WorkoutOverviewSheet` prop `suggestions?: string[]` and `onPickSuggestion?: (name: string) => void`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workout/exercise-suggestions.test.ts
import { exerciseSuggestions, planExerciseNames } from './exercise-suggestions';

const names = ['Bench press', 'Incline bench press', 'bench press', 'Cable fly', 'Squat'];

it('dedupes case-insensitively and ranks prefix matches first', () => {
  expect(exerciseSuggestions('ben', names)).toEqual(['Bench press']);
  expect(exerciseSuggestions('bench', names)).toEqual(['Bench press', 'Incline bench press']);
});
it('excludes exercises already in the session and caps the list', () => {
  expect(exerciseSuggestions('', names, ['squat'], 2)).toEqual(['Bench press', 'Incline bench press']);
});
it('collects plan exercises and their substitutions', () => {
  const days = [{ id: '1', day_number: 1, focus: null, notes: null, updated_at: null, exercises: [
    { name: 'Squat', sets: 3, reps: '5', warmupSets: 0, substitutions: [{ name: 'Leg press', sets: 3, reps: '10', warmupSets: 0, substitutions: [] }] },
  ] }];
  expect(planExerciseNames(days)).toEqual(['Squat', 'Leg press']);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/workout/exercise-suggestions.ts
import type { PlanDay } from '@/hooks/usePlans';

export function planExerciseNames(days: readonly PlanDay[]): string[] {
  return days.flatMap((day) => day.exercises.flatMap((exercise) => [exercise.name, ...exercise.substitutions.map((sub) => sub.name)]));
}

/** Known names only (plan + history). Prefix matches first, then contains. */
export function exerciseSuggestions(query: string, names: readonly string[], exclude: readonly string[] = [], limit = 6): string[] {
  const excluded = new Set(exclude.map((name) => name.trim().toLowerCase()));
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key) || excluded.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  const q = query.trim().toLowerCase();
  if (!q) return unique.slice(0, limit);
  const starts = unique.filter((name) => name.toLowerCase().startsWith(q));
  const contains = unique.filter((name) => !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Show suggestions in the sheet.** In `WorkoutOverviewSheet.tsx`:
  - Add the props `suggestions?: string[]` and `onPickSuggestion?: (name: string) => void`.
  - Import `OptionRow` from `@/components/ui`.
  - Between the `Input` and the "Add exercise" button, render:

```tsx
        {suggestions?.length && onPickSuggestion ? <View style={{ gap: spacing.xs }} accessibilityLabel="Suggested exercises">
          {suggestions.map((name) => <OptionRow key={name} label={name} selected={false} role="button" onPress={() => onPickSuggestion(name)} />)}
        </View> : null}
```
  Check `OptionRow`'s `role` prop type in `src/components/ui/OptionRow.tsx`. If `'button'` is not accepted, omit `role`.
  - Replace the helper line "Choose an exercise to view its sets. Your entries stay in place." with "Tap an exercise to jump to it." (copy rule F8).
- [ ] **Step 6: Wire the logger** (`app/(app)/logger.tsx`):
  1. In the `previousWorkoutData` query, store the original name. Change `result[key] = { date: log.date, tracking: …, sets: exercise.sets }` to include `name: exercise.name.trim()`. Change the result type to `Record<string, { name: string; date: string; tracking: string; sets: LoggedSet[] }>`.
  2. Replace `addExercise` with a version that takes a name:

```tsx
  const addExercise = (name = newExercise) => {
    if (!name.trim()) return;
    edit({ type: 'ADD_EXERCISE', payload: { name: name.trim() } }); setNewExercise(''); setIndex(state.exercises.length); setOverview(false); Keyboard.dismiss();
  };
```
  3. Before `return <KeyboardAvoidingView …>`, compute:

```tsx
  const suggestions = exerciseSuggestions(newExercise,
    [...planExerciseNames(session.plan?.days ?? []), ...Object.values(previous ?? {}).map((entry) => entry.name)],
    state.exercises.map((exercise) => exercise.name));
```
  4. Pass `suggestions={suggestions}`, `onPickSuggestion={(name) => addExercise(name)}` and `onAddExercise={() => addExercise()}` to `WorkoutOverviewSheet`.
  5. Import `exerciseSuggestions` and `planExerciseNames` from `@/features/workout/exercise-suggestions`.
- [ ] **Step 7: Verify.** `npm run typecheck && npx jest src/features/workout src/components/logger src/screens --runInBand`. Expected: PASS.
- [ ] **Step 8: Commit**

```bash
git add src/features/workout/exercise-suggestions.ts src/features/workout/exercise-suggestions.test.ts src/components/logger/WorkoutOverviewSheet.tsx "app/(app)/logger.tsx"
git commit -m "feat(mobile): suggest known exercises when adding one"
```

---

### Task 3.6: Workout history hook and personal records (pure)

**Files:**
- Create: `src/hooks/useWorkoutLogHistory.ts`
- Create: `src/features/workout/personal-records.ts`
- Test: `src/features/workout/personal-records.test.ts`

**Interfaces:**
- Consumes: `parseWorkoutContent`, `totalVolume` from `@/lib/workout-content`; `WorkoutExercise` from `./workoutReducer`
- Produces:
  - `type WorkoutLogRow = { id: string; date: string; content: unknown }`
  - `useWorkoutLogHistory()`: React Query, key `['workoutLogs', userId, 'history']`, newest first, up to 400 rows
  - `estimateOneRepMax(weight: number, reps: number): number | null`
  - `type ExerciseBest = { name: string; weight: number; e1rm: number }`
  - `bestsFromLogs(logs: readonly WorkoutLogRow[]): Map<string, ExerciseBest>` (key = lowercased trimmed name)
  - `type PersonalRecord = { exercise: string; kind: 'weight' | 'e1rm'; value: number; previous: number }`
  - `findPersonalRecords(exercises: readonly WorkoutExercise[], bests: ReadonlyMap<string, ExerciseBest>): PersonalRecord[]`
  - `lastSessionVolume(logs: readonly WorkoutLogRow[], planDayNumber: number | null): number | null`

- [ ] **Step 1: Write the failing test.** This covers Review Focus 5.

```ts
// src/features/workout/personal-records.test.ts
import { serializeWorkoutContent } from '@/lib/workout-content';

import { bestsFromLogs, estimateOneRepMax, findPersonalRecords, lastSessionVolume } from './personal-records';
import type { WorkoutExercise } from './workoutReducer';

const log = (id: string, date: string, day: number | null, sets: { weight: string; reps: string; completed: boolean; kind?: 'warmup' | 'work' }[]) => ({
  id, date, content: serializeWorkoutContent({ planDayNumber: day, exercises: [{ name: 'Bench press', sets: sets.map((set, i) => ({ setNumber: i + 1, rpe: '', ...set })) }] }),
});

it('estimates a one-rep max only for 1–12 reps', () => {
  expect(estimateOneRepMax(100, 1)).toBe(100);
  expect(estimateOneRepMax(60, 10)).toBe(80);
  expect(estimateOneRepMax(60, 15)).toBeNull();
  expect(estimateOneRepMax(0, 5)).toBeNull();
});

it('takes the best completed work set, skipping warm-ups and incomplete sets', () => {
  const bests = bestsFromLogs([log('a', '2026-09-20', 1, [
    { weight: '100', reps: '3', completed: true, kind: 'warmup' },
    { weight: '70', reps: '8', completed: true },
    { weight: '90', reps: '8', completed: false },
  ])]);
  expect(bests.get('bench press')).toEqual({ name: 'Bench press', weight: 70, e1rm: 88.7 });
});

it('ignores legacy and malformed logs', () => {
  const bests = bestsFromLogs([
    { id: 't', date: '2026-09-01', content: 'free text workout' },
    { id: 'o', date: '2026-09-02', content: JSON.stringify([{ Exercise: 'Bench press', Sets: '3', Reps: '8' }]) },
    { id: 'm', date: '2026-09-03', content: '{bad json' },
    log('n', '2026-09-04', 1, [{ weight: 'abc', reps: '8', completed: true }]),
  ]);
  expect(bests.size).toBe(0);
});

it('reports a weight record, else an estimated-max record, never on a first log', () => {
  const bests = bestsFromLogs([log('a', '2026-09-20', 1, [{ weight: '70', reps: '8', completed: true }])]);
  const today = (weight: string, reps: string): WorkoutExercise[] => [{ id: 'x', name: 'Bench Press ', tracking: 'weight-reps', sets: [{ id: 's', weight, reps, rpe: '', duration: '', kind: 'work', completed: true }] }];
  expect(findPersonalRecords(today('72.5', '8'), bests)).toEqual([{ exercise: 'Bench Press ', kind: 'weight', value: 72.5, previous: 70 }]);
  expect(findPersonalRecords(today('70', '10'), bests)).toEqual([{ exercise: 'Bench Press ', kind: 'e1rm', value: 93.3, previous: 88.7 }]);
  expect(findPersonalRecords(today('60', '8'), bests)).toEqual([]);
  expect(findPersonalRecords([{ ...today('100', '1')[0], name: 'Squat' }], bests)).toEqual([]);
});

it('finds the volume of the most recent log for the same plan day', () => {
  const logs = [log('new', '2026-09-24', 2, [{ weight: '50', reps: '10', completed: true }]), log('old', '2026-09-20', 1, [{ weight: '70', reps: '8', completed: true }])];
  expect(lastSessionVolume(logs, 1)).toBe(560);
  expect(lastSessionVolume(logs, 3)).toBeNull();
  expect(lastSessionVolume(logs, null)).toBeNull();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement the pure module**

```ts
// src/features/workout/personal-records.ts
import { parseWorkoutContent, totalVolume } from '@/lib/workout-content';

import type { WorkoutExercise } from './workoutReducer';

export type WorkoutLogRow = { id: string; date: string; content: unknown };
export type ExerciseBest = { name: string; weight: number; e1rm: number };
export type PersonalRecord = { exercise: string; kind: 'weight' | 'e1rm'; value: number; previous: number };

type SetLike = { weight: string; reps: string; completed?: boolean; kind?: 'warmup' | 'work' };

const keyOf = (name: string) => name.trim().toLowerCase();

/** Epley, one decimal. High-rep sets say little about a one-rep max, so only 1–12 reps. */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function bestOfSets(sets: readonly SetLike[]): { weight: number; e1rm: number } | null {
  let weight = 0;
  let e1rm = 0;
  for (const set of sets) {
    if (!set.completed || set.kind === 'warmup' || !set.weight.trim()) continue;
    const w = Number(set.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    weight = Math.max(weight, w);
    const estimate = estimateOneRepMax(w, Number(set.reps));
    if (estimate !== null) e1rm = Math.max(e1rm, estimate);
  }
  return weight > 0 ? { weight, e1rm } : null;
}

export function bestsFromLogs(logs: readonly WorkoutLogRow[]): Map<string, ExerciseBest> {
  const bests = new Map<string, ExerciseBest>();
  for (const log of logs) {
    const parsed = parseWorkoutContent(log.content);
    if (parsed.kind !== 'exercises') continue;
    for (const exercise of parsed.exercises) {
      if (exercise.tracking === 'duration') continue;
      const best = bestOfSets(exercise.sets);
      if (!best) continue;
      const key = keyOf(exercise.name);
      const current = bests.get(key);
      bests.set(key, { name: current?.name ?? exercise.name.trim(), weight: Math.max(best.weight, current?.weight ?? 0), e1rm: Math.max(best.e1rm, current?.e1rm ?? 0) });
    }
  }
  return bests;
}

/** One record per exercise: heavier weight first, else a higher estimated max. A first-ever log is a baseline, not a record. */
export function findPersonalRecords(exercises: readonly WorkoutExercise[], bests: ReadonlyMap<string, ExerciseBest>): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  for (const exercise of exercises) {
    if (exercise.tracking === 'duration') continue;
    const previous = bests.get(keyOf(exercise.name));
    const today = bestOfSets(exercise.sets);
    if (!previous || !today) continue;
    if (today.weight > previous.weight) records.push({ exercise: exercise.name, kind: 'weight', value: today.weight, previous: previous.weight });
    else if (previous.e1rm > 0 && today.e1rm > previous.e1rm) records.push({ exercise: exercise.name, kind: 'e1rm', value: today.e1rm, previous: previous.e1rm });
  }
  return records;
}

/** Logs must be newest first (as useWorkoutLogHistory returns them). */
export function lastSessionVolume(logs: readonly WorkoutLogRow[], planDayNumber: number | null): number | null {
  if (planDayNumber === null) return null;
  for (const log of logs) {
    const parsed = parseWorkoutContent(log.content);
    if (parsed.kind === 'exercises' && parsed.version === 2 && parsed.planDayNumber === planDayNumber) return totalVolume(parsed.exercises);
  }
  return null;
}
```

- [ ] **Step 4: Run it.** Expected: PASS (5 tests). If the `88.7`/`93.3` expectations are off by rounding, recheck the Epley arithmetic by hand before changing the tests:
  - 70 × (1 + 8/30) = 88.67 → 88.7
  - 70 × (1 + 10/30) = 93.33 → 93.3
- [ ] **Step 5: Create the history hook**

```ts
// src/hooks/useWorkoutLogHistory.ts
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import type { WorkoutLogRow } from '@/features/workout/personal-records';
import { supabase } from '@/lib/supabase';

/** Newest first. Shares the 'workoutLogs' prefix, so existing invalidations refresh it. */
export function useWorkoutLogHistory() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['workoutLogs', userId, 'history'],
    queryFn: async (): Promise<WorkoutLogRow[]> => {
      const { data, error } = await supabase.from('workout_logs').select('id, date, content')
        .eq('user_id', userId!).order('date', { ascending: false }).limit(400);
      if (error) throw error;
      return (data ?? []) as WorkoutLogRow[];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 6: Typecheck.** `npm run typecheck`. Expected: PASS.
- [ ] **Step 7: Commit**

```bash
git add src/features/workout/personal-records.ts src/features/workout/personal-records.test.ts src/hooks/useWorkoutLogHistory.ts
git commit -m "feat(mobile): detect personal records from workout history"
```

---

### Task 3.7: A rewarding workout summary

**Files:**
- Modify: `src/components/logger/WorkoutSummary.tsx`
- Modify: `app/(app)/logger.tsx` (`finish()`, and the `review` render at line ~202)
- Update: `src/components/logger/WorkoutSummary.test.tsx`

**Interfaces:**
- Consumes: `PersonalRecord`, `bestsFromLogs`, `findPersonalRecords`, `lastSessionVolume` and `useWorkoutLogHistory` (Task 3.6)
- Produces: `WorkoutSummary` props `records?: PersonalRecord[]; previousVolume?: number | null`

- [ ] **Step 1: Write the failing tests.** Append to `WorkoutSummary.test.tsx`:

```tsx
it('celebrates new bests once when the workout is saved', async () => {
  const Haptics = require('expo-haptics');
  const records = [{ exercise: 'Bench press', kind: 'weight' as const, value: 62.5, previous: 60 }];
  const view = await render(<WorkoutSummary result={result} records={records} syncStatus="synced" onDone={() => {}} onSave={() => {}} onEdit={() => {}} receiptRevision={1} />);
  expect(view.getByText('New bests')).toBeTruthy();
  expect(view.getByText('Bench press · 62.5 kg (was 60 kg)')).toBeTruthy();
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
});

it('compares volume with the last session of the same plan day', async () => {
  const view = await render(<WorkoutSummary result={result} previousVolume={350} syncStatus="review" onDone={() => {}} onSave={() => {}} onEdit={() => {}} />);
  expect(view.getByText('50 kg more than last time')).toBeTruthy();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement in `WorkoutSummary.tsx`**
  1. Add to `Props`: `records?: PersonalRecord[]; previousVolume?: number | null;`. Import `type PersonalRecord` from `@/features/workout/personal-records`, `* as Haptics` from `expo-haptics`, and `useEffect` from `react`.
  2. Inside the component, before `return`:

```tsx
  const bests = records ?? [];
  const saved = syncStatus === 'synced' || syncStatus === 'queued';
  useEffect(() => {
    if (saved && bests.length > 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [saved, receiptRevision]); // eslint-disable-line react-hooks/exhaustive-deps -- once per saved receipt
  const volumeDelta = previousVolume && result.volume > 0 ? result.volume - previousVolume : null;
```
  3. Inside the metrics `Card`, after the Volume `CompletionValue`:

```tsx
      {volumeDelta !== null && volumeDelta !== 0 ? <Text variant="bodySm" tone="muted">{Math.abs(volumeDelta).toLocaleString()} kg {volumeDelta > 0 ? 'more' : 'less'} than last time</Text> : null}
```
  4. After the metrics `Card`:

```tsx
    {bests.length ? <Card testID="workout-summary-bests" style={{ gap: spacing.sm, padding: 24, borderRadius: 24 }}>
      <Text variant="h2">New bests</Text>
      {bests.map((record) => <Text key={record.exercise + record.kind} variant="body">
        {record.kind === 'weight'
          ? `${record.exercise.trim()} · ${record.value} kg (was ${record.previous} kg)`
          : `${record.exercise.trim()} · estimated max ${record.value} kg (was ${record.previous} kg)`}
      </Text>)}
    </Card> : null}
```
- [ ] **Step 4: Wire the logger** (`app/(app)/logger.tsx`):
  1. `const history = useWorkoutLogHistory();` near the other hooks.
  2. `const [records, setRecords] = useState<PersonalRecord[]>([]);` and `const [previousVolume, setPreviousVolume] = useState<number | null>(null);`
  3. Inside `finish()`, before `setReview(true)`:

```tsx
    const earlier = (history.data ?? []).filter((row) => row.id !== state.existingLogId && row.date <= date);
    setRecords(findPersonalRecords(state.exercises, bestsFromLogs(earlier)));
    setPreviousVolume(lastSessionVolume(earlier, state.selectedDay));
```
     Records are computed when review opens, so the just-saved workout can never compete with itself.
  4. Pass `records={records}` and `previousVolume={previousVolume}` to `<WorkoutSummary …>` at line ~202.
  5. Imports: `useWorkoutLogHistory` from `@/hooks/useWorkoutLogHistory`, and `bestsFromLogs`, `findPersonalRecords`, `lastSessionVolume`, `type PersonalRecord` from `@/features/workout/personal-records`.
- [ ] **Step 5: Keep the logger tests green.** Add this mock to any test file that renders `app/(app)/logger` (`grep -rln "(app)/logger'" src`):

```tsx
jest.mock('@/hooks/useWorkoutLogHistory', () => ({ useWorkoutLogHistory: () => ({ data: [] }) }));
```
- [ ] **Step 6: Run everything for this phase.** `npm run verify`. Expected: PASS.
- [ ] **Step 7: Commit**

```bash
git add src/components/logger/WorkoutSummary.tsx src/components/logger/WorkoutSummary.test.tsx "app/(app)/logger.tsx" src/features/workout src/screens
git commit -m "feat(mobile): celebrate personal records in the workout summary"
```

**Phase 3 exit:** `npm run verify` passes. Manual check (web export or device):
- On a plan day with history, completing a set needs **one tap**.
- The row shows the values that were used.
- "New bests" appears when a heavier weight is logged.
