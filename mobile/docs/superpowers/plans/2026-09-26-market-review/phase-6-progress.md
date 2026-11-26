# Phase 6: Progress implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. Needs Phase 3 Task 3.6 (`personal-records.ts`, `useWorkoutLogHistory`). No owner gate.

**Goal:** Let clients see what they've accomplished (F7):
- Fix the Measurements chart that never renders.
- Add a smoothed weight trend.
- Add strength progress per lift.
- Add a Progress screen with a "since you started" summary.
- Point Home at it.

**Architecture:**
- Two pure modules in `src/features/progress/`: `weight-trend.ts` and `strength-progress.ts`, plus a pure view model in `progress-summary.ts`.
- One screen, `ProgressScreen.tsx`, mounted at `app/(app)/progress.tsx`. Phase 7 makes it a tab by editing `src/features/progress/routes.ts`.
- Reuse the existing `LineChart`, `useDailyCheckIns`, `useWorkoutLogHistory`, `useProgressPhotos` and `useUserProfile`.

**Tech stack:** Existing SVG `LineChart` (`src/components/charts`), date helpers in `@/lib/dates`, React Query.

**Spec:** [F7](../../specs/2026-09-26-market-review-findings.md#f7-p2-progress-is-hidden-and-doesnt-show-since-you-started).

---

### Task 6.1: The Measurements chart renders immediately

**Files:**
- Modify: `app/(app)/measurements.tsx` (delete the lazy-mount machinery, lines ~66-140 and the `onLayout` / `onScrollEndDrag` props near line ~277)
- Modify: `src/features/measurements/MeasurementProgress.tsx` (drop the `chartReady` and `onLayout` props and the placeholder)
- Test: the existing MeasurementProgress / measurements tests (`ls src/features/measurements src/screens/__tests__ | grep -i measure`)

- [ ] **Step 1: Write the failing test.** In the existing MeasurementProgress test file (create `src/features/measurements/MeasurementProgress.test.tsx` if none exists), add a test that renders `<MeasurementProgress rows={rows} />` with two waist rows and asserts:

```tsx
expect(view.queryByText('Chart loads when it comes into view.')).toBeNull();
```
  Use these rows:
  `[{ id: '1', user_id: 'u', date: '2026-09-01', chest: null, waist: 80, hips: null, thighs: null, arms: null }, { id: '2', user_id: 'u', date: '2026-09-15', chest: null, waist: 78, hips: null, thighs: null, arms: null }]`
  Copy the mocks (theme, ui, charts) from the file's existing tests if they exist. If you are creating the file, mock `@/components/charts` with `{ LineChart: () => null }`.
- [ ] **Step 2: Run it.** Expected: FAIL. TypeScript may also complain that `chartReady` and `onLayout` are missing. That is expected until Step 3.
- [ ] **Step 3: Simplify `MeasurementProgress.tsx`.**
  1. Change the signature to `export function MeasurementProgress({ rows }: { rows: BodyMeasurement[] })`.
  2. Remove `onLayout={onLayout}` from the root `<Card>`, and remove the `LayoutChangeEvent` import if it's unused.
  3. Replace the whole `{chartReady && hasValues ? <LineChart … /> : <>…</>}` expression with:

```tsx
      {hasValues ? <LineChart key={`${metric}-${timeframe}`} height={200} series={chartSeries}
        legend={secondary ? 'names' : false} defaultSelectedDate={latestDate} renderReadout={renderReadout} readoutDescription={readoutDescription}
        summary={/* keep the existing summary string exactly as it is today */ summaryText} /> : renderReadout(latestDate)}
```
     Move the existing `summary={…}` template literal into a `const summaryText = …;` above the `return`, unchanged.
- [ ] **Step 4: Delete the lazy-mount code in `app/(app)/measurements.tsx`.** Delete:
  - the state and refs `chartReady`, `chartRequested`, `chartLayout`, `viewportHeight`, `scrollOffset` and `pendingChartMount`
  - the callbacks `mountChartWhenVisible`, `handleListLayout`, `handleProgressLayout` and `handleScrollSettled` (and any scroll handler that only fed them)
  - the cleanup `useEffect` that cancels `pendingChartMount`
  - the props `onLayout={handleListLayout}` and `onScrollEndDrag={handleScrollSettled}` (and any `onMomentumScrollEnd` / `onScroll` that only called those handlers)

  Change the render to `<MeasurementProgress rows={rows ?? []} />`. Remove imports that become unused (`InteractionManager`, `LayoutChangeEvent`, `useCallback`/`useRef` if unused). Run `npm run typecheck` and `npm run lint` to find leftovers.
- [ ] **Step 5: Run.** `npx jest src/features/measurements src/screens --runInBand && npm run typecheck`. Expected: PASS. Delete assertions in existing tests that checked for the placeholder text or the lazy mount. They tested behaviour that no longer exists.
- [ ] **Step 6: Commit**

```bash
git add "app/(app)/measurements.tsx" src/features/measurements src/screens
git commit -m "fix(mobile): render the measurement chart immediately"
```

---

### Task 6.2: Weight trend (pure)

**Files:**
- Modify: `src/features/home/weekly-recap.ts` (export the existing `uniqueCheckIns`)
- Create: `src/features/progress/weight-trend.ts`
- Test: `src/features/progress/weight-trend.test.ts`

**Interfaces:**
- Consumes: `uniqueCheckIns(rows, today)` from `@/features/home/weekly-recap`; `parseLocalDate` and `localDateString` from `@/lib/dates`
- Produces:
  - `type TrendPoint = { date: string; value: number; average: number }`
  - `type WeightTrend = { points: TrendPoint[]; latestAverage: number | null; changeSinceStart: number | null; changeLast4Weeks: number | null }`
  - `weightTrend(rows: readonly DailyCheckIn[], today: string): WeightTrend`
  - `shiftDays(date: string, days: number): string`

- [ ] **Step 1: Export the de-duplicator.** In `weekly-recap.ts`, change `function uniqueCheckIns(` to `export function uniqueCheckIns(`. Change nothing else.
- [ ] **Step 2: Write the failing test**

```ts
// src/features/progress/weight-trend.test.ts
import type { DailyCheckIn } from '@/types/db';

import { shiftDays, weightTrend } from './weight-trend';

const row = (date: string, weight: number | string | null): DailyCheckIn => ({ id: date, user_id: 'u', date, morning_weight: weight } as DailyCheckIn);

it('shifts local date keys across month ends', () => {
  expect(shiftDays('2026-10-01', -1)).toBe('2026-09-30');
  expect(shiftDays('2026-09-26', -28)).toBe('2026-08-29');
});

it('smooths weigh-ins with an exponential moving average', () => {
  const trend = weightTrend([row('2026-09-01', 80), row('2026-09-02', 82), row('2026-09-03', '79')], '2026-09-26');
  expect(trend.points.map((p) => p.average)).toEqual([80, 80.5, 80.1]);
  expect(trend.latestAverage).toBe(80.1);
  expect(trend.changeSinceStart).toBe(0.1);
});

it('ignores future, missing and out-of-range weights', () => {
  const trend = weightTrend([row('2026-09-01', 80), row('2026-09-02', null), row('2026-09-03', 900), row('2026-09-30', 70)], '2026-09-26');
  expect(trend.points.map((p) => p.date)).toEqual(['2026-09-01']);
  expect(trend.changeSinceStart).toBeNull();
});

it('reports the four-week change from the trend at or before 28 days ago', () => {
  const trend = weightTrend([row('2026-08-20', 84), row('2026-09-25', 80)], '2026-09-26');
  expect(trend.changeLast4Weeks).toBe(-1);
});
```

- [ ] **Step 3: Run it.** Expected: FAIL.
- [ ] **Step 4: Implement**

```ts
// src/features/progress/weight-trend.ts
import { uniqueCheckIns } from '@/features/home/weekly-recap';
import { localDateString, parseLocalDate } from '@/lib/dates';
import type { DailyCheckIn } from '@/types/db';

export type TrendPoint = { date: string; value: number; average: number };
export type WeightTrend = { points: TrendPoint[]; latestAverage: number | null; changeSinceStart: number | null; changeLast4Weeks: number | null };

/** Share of each new weigh-in that moves the trend. Lower = smoother. */
const SMOOTHING = 0.25;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function shiftDays(date: string, days: number): string {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + days);
  return localDateString(next);
}

export function weightTrend(rows: readonly DailyCheckIn[], today: string): WeightTrend {
  const points: TrendPoint[] = [];
  let average: number | null = null;
  for (const row of uniqueCheckIns(rows, today)) {
    const raw = row.morning_weight;
    if (raw === null || raw === undefined || String(raw).trim() === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 20 || value > 400) continue;
    average = average === null ? value : average + SMOOTHING * (value - average);
    points.push({ date: row.date, value, average: round1(average) });
  }
  const latest = points.at(-1) ?? null;
  const cutoff = shiftDays(today, -28);
  const before = [...points].reverse().find((point) => point.date <= cutoff) ?? null;
  return {
    points,
    latestAverage: latest?.average ?? null,
    changeSinceStart: latest && points.length > 1 ? round1(latest.average - points[0].average) : null,
    changeLast4Weeks: latest && before && before !== latest ? round1(latest.average - before.average) : null,
  };
}
```
  Check the expected numbers:
  - Averages: 80 → 80 + 0.25 × 2 = 80.5 → 80.5 + 0.25 × (79 − 80.5) = 80.125 → 80.1.
  - Four weeks: 84 → 84 + 0.25 × (80 − 84) = 83. Change 83 − 84 = −1.
- [ ] **Step 5: Run it.** Expected: PASS. Also run `npx jest src/features/home --runInBand`. Expected: PASS (exporting a function changes nothing).
- [ ] **Step 6: Commit**

```bash
git add src/features/home/weekly-recap.ts src/features/progress/weight-trend.ts src/features/progress/weight-trend.test.ts
git commit -m "feat(mobile): add smoothed weight trend"
```

---

### Task 6.3: Strength progress and the progress summary (pure)

**Files:**
- Create: `src/features/progress/strength-progress.ts`
- Create: `src/features/progress/progress-summary.ts`
- Test: `src/features/progress/progress-summary.test.ts`

**Interfaces:**
- Consumes: `bestsFromLogs` and `type WorkoutLogRow` (Phase 3 Task 3.6); `weightTrend` and `shiftDays` (Task 6.2)
- Produces:
  - `type StrengthRow = { name: string; current: number; before: number | null; change: number | null }`
  - `strengthProgress(logs: readonly WorkoutLogRow[], today: string, limit?: number): StrengthRow[]`
  - `type ProgressSummary = { day: number | null; workoutsLogged: number; trend: WeightTrend; strength: StrengthRow[] }`
  - `progressSummary(input: { checkIns: readonly DailyCheckIn[]; logs: readonly WorkoutLogRow[]; startDate: string | null; today: string }): ProgressSummary`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/progress/progress-summary.test.ts
import { serializeWorkoutContent } from '@/lib/workout-content';
import type { DailyCheckIn } from '@/types/db';

import { progressSummary } from './progress-summary';
import { strengthProgress } from './strength-progress';

const log = (id: string, date: string, weight: string) => ({ id, date, content: serializeWorkoutContent({ planDayNumber: 1, exercises: [
  { name: 'Squat', sets: [{ setNumber: 1, weight, reps: '5', rpe: '', completed: true }] },
] }) });

it('compares the best estimated max of the last 4 weeks with the 4 weeks before', () => {
  const rows = strengthProgress([log('a', '2026-09-20', '100'), log('b', '2026-08-20', '90')], '2026-09-26');
  expect(rows).toEqual([{ name: 'Squat', current: 116.7, before: 105, change: 11.7 }]);
});

it('counts the program day from the start date, else the first check-in', () => {
  const checkIns = [{ id: '1', user_id: 'u', date: '2026-09-10', morning_weight: 80 } as DailyCheckIn];
  expect(progressSummary({ checkIns, logs: [], startDate: '2026-09-01', today: '2026-09-26' }).day).toBe(26);
  expect(progressSummary({ checkIns, logs: [], startDate: null, today: '2026-09-26' }).day).toBe(17);
  expect(progressSummary({ checkIns: [], logs: [], startDate: null, today: '2026-09-26' }).day).toBeNull();
});

it('counts logged workouts up to today', () => {
  const summary = progressSummary({ checkIns: [], logs: [log('a', '2026-09-20', '100'), log('z', '2026-09-30', '100')], startDate: null, today: '2026-09-26' });
  expect(summary.workoutsLogged).toBe(1);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/progress/strength-progress.ts
import { bestsFromLogs, type WorkoutLogRow } from '@/features/workout/personal-records';

import { shiftDays } from './weight-trend';

export type StrengthRow = { name: string; current: number; before: number | null; change: number | null };

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Best estimated max (or heaviest weight when no estimate) in the last 28 days vs the 28 days before. */
export function strengthProgress(logs: readonly WorkoutLogRow[], today: string, limit = 5): StrengthRow[] {
  const recentFrom = shiftDays(today, -27);
  const previousFrom = shiftDays(today, -55);
  const recent = bestsFromLogs(logs.filter((log) => log.date >= recentFrom && log.date <= today));
  const previous = bestsFromLogs(logs.filter((log) => log.date >= previousFrom && log.date < recentFrom));
  const score = (best: { weight: number; e1rm: number }) => (best.e1rm > 0 ? best.e1rm : best.weight);
  return [...recent.entries()]
    .map(([key, best]) => {
      const before = previous.get(key);
      const current = score(best);
      return { name: best.name, current, before: before ? score(before) : null, change: before ? round1(current - score(before)) : null };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, limit);
}
```

```ts
// src/features/progress/progress-summary.ts
import type { WorkoutLogRow } from '@/features/workout/personal-records';
import { isDateKeyStrict, parseLocalDate } from '@/lib/dates';
import type { DailyCheckIn } from '@/types/db';

import { strengthProgress, type StrengthRow } from './strength-progress';
import { weightTrend, type WeightTrend } from './weight-trend';

export type ProgressSummary = { day: number | null; workoutsLogged: number; trend: WeightTrend; strength: StrengthRow[] };

const DAY_MS = 86_400_000;

export function progressSummary(input: { checkIns: readonly DailyCheckIn[]; logs: readonly WorkoutLogRow[]; startDate: string | null; today: string }): ProgressSummary {
  const firstCheckIn = [...input.checkIns].map((row) => row.date).filter(isDateKeyStrict).sort()[0] ?? null;
  const start = input.startDate && isDateKeyStrict(input.startDate) ? input.startDate : firstCheckIn;
  // Round, not floor: local midnights can be 23 or 25 hours apart across DST.
  const day = start && start <= input.today ? Math.round((parseLocalDate(input.today).getTime() - parseLocalDate(start).getTime()) / DAY_MS) + 1 : null;
  return {
    day,
    workoutsLogged: input.logs.filter((log) => log.date <= input.today).length,
    trend: weightTrend(input.checkIns, input.today),
    strength: strengthProgress(input.logs, input.today),
  };
}
```
  Check the numbers:
  - 100 × (1 + 5/30) = 116.67 → 116.7
  - 90 × (1 + 5/30) = 105
  - 2026-09-20 is inside the last 28 days; 2026-08-20 is inside the 28 before (from 2026-08-02).
  - Day: 1 Sep → 26 Sep = 25 days + 1 = 26.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/features/progress/strength-progress.ts src/features/progress/progress-summary.ts src/features/progress/progress-summary.test.ts
git commit -m "feat(mobile): summarise strength and program progress"
```

---

### Task 6.4: Progress screen

**Files:**
- Create: `src/features/progress/routes.ts`
- Create: `src/features/progress/ProgressScreen.tsx`
- Create: `app/(app)/progress.tsx`
- Test: `src/features/progress/ProgressScreen.test.tsx`

**Interfaces:**
- Consumes: `progressSummary` (Task 6.3); `useDailyCheckIns` (`@/hooks/useDashboardData`); `useWorkoutLogHistory` (`@/hooks/useWorkoutLogHistory`); `useUserProfile` (`@/hooks/usePlans`); `useProgressPhotos` (`@/hooks/useProgressPhotos`); `useHomeDate` (`@/features/home/useHomeDate`); `LineChart` (`@/components/charts`)
- Produces: `PROGRESS_PATHNAME = '/(app)/progress'` (Phase 7 changes it to `'/(app)/(tabs)/progress'`) and `ProgressScreen`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/progress/ProgressScreen.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';

import { serializeWorkoutContent } from '@/lib/workout-content';

import { ProgressScreen } from './ProgressScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => '2026-09-26' }));
jest.mock('@/hooks/usePlans', () => ({ useUserProfile: () => ({ data: { package_start_date: '2026-09-01' } }) }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: [
  { id: '1', user_id: 'u', date: '2026-09-02', morning_weight: 82 }, { id: '2', user_id: 'u', date: '2026-09-25', morning_weight: 80 },
], isLoading: false, isError: false }) }));
jest.mock('@/hooks/useWorkoutLogHistory', () => ({ useWorkoutLogHistory: () => ({ data: [{ id: 'a', date: '2026-09-20', content: require('@/lib/workout-content').serializeWorkoutContent({ planDayNumber: 1, exercises: [{ name: 'Squat', sets: [{ setNumber: 1, weight: '100', reps: '5', rpe: '', completed: true }] }] }) }], isLoading: false }) }));
jest.mock('@/hooks/useProgressPhotos', () => ({ useProgressPhotos: () => ({ data: [{ id: 'p' }, { id: 'q' }] }) }));
jest.mock('@/components/charts', () => ({ LineChart: ({ summary }: { summary: string }) => { const { Text } = require('react-native'); return <Text>{summary}</Text>; } }));
jest.mock('lucide-react-native', () => ({ Camera: () => null, Ruler: () => null }));
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').light }) }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    Text,
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Card: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Section: ({ title, children }: { title: string; children: React.ReactNode }) => <View><Text>{title}</Text>{children}</View>,
    SkeletonCard: () => <Text>Loading</Text>,
    ListRow: ({ title, onPress }: { title: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}><Text>{title}</Text></Pressable>,
  };
});
void serializeWorkoutContent;

it('summarises the program, the weight trend and strength', async () => {
  const view = await render(<ProgressScreen />);
  expect(view.getByText('Day 26')).toBeTruthy();
  expect(view.getByText('1 workout logged')).toBeTruthy();
  expect(view.getByText('Squat')).toBeTruthy();
  expect(view.getByText('Estimated max 116.7 kg')).toBeTruthy();
});

it('opens photos and measurements', async () => {
  const view = await render(<ProgressScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Progress photos' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/media');
  await fireEvent.press(view.getByRole('button', { name: 'Measurements' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/measurements');
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Create the route constant and route**

```ts
// src/features/progress/routes.ts
/** The only place that knows where Progress lives. Phase 7 moves it into the tab bar. */
export const PROGRESS_PATHNAME = '/(app)/progress';
```

```tsx
// app/(app)/progress.tsx
export { ProgressScreen as default } from '@/features/progress/ProgressScreen';
```
- [ ] **Step 4: Implement the screen**

```tsx
// src/features/progress/ProgressScreen.tsx
import { useRouter } from 'expo-router';
import { Camera, Ruler } from 'lucide-react-native';
import { View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Card, ListRow, Screen, Section, SkeletonCard, Text } from '@/components/ui';
import { useHomeDate } from '@/features/home/useHomeDate';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useUserProfile } from '@/hooks/usePlans';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useWorkoutLogHistory } from '@/hooks/useWorkoutLogHistory';
import { spacing, useTheme } from '@/theme';

import { progressSummary } from './progress-summary';

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)} kg`;

export function ProgressScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const today = useHomeDate();
  const checkIns = useDailyCheckIns();
  const history = useWorkoutLogHistory();
  const profile = useUserProfile();
  const photos = useProgressPhotos();

  if (checkIns.isLoading || history.isLoading) return <Screen archetype="root"><Text variant="h1">Progress</Text><SkeletonCard lines={4} /></Screen>;

  const summary = progressSummary({ checkIns: checkIns.data ?? [], logs: history.data ?? [], startDate: profile.data?.package_start_date ?? null, today });
  const { trend } = summary;
  const photoWeeks = photos.data?.length ?? 0;

  return <Screen archetype="root" testID="progress-screen">
    <View style={{ gap: spacing.lg }}>
      <Text variant="h1" accessibilityRole="header">Progress</Text>

      <Card style={{ gap: spacing.xs }}>
        <Text variant="overline" tone="muted">Since you started</Text>
        {summary.day ? <Text variant="metric" numeric>{`Day ${summary.day}`}</Text> : null}
        {trend.changeSinceStart !== null ? <Text variant="body" numeric>Weight trend {signed(trend.changeSinceStart)}</Text> : null}
        <Text variant="bodySm" tone="muted">{summary.workoutsLogged === 1 ? '1 workout logged' : `${summary.workoutsLogged} workouts logged`}</Text>
      </Card>

      {trend.points.length > 1 ? <Section title="Weight trend" subtitle={trend.changeLast4Weeks !== null ? `${signed(trend.changeLast4Weeks)} in 4 weeks` : 'Smoothed across your weigh-ins'}>
        <LineChart height={180} legend="names"
          series={[
            { name: 'Trend', color: colors.chart1, data: trend.points.map((point) => ({ date: point.date, value: point.average })) },
            { name: 'Weigh-ins', color: colors.chart4, dash: [2, 5], data: trend.points.map((point) => ({ date: point.date, value: point.value })) },
          ]}
          summary={`Weight trend from ${trend.points[0].date} to ${trend.points.at(-1)!.date}. Latest trend ${trend.latestAverage} kg.`} />
      </Section> : <Card><Text variant="bodySm" tone="muted">Your weight trend appears after two weigh-ins.</Text></Card>}

      {summary.strength.length ? <Section title="Strength" subtitle="Best estimated max, last 4 weeks">
        <View style={{ gap: spacing.md }}>
          {summary.strength.map((row) => <View key={row.name} style={{ gap: spacing.xs }}>
            <Text variant="body">{row.name}</Text>
            <Text variant="bodySm" tone="muted" numeric>{`Estimated max ${row.current} kg`}{row.change !== null ? ` · ${signed(row.change)} vs the 4 weeks before` : ''}</Text>
          </View>)}
        </View>
      </Section> : null}

      <Card padded={false}>
        <ListRow icon={Camera} title="Progress photos" subtitle={photoWeeks ? `${photoWeeks} ${photoWeeks === 1 ? 'week' : 'weeks'} recorded` : 'Add your first set'} onPress={() => router.push('/(app)/media')} />
        <ListRow icon={Ruler} title="Measurements" subtitle="Waist, hips, chest and more" divider onPress={() => router.push('/(app)/measurements')} />
      </Card>
    </View>
  </Screen>;
}
```
  Check `LineChart`'s props in `src/components/charts/LineChart.tsx`. If `legend` does not accept `'names'`, use the value `MeasurementProgress` already passes. `renderReadout`, `readoutDescription` and `defaultSelectedDate` are optional; add them only if the component requires them, copying their shape from `MeasurementProgress.tsx`.
- [ ] **Step 5: Run.** `npx jest src/features/progress --runInBand && npm run typecheck`. If typecheck reports `'/(app)/progress'` as unknown, regenerate typed routes the same way as Phase 2 Task 2.4 Step 7. Expected: PASS.
- [ ] **Step 6: Commit**

```bash
git add src/features/progress/routes.ts src/features/progress/ProgressScreen.tsx src/features/progress/ProgressScreen.test.tsx "app/(app)/progress.tsx"
git commit -m "feat(mobile): add a progress screen with trend and strength"
```

---

### Task 6.5: Home points to Progress, with clearer copy

**Files:**
- Modify: `app/(app)/(tabs)/index.tsx` (lines ~120 and ~149)
- Modify: `src/features/home/weekly-recap-card.tsx:68`
- Update: Home and weekly-recap tests that assert the old route or string

- [ ] **Step 1: Update the tests first.**
  - In the Home screen test(s), change expectations of `push('/(app)/measurements')` from the recap and "Progress" actions to `push('/(app)/progress')`.
  - In the weekly recap card test, replace the string "1 weight observation this week. A change needs two dates." with "One weigh-in so far this week. Your trend appears after the next one."
  - Run them. Expected: FAIL.
- [ ] **Step 2: Implement.**
  - In `index.tsx`, import `PROGRESS_PATHNAME` from `@/features/progress/routes`. Change `onOpen={() => router.push('/(app)/measurements')}` (WeeklyRecap) and `onPress={() => router.push('/(app)/measurements')}` ("Your recent record" heading action) to `router.push(PROGRESS_PATHNAME as Href)`. Import `type Href` from `expo-router`.
  - Also change the `!showDailySummary` "View progress" button to the same route.
  - In `weekly-recap-card.tsx:68`, replace the string as in Step 1.
- [ ] **Step 3: Run.** `npx jest src/features/home src/screens --runInBand`. Expected: PASS.
- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/index.tsx" src/features/home src/screens
git commit -m "feat(mobile): send Home progress links to the progress screen"
```

**Phase 6 exit:** `npm run verify` passes. The Measurements chart shows immediately. The Progress screen shows the program day, trend and strength for an account with history.
