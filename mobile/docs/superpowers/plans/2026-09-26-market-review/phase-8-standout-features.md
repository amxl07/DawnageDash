# Phase 8: Standout features implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first.
> Requirements:
> - Tasks 8.2 and 8.6 need Phase 2 (coach thread).
> - Tasks 8.4 and 8.5 need Phases 3 and 6.
> - Task 8.6 is a **🔒 OWNER GATE** (SQL, a storage bucket, web playback).
>
> Tasks are independent of each other and can be shipped in any order after their dependencies.

**Goal:** Ship the features that make Dawnage different from every competitor (X2 and X4–X8). They all build on a real coach and rich daily data:

| Task | Feature | ID |
|---|---|---|
| 8.1 | Opt-in exercise and coach cue on the Lock Screen | X8 |
| 8.2 | Readiness nudge that uses the coach's own options | X4 |
| 8.3 | Quick set entry by keyboard dictation ("8 at 60") | X5 |
| 8.4 | Monthly "Chapter" | X6 |
| 8.5 | GLP-1 muscle-preservation mode | X7 |
| 8.6 | Form-check video to the coach | X2 |

**Architecture:**
- Every feature is a **pure rule module with unit tests**, plus a small UI change in an existing screen.
- Voice uses the **OS keyboard's dictation microphone**, so no new speech dependency.
- The Lock Screen detail is **off by default** (Global Constraint 4).
- GLP-1 settings live in `users.profile_data.glp1`, written with the existing `mergeProfileData` helper. No schema change.

**Tech stack:** Existing `expo-widgets` Live Activity (`src/features/native-surfaces/`), `@react-native-async-storage/async-storage`, `expo-image-picker` (video), supabase-js storage, React Native `Share`.

**Spec:** [X2, X4–X8](../../specs/2026-09-26-market-review-findings.md#4-standout-features-differentiators).

---

### Task 8.1 (X8): Opt-in exercise and coach cue on the Lock Screen

**Files:**
- Create: `src/features/native-surfaces/lock-screen-preference.ts`
- Test: `src/features/native-surfaces/lock-screen-preference.test.ts`
- Modify: `src/features/native-surfaces/model.ts` (`WorkoutProgress`, `ActivityProps` and `activityContent`)
- Modify: `src/features/native-surfaces/layouts.ios.tsx` (`WorkoutActivity`: the detail line and `expandedBottom`)
- Modify: `src/features/native-surfaces/hooks.tsx` (`useWorkoutActivity` accepts `details`)
- Modify: `app/(app)/logger.tsx:78` (pass `details`)
- Modify: `app/(app)/settings.tsx` (a new "Workout" section with a `SwitchRow`, iOS only)
- Test: the existing native-surfaces model test (`ls src/features/native-surfaces | grep test`), plus the new test above

**Interfaces:**
- Produces:
  - `readLockScreenDetails(userId: string): Promise<boolean>` (default `false`)
  - `writeLockScreenDetails(userId: string, value: boolean): Promise<void>`
  - `useLockScreenDetails(userId: string)`, which returns `{ enabled: boolean; setEnabled: (value: boolean) => void }`
  - `WorkoutProgress` gains `exerciseName?: string; cue?: string`
  - `ActivityProps` gains `exerciseName?: string; cue?: string`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/native-surfaces/lock-screen-preference.test.ts
import { readLockScreenDetails, writeLockScreenDetails } from './lock-screen-preference';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')); // eslint-disable-line @typescript-eslint/no-require-imports

it('is off until the user turns it on, per account', async () => {
  expect(await readLockScreenDetails('u1')).toBe(false);
  await writeLockScreenDetails('u1', true);
  expect(await readLockScreenDetails('u1')).toBe(true);
  expect(await readLockScreenDetails('u2')).toBe(false);
});
```

  Add to the existing model test file:

```ts
it('shows exercise name and cue only when they are supplied, trimmed and capped', () => {
  const rest = { endsAt: null, pausedRemainingMs: null };
  const base = { exerciseIndex: 0, exerciseCount: 3, completedSets: 1, totalSets: 9 };
  expect(activityContent(base, rest, 0).props.exerciseName).toBeUndefined();
  const withDetails = activityContent({ ...base, exerciseName: '  Bench press  ', cue: 'x'.repeat(200) }, rest, 0).props;
  expect(withDetails.exerciseName).toBe('Bench press');
  expect(withDetails.cue).toHaveLength(80);
});
```

- [ ] **Step 2: Run them.** `npx jest src/features/native-surfaces --runInBand`. Expected: FAIL.
- [ ] **Step 3: Implement the preference**

```ts
// src/features/native-surfaces/lock-screen-preference.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const key = (userId: string) => `lock-screen-details:${userId}`;

/** Off by default: the Lock Screen is visible to anyone holding the phone. */
export async function readLockScreenDetails(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key(userId))) === 'on';
}

export async function writeLockScreenDetails(userId: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key(userId), value ? 'on' : 'off');
}

export function useLockScreenDetails(userId: string) {
  const [enabled, setState] = useState(false);
  useEffect(() => {
    let active = true;
    void readLockScreenDetails(userId).then((value) => { if (active) setState(value); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  const setEnabled = (value: boolean) => { setState(value); void writeLockScreenDetails(userId, value).catch(() => setState(!value)); };
  return { enabled, setEnabled };
}
```

- [ ] **Step 4: Extend the model** (`model.ts`):
  1. Change `WorkoutProgress` to:
     `{ exerciseIndex: number; exerciseCount: number; completedSets: number; totalSets: number; exerciseName?: string; cue?: string }`
  2. Add `exerciseName?: string; cue?: string;` to `ActivityProps`.
  3. Update the comment above `activityContent` to: `/** Native content excludes titles, IDs and measurements. Exercise name and cue appear only when the user opted in (the caller omits them otherwise). */`
  4. In `activityContent`, after building `props`, add:

```ts
  const text = (value: string | undefined, max: number) => value?.trim().slice(0, max) || undefined;
  const exerciseName = text(progress.exerciseName, 40);
  const cue = text(progress.cue, 80);
  if (exerciseName) props.exerciseName = exerciseName;
  if (cue) props.cue = cue;
```
- [ ] **Step 5: Render it** (`layouts.ios.tsx`, `WorkoutActivity`):
  - Change `detail` to:
    ``const detail = stale ? 'Progress needs a refresh' : props.exerciseName ?? `Exercise ${props.exercise ?? 0} of ${props.exerciseCount ?? 0}`;``
  - Change `expandedBottom` to:
    ``<Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(2)]}>{stale ? 'Open Dawnage to continue' : props.cue ? `${detail} · ${props.cue}` : `${detail} · ${counts}`}</Text>``
- [ ] **Step 6: Pass the details from the logger.**
  1. In `hooks.tsx`, add `details?: { exerciseName?: string; cue?: string } | null` to `useWorkoutActivity`'s input and destructure it.
  2. In the second `useEffect`, change the object passed to `updateWorkout` to:
     `{ exerciseIndex, exerciseCount, completedSets, totalSets, exerciseName: details?.exerciseName, cue: details?.cue }`
  3. Add `details?.exerciseName` and `details?.cue` to that effect's dependency array.
  4. In `app/(app)/logger.tsx`:
     - Add `const lockDetails = useLockScreenDetails(userId);` near the other hooks.
     - Pass `details: lockDetails.enabled && current ? { exerciseName: current.name, cue: prescription?.notes } : null` in the `useWorkoutActivity({ … })` call.
     - Move the `current` and `prescription` computations above that call if they come after it. They depend only on `state`, `index` and `session.plan`.
- [ ] **Step 7: Settings switch** (`app/(app)/settings.tsx`). After the Reminders section, add this block (iOS only; Live Activities are iOS-only):

```tsx
        {Platform.OS === 'ios' && user?.id ? <View style={{ gap: spacing.sm }}>
          <Text variant="h2">Workout</Text>
          <SwitchRow label="Show exercise on Lock Screen" detail="Shows the current exercise and your coach's cue next to the rest timer. Anyone who sees your Lock Screen can read it."
            value={lockDetails.enabled} onValueChange={lockDetails.setEnabled} testID="settings-lock-screen-details" />
        </View> : null}
```
  In the component, add `const { user } = useAuth();` if it isn't already there, and `const lockDetails = useLockScreenDetails(user?.id ?? '');`. Import `SwitchRow` from `@/components/ui/SwitchRow`, and `useLockScreenDetails`.
- [ ] **Step 8: Run.** `npx jest src/features/native-surfaces src/screens --runInBand && npm run typecheck`. Expected: PASS. Add the `useLockScreenDetails` mock `() => ({ enabled: false, setEnabled: jest.fn() })` to the settings and logger test files that render those screens.
- [ ] **Step 9: Commit**

```bash
git add src/features/native-surfaces "app/(app)/logger.tsx" "app/(app)/settings.tsx" src/screens
git commit -m "feat(mobile): optional exercise and coach cue on the Lock Screen"
```
- [ ] **Step 10: 🔒 Device check (owner, iOS).**
  - With the switch off, the Live Activity shows "Exercise 1 of 3".
  - With it on, it shows "Bench press", and the expanded view shows the coach's note.

---

### Task 8.2 (X4): Readiness nudge in the workout

**Files:**
- Create: `src/features/workout/readiness.ts`
- Test: `src/features/workout/readiness.test.ts`
- Modify: `src/features/coach/routes.ts` (`coachHref` gains an optional `draft`)
- Modify: `src/features/coach/CoachScreen.tsx` (initial draft from the `draft` param)
- Update: `src/features/coach/CoachScreen.test.tsx` (one new test)
- Create: `src/components/logger/ReadinessNudge.tsx`
- Modify: `app/(app)/logger.tsx` (render the nudge above the exercise)

**Interfaces:**
- Produces:
  - `readinessSignal(input: { sleepHours: number | null; energy: number | null; stress: number | null }): { low: boolean; reasons: string[] }`
  - `readinessMessage(reasons: string[]): string`
  - `coachHref(context?: MessageContext, draft?: string): Href`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workout/readiness.test.ts
import { readinessMessage, readinessSignal } from './readiness';

it('flags short sleep, low energy or high stress', () => {
  expect(readinessSignal({ sleepHours: 5.5, energy: 3, stress: 8 })).toEqual({ low: true, reasons: ['slept 5.5 h', 'energy 3/10', 'stress 8/10'] });
  expect(readinessSignal({ sleepHours: 7, energy: 6, stress: 5 })).toEqual({ low: false, reasons: [] });
  expect(readinessSignal({ sleepHours: null, energy: null, stress: null }).low).toBe(false);
});

it('writes a plain message for the coach', () => {
  expect(readinessMessage(['slept 5.5 h', 'energy 3/10'])).toBe('Low readiness today: slept 5.5 h, energy 3/10. Should I adjust this session?');
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/workout/readiness.ts
/** Thresholds are deliberately conservative: a nudge, never a change to the plan. */
export function readinessSignal(input: { sleepHours: number | null; energy: number | null; stress: number | null }): { low: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.sleepHours !== null && input.sleepHours < 6) reasons.push(`slept ${input.sleepHours} h`);
  if (input.energy !== null && input.energy <= 4) reasons.push(`energy ${input.energy}/10`);
  if (input.stress !== null && input.stress >= 8) reasons.push(`stress ${input.stress}/10`);
  return { low: reasons.length > 0, reasons };
}

export function readinessMessage(reasons: string[]): string {
  return `Low readiness today: ${reasons.join(', ')}. Should I adjust this session?`;
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Allow a pre-filled coach message.**
  1. In `routes.ts`, change `coachHref` to accept `draft?: string`, and add `draft` to `params` when given:

```ts
export function coachHref(context?: MessageContext, draft?: string): Href {
  if (!context && !draft) return COACH_PATHNAME as Href;
  return {
    pathname: COACH_PATHNAME,
    params: { contextType: context?.type ?? '', contextId: context?.id ?? '', contextDate: context?.date ?? '', ...(draft ? { draft } : {}) },
  } as Href;
}
```
  2. In `CoachScreen.tsx`:
     - Add `draft?: string` to the `useLocalSearchParams` generic.
     - Change `useState('')` for the draft to `useState(() => (typeof params.draft === 'string' ? params.draft.slice(0, MESSAGE_MAX_LENGTH) : ''))`.
     - In `clearContext`, also clear `draft: undefined` in `router.setParams`.
  3. Add this test to `CoachScreen.test.tsx`, and update the existing `setParams` expectation to include `draft: undefined`:

```tsx
it('starts with a suggested message the client can edit before sending', async () => {
  mockParams = { contextType: 'daily_check_in', contextDate: '2026-09-26', draft: 'Low readiness today: slept 5 h.' };
  const view = await render(<CoachScreen />);
  expect(view.getByLabelText('Message').props.value).toBe('Low readiness today: slept 5 h.');
  expect(mockSend).not.toHaveBeenCalled();
});
```
  4. Update `AskCoachButton.test.tsx`: `coachHref` now always includes the three context keys. Its expectation already lists them, so no change is needed. Re-run it to confirm.
- [ ] **Step 6: The nudge component**

```tsx
// src/components/logger/ReadinessNudge.tsx
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export function ReadinessNudge({ reasons, hasCoachOptions, onTellCoach, onDismiss }: { reasons: string[]; hasCoachOptions: boolean; onTellCoach: () => void; onDismiss: () => void }) {
  const { colors } = useTheme();
  return <View testID="readiness-nudge" accessibilityLiveRegion="polite" style={{ gap: spacing.sm, padding: spacing.base, borderRadius: radius.card, backgroundColor: colors.elevated }}>
    <Text variant="label">A tougher day: {reasons.join(', ')}</Text>
    <Text variant="bodySm" tone="muted">{hasCoachOptions ? 'Your coach’s lighter options are in each exercise guide.' : 'Train as planned, or check with your coach first.'}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label="Tell your coach" variant="secondary" onPress={onTellCoach} />
      <Button label="Hide" variant="ghost" onPress={onDismiss} />
    </View>
  </View>;
}
```
- [ ] **Step 7: Wire the logger** (`app/(app)/logger.tsx`, inside `WorkoutEditor`):

```tsx
  const checkIns = useDailyCheckIns();
  const todayRow = checkIns.data?.find((row) => row.date === date);
  const readiness = readinessSignal({
    sleepHours: todayRow?.sleep_hours == null ? null : Number(todayRow.sleep_hours),
    energy: todayRow?.energy_level ?? null,
    stress: todayRow?.stress_level ?? null,
  });
  const [readinessHidden, setReadinessHidden] = useState(false);
  const hasCoachOptions = (day?.exercises ?? []).some((exercise) => exercise.substitutions.length > 0);
```
  Render directly above `<Text variant="label" tone="muted">EXERCISE {index + 1} OF …`:

```tsx
          {readiness.low && !readinessHidden ? <ReadinessNudge reasons={readiness.reasons} hasCoachOptions={hasCoachOptions} onDismiss={() => setReadinessHidden(true)}
            onTellCoach={() => router.push(coachHref({ type: 'daily_check_in', id: todayRow?.id ?? null, date }, readinessMessage(readiness.reasons)))} /> : null}
```
  Imports: `useDailyCheckIns` (`@/hooks/useDashboardData`), `readinessSignal` and `readinessMessage` (`@/features/workout/readiness`), `ReadinessNudge`, and `coachHref`. Add `jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: [] }) }))` to any test that renders the logger and doesn't already mock it.
- [ ] **Step 8: Run.** `npx jest src/features/workout src/features/coach src/components/logger src/screens --runInBand && npm run typecheck`. Expected: PASS.
- [ ] **Step 9: Commit**

```bash
git add src/features/workout/readiness.ts src/features/workout/readiness.test.ts src/features/coach src/components/logger/ReadinessNudge.tsx "app/(app)/logger.tsx" src/screens
git commit -m "feat(mobile): readiness nudge that points to the coach"
```

---

### Task 8.3 (X5): Quick set entry by dictation ("8 at 60")

**Files:**
- Create: `src/features/workout/quick-entry.ts`
- Test: `src/features/workout/quick-entry.test.ts`
- Modify: `src/components/logger/CurrentSetEditor.tsx` (a "Quick entry" input inside "Effort & options"; weight-reps only)
- Update: `src/components/logger/CurrentSetEditor.test.tsx`

**Interfaces:**
- Produces: `parseSetEntry(text: string): { weight?: string; reps?: string; done: boolean } | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workout/quick-entry.test.ts
import { parseSetEntry } from './quick-entry';

it.each([
  ['60 x 8', { weight: '60', reps: '8', done: false }],
  ['62,5×8', { weight: '62.5', reps: '8', done: false }],
  ['8 at 60', { weight: '60', reps: '8', done: false }],
  ['8 reps at 60 kg done', { weight: '60', reps: '8', done: true }],
  ['60 kg 8 reps', { weight: '60', reps: '8', done: false }],
  ['12 reps', { reps: '12', done: false }],
  ['80 kg', { weight: '80', done: false }],
  ['8 @ 60', { weight: '60', reps: '8', done: false }],
])('parses "%s"', (text, expected) => {
  expect(parseSetEntry(text)).toEqual(expected);
});

it('returns null for text without a set', () => {
  expect(parseSetEntry('felt heavy')).toBeNull();
  expect(parseSetEntry('')).toBeNull();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/workout/quick-entry.ts
const NUM = '(\\d+(?:[.,]\\d+)?)';
const normal = (value: string) => String(Number(value.replace(',', '.')));

/**
 * Understands what keyboard dictation produces: "60 x 8", "8 at 60", "8 reps 60 kg", "… done".
 * ponytail: digits only. Add number words if real dictation logs show "eight at sixty".
 */
export function parseSetEntry(text: string): { weight?: string; reps?: string; done: boolean } | null {
  const input = text.toLowerCase().trim();
  if (!input) return null;
  const done = /\b(done|complete|completed)\b/.test(input);
  let weight: string | undefined;
  let reps: string | undefined;

  const times = input.match(new RegExp(`${NUM}\\s*(?:kg)?\\s*[x×*]\\s*(\\d+)`));
  const at = input.match(new RegExp(`(\\d+)\\s*(?:reps?)?\\s*(?:at|@)\\s*${NUM}`));
  if (times) { weight = normal(times[1]); reps = String(Number(times[2])); }
  else if (at) { reps = String(Number(at[1])); weight = normal(at[2]); }
  else {
    const kg = input.match(new RegExp(`${NUM}\\s*(?:kg|kilos?|kilograms?)\\b`));
    const rep = input.match(/(\d+)\s*reps?\b/);
    if (kg) weight = normal(kg[1]);
    if (rep) reps = String(Number(rep[1]));
  }
  if (weight === undefined && reps === undefined) return null;
  return { ...(weight !== undefined ? { weight } : {}), ...(reps !== undefined ? { reps } : {}), done };
}
```

- [ ] **Step 4: Run it.** Expected: PASS (9 cases).
- [ ] **Step 5: Add the input.** In `CurrentSetEditor.tsx`, inside the `details ? (…)` block, **first** in the list and only when `exercise.tracking === 'weight-reps'`:

```tsx
      {exercise.tracking === 'weight-reps' ? <Input label="Quick entry" placeholder="Say or type: 8 at 60"
        hint="Tap the microphone on your keyboard to dictate. Add “done” to complete the set."
        returnKeyType="done" value={quick} onChangeText={(value) => { setQuick(value); setQuickError(null); }}
        error={quickError}
        onSubmitEditing={() => {
          const parsed = parseSetEntry(quick);
          if (!parsed) { setQuickError('Try “8 at 60” or “60 x 8”.'); return; }
          const patch: Partial<WorkoutSet> = {};
          if (parsed.weight) patch.weight = parsed.weight;
          if (parsed.reps) patch.reps = parsed.reps;
          onChange(set.id, patch);
          setQuick('');
          if (parsed.done && !set.completed && !completionLock.current) { completionLock.current = true; onComplete(set.id); }
        }} /> : null}
```
  Add these states:
  - `const [quick, setQuick] = useState('');`
  - `const [quickError, setQuickError] = useState<string | null>(null);`

  Reset both in the existing `[setId]` effect. Import `parseSetEntry`.
- [ ] **Step 6: Add a test to `CurrentSetEditor.test.tsx`**

```tsx
it('fills and completes a set from a dictated quick entry', async () => {
  const change = jest.fn();
  const complete = jest.fn();
  const view = await render(<CurrentSetEditor exercise={exercise} setId="set-1" onChange={change} onComplete={complete} />);
  await fireEvent.press(view.getByRole('button', { name: 'Effort and set options' }));
  await fireEvent.changeText(view.getByLabelText('Quick entry'), '8 at 62.5 done');
  await fireEvent(view.getByLabelText('Quick entry'), 'submitEditing');
  expect(change).toHaveBeenCalledWith('set-1', { weight: '62.5', reps: '8' });
  expect(complete).toHaveBeenCalledWith('set-1');
});
```
- [ ] **Step 7: Run.** `npx jest src/features/workout/quick-entry.test.ts src/components/logger --runInBand`. Expected: PASS.
- [ ] **Step 8: Commit**

```bash
git add src/features/workout/quick-entry.ts src/features/workout/quick-entry.test.ts src/components/logger/CurrentSetEditor.tsx src/components/logger/CurrentSetEditor.test.tsx
git commit -m "feat(mobile): quick set entry that works with keyboard dictation"
```

---

### Task 8.4 (X6): Monthly "Chapter"

**Files:**
- Create: `src/features/progress/chapter.ts`
- Test: `src/features/progress/chapter.test.ts`
- Create: `src/features/progress/ChapterScreen.tsx`
- Create: `app/(app)/chapter.tsx`
- Modify: `src/features/progress/ProgressScreen.tsx` (an entry card when a chapter is ready)

**Interfaces:**
- Consumes: `weightTrend` (Phase 6), `bestsFromLogs` and `WorkoutLogRow` (Phase 3), and `PhotoRow` (`@/hooks/useProgressPhotos`, newest-first rows with `date` and `front_url`)
- Produces:
  - `chapterMonthFor(today: string): string | null` (`'YYYY-MM'` offered in the last 3 days of a month or the first 7 of the next; otherwise `null`)
  - `buildChapter(month: string, input: { checkIns: readonly DailyCheckIn[]; logs: readonly WorkoutLogRow[]; photos: readonly PhotoRow[] }): Chapter`
  - `type Chapter = { month: string; title: string; sessions: number; weightChange: number | null; newBests: { name: string; value: number }[]; then: PhotoRow | null; now: PhotoRow | null }`
  - `chapterShareText(chapter: Chapter): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/progress/chapter.test.ts
import { serializeWorkoutContent } from '@/lib/workout-content';
import type { DailyCheckIn } from '@/types/db';

import { buildChapter, chapterMonthFor, chapterShareText } from './chapter';

const log = (id: string, date: string, weight: string) => ({ id, date, content: serializeWorkoutContent({ planDayNumber: 1, exercises: [{ name: 'Squat', sets: [{ setNumber: 1, weight, reps: '5', rpe: '', completed: true }] }] }) });
const checkIn = (date: string, w: number) => ({ id: date, user_id: 'u', date, morning_weight: w } as DailyCheckIn);
const photo = (date: string) => ({ id: date, user_id: 'u', date, front_url: `u/${date}/front_1.jpg`, back_url: null, side_left_url: null, side_right_url: null });

it('offers last month early in the month and this month at its end', () => {
  expect(chapterMonthFor('2026-10-03')).toBe('2026-09');
  expect(chapterMonthFor('2026-09-29')).toBe('2026-09');
  expect(chapterMonthFor('2026-09-15')).toBeNull();
});

it('summarises sessions, weight trend change, new bests and then/now photos', () => {
  const chapter = buildChapter('2026-09', {
    checkIns: [checkIn('2026-09-01', 82), checkIn('2026-09-28', 80)],
    logs: [log('b', '2026-09-20', '110'), log('a', '2026-08-20', '100')],
    photos: [photo('2026-09-27'), photo('2026-09-06'), photo('2026-07-01')],
  });
  expect(chapter.title).toBe('September 2026');
  expect(chapter.sessions).toBe(1);
  expect(chapter.weightChange).toBe(-0.5);
  expect(chapter.newBests).toEqual([{ name: 'Squat', value: 128.3 }]);
  expect(chapter.then?.date).toBe('2026-07-01');
  expect(chapter.now?.date).toBe('2026-09-27');
  expect(chapterShareText(chapter)).toBe('My September 2026 with Dawnage: 1 workout, weight trend −0.5 kg, 1 new best.');
});
```
  Check the numbers:
  - The trend runs 82 → 82 + 0.25 × (80 − 82) = 81.5, so the change is −0.5.
  - Squat's best estimated max is 110 × (1 + 5/30) = 128.33, which rounds to 128.3. It beats August's 116.7, so it is a new best.
  - "Then" is the earliest photo ever (the baseline). "Now" is the latest photo in the month.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/progress/chapter.ts
import { format } from 'date-fns';

import { bestsFromLogs, type WorkoutLogRow } from '@/features/workout/personal-records';
import type { PhotoRow } from '@/hooks/useProgressPhotos';
import { parseLocalDate } from '@/lib/dates';
import type { DailyCheckIn } from '@/types/db';

import { weightTrend } from './weight-trend';

export type Chapter = { month: string; title: string; sessions: number; weightChange: number | null; newBests: { name: string; value: number }[]; then: PhotoRow | null; now: PhotoRow | null };

const lastDay = (month: string) => { const d = parseLocalDate(`${month}-01`); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.getDate(); };

export function chapterMonthFor(today: string): string | null {
  const day = Number(today.slice(8, 10));
  const month = today.slice(0, 7);
  if (day >= lastDay(month) - 2) return month;
  if (day <= 7) { const d = parseLocalDate(`${month}-01`); d.setMonth(d.getMonth() - 1); return format(d, 'yyyy-MM'); }
  return null;
}

export function buildChapter(month: string, input: { checkIns: readonly DailyCheckIn[]; logs: readonly WorkoutLogRow[]; photos: readonly PhotoRow[] }): Chapter {
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay(month)).padStart(2, '0')}`;
  const inMonth = (date: string) => date >= start && date <= end;
  const monthLogs = input.logs.filter((log) => inMonth(log.date));
  const trend = weightTrend(input.checkIns.filter((row) => inMonth(row.date)), end);
  const before = bestsFromLogs(input.logs.filter((log) => log.date < start));
  const newBests = [...bestsFromLogs(monthLogs).entries()]
    .filter(([key, best]) => { const old = before.get(key); return old !== undefined && best.e1rm > old.e1rm; })
    .map(([, best]) => ({ name: best.name, value: best.e1rm }));
  const byDate = [...input.photos].filter((row) => row.front_url).sort((a, b) => a.date.localeCompare(b.date));
  return {
    month,
    title: format(parseLocalDate(start), 'MMMM yyyy'),
    sessions: monthLogs.length,
    weightChange: trend.changeSinceStart,
    newBests,
    then: byDate[0] ?? null,
    now: [...byDate].reverse().find((row) => inMonth(row.date)) ?? null,
  };
}

export function chapterShareText(chapter: Chapter): string {
  const parts = [`${chapter.sessions} ${chapter.sessions === 1 ? 'workout' : 'workouts'}`];
  if (chapter.weightChange !== null) parts.push(`weight trend ${chapter.weightChange > 0 ? '+' : chapter.weightChange < 0 ? '−' : ''}${Math.abs(chapter.weightChange)} kg`);
  if (chapter.newBests.length) parts.push(`${chapter.newBests.length} new ${chapter.newBests.length === 1 ? 'best' : 'bests'}`);
  return `My ${chapter.title} with Dawnage: ${parts.join(', ')}.`;
}
```
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: The screen** (`ChapterScreen.tsx`) and its route (`app/(app)/chapter.tsx`: `export { ChapterScreen as default } from '@/features/progress/ChapterScreen';`).
  The screen reads `useLocalSearchParams<{ month?: string }>()` and the same four hooks as `ProgressScreen`, then renders:
  - `<PageHeader title={chapter.title} onBack={() => router.back()} />`
  - A row of two equal-width `PrivatePhoto` images, "Then" (`chapter.then.front_url`) and "Now" (`chapter.now.front_url`). Each has `style={{ flex: 1, aspectRatio: 3 / 4, borderRadius: radius.card }}`, `contentFit="cover"`, `ownerId={user.id}` and a caption under it with the formatted date. Render the row only when both exist and have different dates. Otherwise show `<Text tone="muted">Add this month's photos to see then and now side by side.</Text>`.
  - Three `CompletionValue`-style lines using `Text`: "Workouts: {sessions}", "Weight trend: {signed change}" (only when not null) and one line per new best: "{name}: estimated max {value} kg".
  - `<Button label="Share" variant="secondary" onPress={() => { void Share.share({ message: chapterShareText(chapter) }); }} />`, with `Share` imported from `react-native`.
  - `<AskCoachButton label="Ask your coach for a note on this month" context={{ type: 'progress_photo', id: chapter.now?.id ?? null, date: chapter.now?.date ?? null }} />`

  Validate the param with `/^\d{4}-\d{2}$/`. If it is missing or invalid, use `chapterMonthFor(today) ?? today.slice(0, 7)`.
- [ ] **Step 6: Entry card.** In `ProgressScreen.tsx`, compute `const chapterMonth = chapterMonthFor(today);`. Right after the "Since you started" card, when it is non-null, render:

```tsx
      {chapterMonth ? <ListRow icon={BookOpen} title={`Your ${format(parseLocalDate(`${chapterMonth}-01`), 'MMMM')} chapter`} subtitle="Then and now, and what changed" onPress={() => router.push({ pathname: '/(app)/chapter', params: { month: chapterMonth } } as Href)} /> : null}
```
  Import `BookOpen` from lucide, `format` from date-fns, `parseLocalDate`, and `type Href`. Add `BookOpen: () => null` to `ProgressScreen.test.tsx`'s lucide mock, and `jest.mock('./chapter', () => ({ chapterMonthFor: () => null }))` so existing expectations hold.
- [ ] **Step 7: Screen test** (`src/features/progress/ChapterScreen.test.tsx`). Mock the hooks as `ProgressScreen.test.tsx` does, and also mock:
  - `@/components/media/PrivatePhoto` as `({ reference }) => <Text>{reference}</Text>`
  - `@/features/coach/AskCoachButton` as `() => null`
  - `expo-router` with `useLocalSearchParams: () => ({ month: '2026-09' })`

  Assert that the title "September 2026" renders, both photo references render, and pressing "Share" calls `Share.share` with the share text (use `jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never)`).
- [ ] **Step 8: Run.** `npx jest src/features/progress --runInBand && npm run typecheck`. Regenerate typed routes if needed (Phase 2 Task 2.4 Step 7). Expected: PASS.
- [ ] **Step 9: Commit**

```bash
git add src/features/progress "app/(app)/chapter.tsx"
git commit -m "feat(mobile): add a monthly progress chapter"
```

---

### Task 8.5 (X7): GLP-1 muscle-preservation mode

**Files:**
- Create: `src/features/glp1/glp1.ts`
- Test: `src/features/glp1/glp1.test.ts`
- Create: `src/features/glp1/useGlp1Settings.ts`
- Modify: `app/(app)/settings.tsx` (a new "Health" section)
- Modify: `src/components/checkin/CheckInForm.tsx` (optional `proteinFloor` prop → hint on the protein field)
- Modify: `src/features/checkin/CheckInEditorScreen.tsx` (pass `proteinFloor`)
- Modify: `app/(app)/(tabs)/index.tsx` (dose-day card)
- Modify: `src/features/progress/ProgressScreen.tsx` (strength-dip note)

**Interfaces:**
- Produces:
  - `type Glp1Settings = { enabled: boolean; doseWeekday: number | null; proteinFloorGrams: number | null }`
  - `readGlp1(profileData: Record<string, unknown> | null | undefined): Glp1Settings`
  - `proteinFloorGrams(settings: Glp1Settings, weightKg: number | null): number | null`
  - `isDoseDay(settings: Glp1Settings, date: string): boolean`
  - `strengthDips(rows: readonly StrengthRow[]): StrengthRow[]`
  - `useGlp1Settings()`, which returns `{ settings: Glp1Settings; save: (next: Glp1Settings) => Promise<void>; saving: boolean; error: string | null }`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/glp1/glp1.test.ts
import { isDoseDay, proteinFloorGrams, readGlp1, strengthDips } from './glp1';

it('reads settings defensively from profile_data', () => {
  expect(readGlp1(null)).toEqual({ enabled: false, doseWeekday: null, proteinFloorGrams: null });
  expect(readGlp1({ glp1: { enabled: true, doseWeekday: 1 } })).toEqual({ enabled: true, doseWeekday: 1, proteinFloorGrams: null });
  expect(readGlp1({ glp1: { enabled: 'yes', doseWeekday: 9 } })).toEqual({ enabled: false, doseWeekday: null, proteinFloorGrams: null });
});

it('suggests 1.6 g per kg unless the coach set a number', () => {
  const on = { enabled: true, doseWeekday: null, proteinFloorGrams: null };
  expect(proteinFloorGrams(on, 74)).toBe(118);
  expect(proteinFloorGrams({ ...on, proteinFloorGrams: 130 }, 74)).toBe(130);
  expect(proteinFloorGrams({ ...on, enabled: false }, 74)).toBeNull();
  expect(proteinFloorGrams(on, null)).toBeNull();
});

it('knows the dose day from a local date key', () => {
  expect(isDoseDay({ enabled: true, doseWeekday: 6, proteinFloorGrams: null }, '2026-09-26')).toBe(true); // a Saturday
  expect(isDoseDay({ enabled: true, doseWeekday: 1, proteinFloorGrams: null }, '2026-09-26')).toBe(false);
});

it('flags lifts whose estimated max fell more than 5%', () => {
  expect(strengthDips([
    { name: 'Squat', current: 100, before: 110, change: -10 },
    { name: 'Bench', current: 70, before: 71, change: -1 },
    { name: 'Row', current: 60, before: null, change: null },
  ]).map((row) => row.name)).toEqual(['Squat']);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/glp1/glp1.ts
import type { StrengthRow } from '@/features/progress/strength-progress';
import { parseLocalDate } from '@/lib/dates';

export type Glp1Settings = { enabled: boolean; doseWeekday: number | null; proteinFloorGrams: number | null };

const DEFAULT_GRAMS_PER_KG = 1.6;

export function readGlp1(profileData: Record<string, unknown> | null | undefined): Glp1Settings {
  const raw = profileData?.glp1;
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const weekday = value.doseWeekday;
  const floor = value.proteinFloorGrams;
  return {
    enabled: value.enabled === true,
    doseWeekday: typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : null,
    proteinFloorGrams: typeof floor === 'number' && Number.isFinite(floor) && floor > 0 ? Math.round(floor) : null,
  };
}

export function proteinFloorGrams(settings: Glp1Settings, weightKg: number | null): number | null {
  if (!settings.enabled) return null;
  if (settings.proteinFloorGrams) return settings.proteinFloorGrams;
  return weightKg && weightKg > 0 ? Math.round(weightKg * DEFAULT_GRAMS_PER_KG) : null;
}

export function isDoseDay(settings: Glp1Settings, date: string): boolean {
  return settings.enabled && settings.doseWeekday !== null && parseLocalDate(date).getDay() === settings.doseWeekday;
}

export function strengthDips(rows: readonly StrengthRow[]): StrengthRow[] {
  return rows.filter((row) => row.before !== null && row.before > 0 && (row.current - row.before) / row.before < -0.05);
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: The settings hook.** It writes through the existing merge helper, so other `profile_data` keys survive.

```ts
// src/features/glp1/useGlp1Settings.ts
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/usePlans';
import { mergeProfileData } from '@/lib/profile-data';
import { supabase } from '@/lib/supabase';

import { readGlp1, type Glp1Settings } from './glp1';

export function useGlp1Settings() {
  const { user } = useAuth();
  const profile = useUserProfile();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = readGlp1(profile.data?.profile_data);
  const save = async (next: Glp1Settings) => {
    if (!user?.id) return;
    setSaving(true); setError(null);
    try {
      // Re-read so a stale cache can't overwrite fields another screen saved.
      const { data, error: readError } = await supabase.from('users').select('profile_data').eq('id', user.id).maybeSingle();
      if (readError) throw readError;
      const merged = mergeProfileData(data?.profile_data as Record<string, unknown> | null, { glp1: next });
      const { error: writeError } = await supabase.from('users').update({ profile_data: merged }).eq('id', user.id);
      if (writeError) throw writeError;
      await queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
    } catch {
      setError('Couldn’t save this setting. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };
  return { settings, save, saving, error };
}
```
- [ ] **Step 6: Settings UI.** In `settings.tsx`, add a "Health" section:

```tsx
        <View style={{ gap: spacing.sm }}>
          <Text variant="h2">Health</Text>
          <SwitchRow label="I take a GLP-1 medication" detail="Adds a protein minimum to your check-in and flags strength drops, to help keep muscle while you lose weight. Your coach sees this setting."
            value={glp1.settings.enabled} disabled={glp1.saving} onValueChange={(enabled) => { void glp1.save({ ...glp1.settings, enabled }); }} testID="settings-glp1" />
          {glp1.settings.enabled ? <View style={{ gap: spacing.xs }}>
            <Text variant="bodySm" tone="muted">Dose day</Text>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((name, weekday) => (
              <OptionRow key={name} label={name} selected={glp1.settings.doseWeekday === weekday} onPress={() => { void glp1.save({ ...glp1.settings, doseWeekday: weekday }); }} />
            ))}
          </View> : null}
          {glp1.error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{glp1.error}</Text> : null}
        </View>
```
  Add `const glp1 = useGlp1Settings();`. Import `OptionRow` from `@/components/ui` and `SwitchRow` from `@/components/ui/SwitchRow`.
- [ ] **Step 7: Check-in hint.**
  - `CheckInForm.tsx`:
    - Add the prop `proteinFloor?: number | null`.
    - In the adherence branch, find the protein `NumericEntry`.
    - When `proteinFloor` is set, pass ``hint={`Suggested minimum ${proteinFloor} g`}`` (instead of its existing hint when it has one).
    - When `form.protein !== null && form.protein < proteinFloor`, render `<Text variant="bodySm" tone="muted">Below your suggested minimum today.</Text>` under it.
    - It is a hint, never a validation error.
  - `CheckInEditorScreen.tsx`:
    - Call `const glp1 = readGlp1(useUserProfile().data?.profile_data);`. If `useUserProfile` isn't already imported there, import it from `@/hooks/usePlans`.
    - Pass `proteinFloor={proteinFloorGrams(glp1, editor.form.morningWeight)}`.
- [ ] **Step 8: Home dose-day card.** In `index.tsx`:
  - Compute `const glp1 = readGlp1(profile?.profile_data);`.
  - Inside the `TodayBrief` children, after the coach card:

```tsx
        {isDoseDay(glp1, today) ? <Card style={{ gap: spacing.xs, padding: spacing.content, borderRadius: 24 }}>
          <Text variant="label">Dose day</Text>
          <Text variant="bodySm" tone="muted">Aim for your protein minimum even if your appetite is low.</Text>
        </Card> : null}
```
- [ ] **Step 9: Progress strength note.** In `ProgressScreen.tsx`:
  - Compute `const dips = readGlp1(profile.data?.profile_data).enabled ? strengthDips(summary.strength) : [];`.
  - Under the Strength section:

```tsx
      {dips.length ? <Card style={{ gap: spacing.sm }}>
        <Text variant="label">Strength is dipping on {dips.map((row) => row.name).join(', ')}</Text>
        <Text variant="bodySm" tone="muted">Keeping strength while losing weight protects muscle. Your coach can adjust your plan.</Text>
        <AskCoachButton context={{ type: 'workout_log', id: null, date: today }} label="Tell your coach" />
      </Card> : null}
```
- [ ] **Step 10: Run.** `npx jest src/features/glp1 src/features/progress src/components/checkin src/features/checkin src/screens --runInBand && npm run typecheck`. Expected: PASS. Add mocks for `useGlp1Settings` and `readGlp1` only where an existing test breaks because of a new hook call.
- [ ] **Step 11: Commit**

```bash
git add src/features/glp1 "app/(app)/settings.tsx" src/components/checkin/CheckInForm.tsx src/features/checkin/CheckInEditorScreen.tsx "app/(app)/(tabs)/index.tsx" src/features/progress/ProgressScreen.tsx src/screens src/features/checkin src/components/checkin
git commit -m "feat(mobile): add a GLP-1 muscle-preservation mode"
```

---

### Task 8.6 (X2): Form-check video to the coach 🔒 OWNER GATE (SQL, a storage bucket, web playback)

**Files:**
- Create: `mobile/plans/sql/2026-09-26_coach_media.sql`
- Create: `src/features/coach/form-check.ts`
- Test: `src/features/coach/form-check.test.ts`
- Modify: `src/features/coach/coach-messages.ts` (`CoachMessage` gains `attachment_path: string | null`)
- Modify: `src/features/coach/CoachScreen.tsx` (`MessageBubble` shows "Form check video" for attachments)
- Modify: `src/components/logger/CurrentSetEditor.tsx` (a "Record a form check" button inside "Effort & options")
- Modify: `app.json` (the `expo-image-picker` plugin gains `microphonePermission`)

**Interfaces:**
- Produces:
  - `formCheckPath(userId: string, id: string): string`
  - `formCheckBody(exercise: string, setNumber: number): string`
  - `sendFormCheck(input: { userId: string; uri: string; exercise: string; setNumber: number; date: string; logId: string | null }): Promise<void>`

- [ ] **Step 1: Write the SQL**

```sql
-- ============================================================================
-- Dawnage 2026-09-26 · Coach media (form-check videos)
-- Additive: one private bucket, storage policies, two nullable columns.
-- Reversible:
--   ALTER TABLE public.coach_messages DROP COLUMN attachment_type, DROP COLUMN attachment_path;  (owner only)
--   DELETE FROM storage.buckets WHERE id = 'coach_media';
-- ============================================================================
ALTER TABLE public.coach_messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.coach_messages ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('video'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coach_media', 'coach_media', false, 52428800, ARRAY['video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Objects live at <client_id>/<uuid>.mp4
CREATE POLICY coach_media_client_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coach_media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY coach_media_client_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'coach_media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY coach_media_coach_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'coach_media' AND public.is_coach_of(((storage.foldername(name))[1])::uuid));
-- VERIFY: as a client, upload to '<own id>/x.mp4' succeeds; to '<other id>/x.mp4' fails.
```

- [ ] **Step 2: Show the SQL to the owner and stop.** The web coach inbox must also be able to play `attachment_path` via a signed URL. That work belongs to the web inbox plan in Phase 2 Task 2.7.
- [ ] **Step 3: Write the failing test** (pure parts only; the upload is covered by the device check)

```ts
// src/features/coach/form-check.test.ts
import { formCheckBody, formCheckPath } from './form-check';

it('stores videos under the client folder and describes the set', () => {
  expect(formCheckPath('client-1', 'abc')).toBe('client-1/abc.mp4');
  expect(formCheckBody('Bench press', 2)).toBe('Form check: Bench press, set 2');
});
```
- [ ] **Step 4: Implement**

```ts
// src/features/coach/form-check.ts
import { supabase } from '@/lib/supabase';

export const formCheckPath = (userId: string, id: string) => `${userId}/${id}.mp4`;
export const formCheckBody = (exercise: string, setNumber: number) => `Form check: ${exercise.trim()}, set ${setNumber}`;

const randomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Uploads a recorded clip, then posts it to the coach thread pinned to the set. */
export async function sendFormCheck(input: { userId: string; uri: string; exercise: string; setNumber: number; date: string; logId: string | null }): Promise<void> {
  const path = formCheckPath(input.userId, randomId());
  const body = await (await fetch(input.uri)).arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('coach_media').upload(path, body, { contentType: 'video/mp4', upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from('coach_messages').insert({
    client_id: input.userId, sender_id: input.userId, body: formCheckBody(input.exercise, input.setNumber),
    context_type: 'workout_set', context_id: `${input.logId ?? 'draft'}:${input.exercise.trim()}:${input.setNumber}`, context_date: input.date,
    attachment_path: path, attachment_type: 'video',
  });
  if (error) {
    await supabase.storage.from('coach_media').remove([path]).catch(() => undefined);
    throw error;
  }
}
```
- [ ] **Step 5: Run the test.** Expected: PASS.
- [ ] **Step 6: Recording button.** In `CurrentSetEditor.tsx`, inside "Effort & options", add a `formCheck?: { onRecord: () => void; sending: boolean; message: string | null }` prop and render it:

```tsx
      {formCheck ? <>
        <Button label={formCheck.sending ? 'Sending to your coach…' : 'Record a form check'} variant="secondary" loading={formCheck.sending} onPress={formCheck.onRecord} />
        {formCheck.message ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">{formCheck.message}</Text> : null}
      </> : null}
```
  In `ExerciseSlide.tsx`, add a pass-through prop `formCheck?: (setNumber: number) => { onRecord: () => void; sending: boolean; message: string | null }` and call it with `activeIndex + 1`. In `app/(app)/logger.tsx`, implement it with this state:
  - `const [formCheckState, setFormCheckState] = useState<{ sending: boolean; message: string | null }>({ sending: false, message: null });`

  `onRecord` does the following:
  1. `const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setFormCheckState({ sending: false, message: 'Allow camera access in Settings to record a form check.' }); return; }`
  2. `const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 20, quality: 0.5 }); if (result.canceled) return;`
  3. `setFormCheckState({ sending: true, message: null });`, then `await sendFormCheck({ userId, uri: result.assets[0].uri, exercise: current.name, setNumber, date, logId: state.existingLogId })`.
  4. On success: `setFormCheckState({ sending: false, message: 'Sent to your coach.' })`.
  5. On failure: `setFormCheckState({ sending: false, message: 'Couldn’t send the video. Try again when you have a connection.' })`.

  `import * as ImagePicker from 'expo-image-picker'`.
- [ ] **Step 7: Thread display.**
  - In `coach-messages.ts`, add `attachment_path: string | null;` to `CoachMessage`. Add `attachment_path: null` to the `base` and `message()` fixtures in `coach-messages.test.ts` and `CoachScreen.test.tsx`.
  - In `MessageBubble`, under the body, add `{message.attachment_path ? <Text variant="caption" tone="primary">Form check video</Text> : null}`. Clients don't replay their own clips in this version; the coach plays them on the web.
- [ ] **Step 8: Microphone permission.** In `app.json`, in the `expo-image-picker` plugin options, add:
  `"microphonePermission": "Dawnage records sound with form-check videos you send to your coach."`
- [ ] **Step 9: Run.** `npx jest src/features/coach src/components/logger --runInBand && npm run typecheck`. Expected: PASS.
- [ ] **Step 10: Commit** (after the owner has approved the SQL)

```bash
git add plans/sql/2026-09-26_coach_media.sql src/features/coach "app/(app)/logger.tsx" src/components/logger app.json
git commit -m "feat(mobile): send a form-check video to the coach from a set"
```
- [ ] **Step 11: 🔒 Device check (owner).**
  - Record a 10-second clip → "Sent to your coach." appears.
  - The coach thread shows "Form check video" pinned "About your set".
  - The object exists in the `coach_media` bucket under the client's folder.

**Phase 8 exit:** `npm run verify` passes. Each shipped feature has had its device check or has been explicitly deferred by the owner.
