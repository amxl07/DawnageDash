# Phase 5: Plan-first nutrition implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. No owner gate. No database change: the meal log is stored on the device only (owner decision in README).

**Goal:** Give the Nutrition tab a daily job and stop clients typing macros (F5, X3, part of F3):
- Tick each meal from the coach's plan: **Ate it / Swapped / Skipped**.
- The app totals the macros of the meals marked "Ate it".
- The check-in offers to use those totals with one visible, editable tap.

**Architecture:**
- A pure module (`meal-log.ts`) holds the storage format and the totals.
- A React Query hook (`useMealLog.ts`) reads and writes AsyncStorage per `(user, reporting date)`.
- One component on the Nutrition tab (`TodayMeals.tsx`).
- One component in the check-in adherence step (`MealLogFill.tsx`).
- The meal rows already carry `calories/protein/carbs/fats` (`Meal` in `src/hooks/usePlans.ts`).

**Tech stack:** `@react-native-async-storage/async-storage`, @tanstack/react-query, the existing `SegmentedControl` and `Section` UI components, `useHomeDate()` for the reporting date.

**Spec:** [F5, X3](../../specs/2026-09-26-market-review-findings.md#f5-p1-the-nutrition-tab-has-nothing-to-do).

---

### Task 5.1: Meal-log model and storage (pure + AsyncStorage)

**Files:**
- Create: `src/features/nutrition/meal-log.ts`
- Test: `src/features/nutrition/meal-log.test.ts`

**Interfaces:**
- Consumes: `Meal` from `@/hooks/usePlans` (`{ meal_type; description; calories; protein; carbs; fats }`, numbers or null)
- Produces:
  - `MEAL_STATUSES = ['planned', 'swapped', 'skipped']`
  - `type MealStatus`
  - `type MealLog = Record<string, MealStatus>`, keyed by `meal_type`
  - `mealLogKey(userId: string, date: string): string`
  - `readMealLog(userId: string, date: string): Promise<MealLog>`
  - `writeMealLog(userId: string, date: string, log: MealLog): Promise<void>`
  - `type MealTotals = { calories: number; protein: number; carbs: number; fats: number; planned: number; swapped: number; skipped: number; unanswered: number; missingValues: boolean }`
  - `mealLogTotals(meals: readonly Meal[], log: MealLog): MealTotals`

- [ ] **Step 1: Write the failing test.** This covers Review Focus 3.

```ts
// src/features/nutrition/meal-log.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Meal } from '@/hooks/usePlans';

import { mealLogKey, mealLogTotals, readMealLog, writeMealLog } from './meal-log';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')); // eslint-disable-line @typescript-eslint/no-require-imports

const meals: Meal[] = [
  { meal_type: 'Breakfast', description: 'Oats', calories: 550, protein: 30, carbs: 70, fats: 15 },
  { meal_type: 'Lunch', description: 'Rice bowl', calories: 750, protein: 45, carbs: 90, fats: 20 },
  { meal_type: 'Dinner', description: null, calories: 700, protein: null, carbs: 60, fats: 25 },
];

beforeEach(() => AsyncStorage.clear());

it('totals only meals eaten as planned and reports what is not covered', () => {
  expect(mealLogTotals(meals, { Breakfast: 'planned', Lunch: 'swapped' })).toEqual({
    calories: 550, protein: 30, carbs: 70, fats: 15, planned: 1, swapped: 1, skipped: 0, unanswered: 1, missingValues: false,
  });
});

it('flags planned meals whose plan has a missing value', () => {
  expect(mealLogTotals(meals, { Dinner: 'planned' }).missingValues).toBe(true);
});

it('reads and writes the log for the given date key only', async () => {
  await writeMealLog('u1', '2026-09-26', { Breakfast: 'planned' });
  expect(await readMealLog('u1', '2026-09-26')).toEqual({ Breakfast: 'planned' });
  expect(await readMealLog('u1', '2026-09-27')).toEqual({});
  expect(await readMealLog('u2', '2026-09-26')).toEqual({});
});

it('drops unknown statuses and survives corrupt storage', async () => {
  await AsyncStorage.setItem(mealLogKey('u1', '2026-09-26'), JSON.stringify({ Breakfast: 'planned', Lunch: 'maybe' }));
  expect(await readMealLog('u1', '2026-09-26')).toEqual({ Breakfast: 'planned' });
  await AsyncStorage.setItem(mealLogKey('u1', '2026-09-26'), '{not json');
  expect(await readMealLog('u1', '2026-09-26')).toEqual({});
});
```

- [ ] **Step 2: Run it.** `npx jest src/features/nutrition/meal-log.test.ts --runInBand`. Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/nutrition/meal-log.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Meal } from '@/hooks/usePlans';

export const MEAL_STATUSES = ['planned', 'swapped', 'skipped'] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];
/** Keyed by Meal.meal_type ("Breakfast", "Mid Morning Snack", …). */
export type MealLog = Record<string, MealStatus>;
export type MealTotals = {
  calories: number; protein: number; carbs: number; fats: number;
  planned: number; swapped: number; skipped: number; unanswered: number;
  /** A meal marked "planned" has a null value in the coach's plan, so the total is partial. */
  missingValues: boolean;
};

// ponytail: device-only, one small key per day. Move to a table if coaches need to see meal ticks.
export const mealLogKey = (userId: string, date: string) => `meal-log:${userId}:${date}`;

const isStatus = (value: unknown): value is MealStatus => (MEAL_STATUSES as readonly unknown[]).includes(value);

export async function readMealLog(userId: string, date: string): Promise<MealLog> {
  const raw = await AsyncStorage.getItem(mealLogKey(userId, date));
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isStatus(value))) as MealLog;
  } catch {
    return {};
  }
}

export async function writeMealLog(userId: string, date: string, log: MealLog): Promise<void> {
  await AsyncStorage.setItem(mealLogKey(userId, date), JSON.stringify(log));
}

export function mealLogTotals(meals: readonly Meal[], log: MealLog): MealTotals {
  const totals: MealTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, planned: 0, swapped: 0, skipped: 0, unanswered: 0, missingValues: false };
  for (const meal of meals) {
    const status = log[meal.meal_type];
    if (!status) { totals.unanswered += 1; continue; }
    totals[status] += 1;
    if (status !== 'planned') continue;
    for (const key of ['calories', 'protein', 'carbs', 'fats'] as const) {
      const value = meal[key];
      if (value === null || !Number.isFinite(value)) totals.missingValues = true;
      else totals[key] += value;
    }
  }
  return { ...totals, calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fats: Math.round(totals.fats) };
}
```

- [ ] **Step 4: Run it.** Expected: PASS (4 tests).
- [ ] **Step 5: Commit**

```bash
git add src/features/nutrition/meal-log.ts src/features/nutrition/meal-log.test.ts
git commit -m "feat(mobile): add device meal log model"
```

---

### Task 5.2: "Today" meal check-offs on the Nutrition tab

**Files:**
- Create: `src/features/nutrition/useMealLog.ts`
- Create: `src/features/nutrition/TodayMeals.tsx`
- Modify: `src/features/nutrition/nutrition-screen.tsx` (render `TodayMeals` under the plan)
- Test: `src/features/nutrition/TodayMeals.test.tsx`
- Update: `src/screens/__tests__/tabs/nutrition.test.tsx` (mock the new hook)

**Interfaces:**
- Consumes: Task 5.1; `useHomeDate()` from `@/features/home/useHomeDate` (the current reporting date key)
- Produces:
  - `useMealLog(date: string)`, returning `{ log: MealLog; isLoading: boolean; isError: boolean; setStatus: (mealType: string, status: MealStatus) => void }`
  - `TodayMeals({ date, meals }: { date: string; meals: readonly Meal[] })`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/nutrition/TodayMeals.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';

import { TodayMeals } from './TodayMeals';

const mockSetStatus = jest.fn();
let mockLog: Record<string, string> = {};
jest.mock('./useMealLog', () => ({ useMealLog: () => ({ log: mockLog, isLoading: false, isError: false, setStatus: mockSetStatus }) }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    Text,
    Section: ({ title, children }: { title: string; children: React.ReactNode }) => <View><Text>{title}</Text>{children}</View>,
    SegmentedControl: ({ label, segments, onChange }: { label: string; segments: { value: string; label: string }[]; onChange: (v: string) => void }) => (
      <View accessibilityLabel={label}>{segments.map((s) => <Pressable key={s.value} accessibilityRole="button" accessibilityLabel={`${label}: ${s.label}`} onPress={() => onChange(s.value)}><Text>{s.label}</Text></Pressable>)}</View>
    ),
  };
});

const meals = [
  { meal_type: 'Breakfast', description: 'Oats', calories: 550, protein: 30, carbs: 70, fats: 15 },
  { meal_type: 'Lunch', description: null, calories: 750, protein: 45, carbs: 90, fats: 20 },
];

beforeEach(() => { jest.clearAllMocks(); mockLog = {}; });

it('records a status for a meal', async () => {
  const view = await render(<TodayMeals date="2026-09-26" meals={meals} />);
  await fireEvent.press(view.getByRole('button', { name: 'Breakfast: Ate it' }));
  expect(mockSetStatus).toHaveBeenCalledWith('Breakfast', 'planned');
});

it('totals eaten meals and explains swaps', async () => {
  mockLog = { Breakfast: 'planned', Lunch: 'swapped' };
  const view = await render(<TodayMeals date="2026-09-26" meals={meals} />);
  expect(view.getByText('So far: 550 kcal · 30 g protein')).toBeTruthy();
  expect(view.getByText('Swapped meals aren’t counted. Add what you ate in your check-in.')).toBeTruthy();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement the hook**

```ts
// src/features/nutrition/useMealLog.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';

import { readMealLog, writeMealLog, type MealLog, type MealStatus } from './meal-log';

export function useMealLog(date: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const key = ['mealLog', userId, date] as const;
  const query = useQuery({ queryKey: key, queryFn: () => readMealLog(userId!, date), enabled: Boolean(userId) });
  const mutation = useMutation({
    mutationFn: async ({ mealType, status }: { mealType: string; status: MealStatus }): Promise<MealLog> => {
      const next = { ...(await readMealLog(userId!, date)), [mealType]: status };
      await writeMealLog(userId!, date, next);
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(key, next),
  });
  return {
    log: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError || mutation.isError,
    setStatus: (mealType: string, status: MealStatus) => mutation.mutate({ mealType, status }),
  };
}
```

- [ ] **Step 4: Implement the component**

```tsx
// src/features/nutrition/TodayMeals.tsx
import { View } from 'react-native';

import { Section, SegmentedControl, Text } from '@/components/ui';
import type { Meal } from '@/hooks/usePlans';
import { spacing } from '@/theme';

import { mealLogTotals, type MealStatus } from './meal-log';
import { useMealLog } from './useMealLog';

const SEGMENTS: { value: MealStatus; label: string }[] = [
  { value: 'planned', label: 'Ate it' },
  { value: 'swapped', label: 'Swapped' },
  { value: 'skipped', label: 'Skipped' },
];

export function TodayMeals({ date, meals }: { date: string; meals: readonly Meal[] }) {
  const { log, isError, setStatus } = useMealLog(date);
  const totals = mealLogTotals(meals, log);
  return <Section title="Today" subtitle="Tick meals as you eat them.">
    <View style={{ gap: spacing.base }} testID="today-meals">
      {meals.map((meal) => (
        <View key={meal.meal_type} style={{ gap: spacing.sm }}>
          <Text variant="body">{meal.meal_type}{meal.calories !== null ? ` · ${meal.calories} kcal` : ''}</Text>
          <SegmentedControl label={meal.meal_type} showLabel={false} segments={SEGMENTS} value={log[meal.meal_type] ?? null} onChange={(status) => setStatus(meal.meal_type, status)} />
        </View>
      ))}
      {totals.planned > 0 ? <Text variant="bodySm" tone="muted" numeric accessibilityLiveRegion="polite">So far: {totals.calories.toLocaleString()} kcal · {totals.protein} g protein</Text> : null}
      {totals.swapped > 0 ? <Text variant="bodySm" tone="muted">Swapped meals aren’t counted. Add what you ate in your check-in.</Text> : null}
      {isError ? <Text variant="bodySm" tone="destructive">Couldn’t save that on this device. Try again.</Text> : null}
    </View>
  </Section>;
}
```
  `Section` accepts `title` and `subtitle`. `SegmentedControl` types `value` as `T | null` (`SegmentedControl.types.ts:8`), so `null` means "not answered yet".
- [ ] **Step 5: Mount it.** In `nutrition-screen.tsx`:
  - Import `TodayMeals` and `useHomeDate`.
  - Add `const today = useHomeDate();` at the top of the component.
  - Directly after `<MealPlanDetails … />`, add:
    `{meal.meals.length ? <TodayMeals date={today} meals={meal.meals} /> : null}`
- [ ] **Step 6: Keep the tab test green.** In `src/screens/__tests__/tabs/nutrition.test.tsx`, add:
  - `jest.mock('@/features/nutrition/TodayMeals', () => ({ TodayMeals: () => null }));`
  - `jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => '2026-09-26' }));`
- [ ] **Step 7: Run.** `npx jest src/features/nutrition src/screens/__tests__/tabs/nutrition.test.tsx --runInBand`. Expected: PASS.
- [ ] **Step 8: Commit**

```bash
git add src/features/nutrition/useMealLog.ts src/features/nutrition/TodayMeals.tsx src/features/nutrition/TodayMeals.test.tsx src/features/nutrition/nutrition-screen.tsx src/screens/__tests__/tabs/nutrition.test.tsx
git commit -m "feat(mobile): tick off today's meals from the coach's plan"
```

---

### Task 5.3: Use meal-log totals in the check-in

**Files:**
- Create: `src/features/checkin/components/MealLogFill.tsx`
- Test: `src/features/checkin/components/MealLogFill.test.tsx`
- Modify: `src/components/checkin/CheckInForm.tsx` (optional prop `mealLog`; render at the top of the adherence `Card`)
- Modify: `src/features/checkin/CheckInEditorScreen.tsx` (compute and pass totals for `editor.date`)

**Interfaces:**
- Consumes: `MealTotals`, `mealLogTotals` (Task 5.1); `useMealLog` (Task 5.2); `useMealPlan` from `@/hooks/usePlans`
- Produces:
  - `MealLogFill({ totals, onApply }: { totals: MealTotals; onApply: () => void })`
  - `CheckInForm` prop `mealLog?: MealTotals | null`

- [ ] **Step 1: Write the failing test.** This covers Review Focus 1.

```tsx
// src/features/checkin/components/MealLogFill.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';

import { MealLogFill } from './MealLogFill';

jest.mock('@/components/ui', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    Text,
    Card: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>,
  };
});

const totals = { calories: 1850, protein: 140, carbs: 180, fats: 60, planned: 3, swapped: 1, skipped: 0, unanswered: 1, missingValues: false };

it('meal-log fill only changes fields after the button press', async () => {
  const apply = jest.fn();
  const view = await render(<MealLogFill totals={totals} onApply={apply} />);
  expect(view.getByText('From your meal log: 1,850 kcal · protein 140 g · carbs 180 g · fats 60 g')).toBeTruthy();
  expect(view.getByText('Covers 3 planned meals. Add anything else you ate before you submit.')).toBeTruthy();
  expect(apply).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Use these values' }));
  expect(apply).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```tsx
// src/features/checkin/components/MealLogFill.tsx
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { MealTotals } from '@/features/nutrition/meal-log';
import { spacing } from '@/theme';

export function MealLogFill({ totals, onApply }: { totals: MealTotals; onApply: () => void }) {
  const partial = totals.swapped > 0 || totals.unanswered > 0 || totals.missingValues;
  return <View testID="checkin-meal-log-fill" style={{ gap: spacing.sm }}>
    <Text variant="bodySm" numeric>
      From your meal log: {totals.calories.toLocaleString()} kcal · protein {totals.protein} g · carbs {totals.carbs} g · fats {totals.fats} g
    </Text>
    {partial ? <Text variant="bodySm" tone="muted">
      Covers {totals.planned} planned {totals.planned === 1 ? 'meal' : 'meals'}. Add anything else you ate before you submit.
    </Text> : null}
    <Button label="Use these values" variant="secondary" onPress={onApply} />
  </View>;
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Render it in the form.** In `CheckInForm.tsx`:
  1. Add `mealLog?: MealTotals | null` to `Props` and destructure it. Import `type MealTotals` from `@/features/nutrition/meal-log` and `MealLogFill` from `@/features/checkin/components/MealLogFill`.
  2. In the `if (step === 'adherence')` branch, make this the **first** child of the `<Card>`:

```tsx
        {mealLog && mealLog.planned > 0 ? <MealLogFill totals={mealLog} onApply={() => setForm((prev) => ({
          ...prev, calorieIntake: mealLog.calories, protein: mealLog.protein, carbs: mealLog.carbs, fats: mealLog.fats,
        }))} /> : null}
```
- [ ] **Step 6: Pass the totals from the editor.** In `CheckInEditorScreen.tsx`, inside the component that renders `<CheckInForm …>`:

```tsx
  const mealPlan = useMealPlan();
  const mealLog = useMealLog(editor.date);
  const mealTotals = mealPlan.data?.meals.length ? mealLogTotals(mealPlan.data.meals, mealLog.log) : null;
```
  Pass `mealLog={mealTotals}` to `<CheckInForm …>`. Import `useMealPlan` from `@/hooks/usePlans`, `useMealLog` from `@/features/nutrition/useMealLog` and `mealLogTotals` from `@/features/nutrition/meal-log`.
  `editor.date` is the reporting date being edited, so a backfilled Tuesday uses Tuesday's meal log (Review Focus 3).
- [ ] **Step 7: Keep editor tests green.** In each test file that renders `CheckInEditorScreen` (`grep -rln "CheckInEditorScreen\|daily-check-in'" src`), add:

```tsx
jest.mock('@/features/nutrition/useMealLog', () => ({ useMealLog: () => ({ log: {}, isLoading: false, isError: false, setStatus: jest.fn() }) }));
```
  If `useMealPlan` is not already mocked there, extend the existing `@/hooks/usePlans` mock with `useMealPlan: () => ({ data: undefined })`.
- [ ] **Step 8: Run.** `npx jest src/features/checkin src/components/checkin src/features/nutrition src/screens --runInBand && npm run typecheck`. Expected: PASS.
- [ ] **Step 9: Commit**

```bash
git add src/features/checkin/components/MealLogFill.tsx src/features/checkin/components/MealLogFill.test.tsx src/components/checkin/CheckInForm.tsx src/features/checkin/CheckInEditorScreen.tsx src/features/checkin src/screens
git commit -m "feat(mobile): fill check-in macros from the meal log on request"
```

**Phase 5 exit:** `npm run verify` passes. On the Nutrition tab, ticking Breakfast and Lunch as "Ate it" shows a running total. The evening check-in offers "Use these values" and fills calories and macros only after the tap.
