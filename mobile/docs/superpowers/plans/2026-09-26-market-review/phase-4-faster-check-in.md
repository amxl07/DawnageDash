# Phase 4: Faster daily check-in implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. **Global Constraint 3 applies to every task here:** every applicable field stays required. We pre-fill and group; we never make a field optional, skip it, or auto-submit.

**Goal:** Make the daily check-in quick enough to do daily (F3):
- **Morning** step (weight, sleep, energy) that can be done on waking.
- **Your day** step for the rest.
- A visible "9 of 16 answered" counter.
- Sleep imported from Apple Health / Health Connect, like the weight and steps imports that already exist.

Macros from the meal log come in Phase 5.

**Architecture:**
- Regrouping is a data change in the field registry (`fields.ts`) and the per-step validator. The form moves two existing blocks.
- The counter is a pure function.
- Sleep import adds one field to the existing Health pipeline (`health-model.ts` and both readers), with a pure interval-merging function.

**Tech stack:**
- `@kingstinct/react-native-healthkit` 16: `queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', …)`
- `react-native-health-connect` 4.1.3: `readRecords('SleepSession', …)`
- Existing check-in editor.

**Spec:** [F3](../../specs/2026-09-26-market-review-findings.md#f3-p1-the-daily-check-in-is-too-long-to-do-daily).

---

### Task 4.1: Regroup into "Morning" and "Your day"

**Files:**
- Modify: `src/features/checkin/config/fields.ts` (sections and order of `sleepHours` and `stressLevel`)
- Modify: `src/lib/checkin-validation.ts` (`validateCheckInStep` readiness/recovery branches)
- Modify: `src/components/checkin/CheckInForm.tsx` (readiness and recovery branches)
- Modify: `src/components/checkin/checkin-presentation.ts` (titles)
- Modify: `src/components/checkin/CheckInStageHeader.tsx` (icons)
- Test: `src/lib/checkin-validation.test.ts`, plus existing check-in suites (update step expectations only)
- Update: `.maestro/home-checkin.yaml` and `.maestro/checkin-backfill.yaml` (move the sleep/stress taps to their new steps)

**Interfaces:**
- Produces: `readiness` = morningWeight, sleepHours, energyLevel. `recovery` = stressLevel, hungerLevel, digestion. `adherence` and `finish` are unchanged.

- [ ] **Step 1: Write the failing test.** Append to `src/lib/checkin-validation.test.ts`:

```ts
import { EMPTY_FORM } from '@/features/checkin/model';

it('asks for weight, sleep and energy in the morning step, and stress with the rest of the day', () => {
  expect(Object.keys(validateCheckInStep('readiness', EMPTY_FORM)).sort()).toEqual(['energyLevel', 'morningWeight', 'sleepHours']);
  expect(Object.keys(validateCheckInStep('recovery', EMPTY_FORM)).sort()).toEqual(['digestion', 'hungerLevel', 'stressLevel']);
});
```
  If `validateCheckInStep` or `EMPTY_FORM` is already imported in that file, don't import it twice.
- [ ] **Step 2: Run it.** `npx jest src/lib/checkin-validation.test.ts --runInBand`. Expected: FAIL (sleep is still in recovery).
- [ ] **Step 3: Update the validator.** In `validateCheckInStep`, replace the `readiness` and `recovery` branches with:

```ts
  if (step === 'readiness') {
    if (form.morningWeight === null) errors.morningWeight = 'Enter your morning weight.';
    if (form.sleepHours === null) errors.sleepHours = 'Add your sleep hours.';
    if (form.energyLevel === null) errors.energyLevel = 'Choose your energy level.';
    if (isOutside(form.morningWeight, 20, 400)) errors.morningWeight = 'Enter a weight between 20 and 400 kg.';
    if (isOutside(form.sleepHours, 0, 24)) errors.sleepHours = 'Enter sleep between 0 and 24 hours.';
    addRatingError(errors, 'energyLevel', form.energyLevel);
  }

  if (step === 'recovery') {
    if (form.stressLevel === null) errors.stressLevel = 'Choose your stress level.';
    if (form.hungerLevel === null) errors.hungerLevel = 'Choose your hunger level.';
    if (!isDigestion(form.digestion)) errors.digestion = 'Choose your digestion status.';
    addRatingError(errors, 'stressLevel', form.stressLevel);
    addRatingError(errors, 'hungerLevel', form.hungerLevel);
  }
```
- [ ] **Step 4: Update the registry.** In `fields.ts`, reorder the first six entries of `CHECK_IN_FIELDS` to this order, and change the two `section` values:

```ts
  { id: 'morningWeight', payloadKey: 'morning_weight', section: 'readiness', label: 'Morning weight', control: 'ruler', unit: 'kg', min: 20, max: 400, step: 0.1, precision: 1, carryForward: true },
  { id: 'sleepHours', payloadKey: 'sleep_hours', section: 'readiness', label: 'Sleep', control: 'ruler', unit: 'h', min: 0, max: 24, step: 0.5, precision: 1, carryForward: true },
  { id: 'energyLevel', payloadKey: 'energy_level', section: 'readiness', label: 'Energy', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  { id: 'stressLevel', payloadKey: 'stress_level', section: 'recovery', label: 'Stress', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  { id: 'hungerLevel', payloadKey: 'hunger_level', section: 'recovery', label: 'Hunger', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
```
  The `digestion` entry and everything after it stay unchanged.
- [ ] **Step 5: Move the two blocks in `CheckInForm.tsx`.** Change **no props**; only move JSX:
  1. **Readiness branch.**
     - Keep the Morning weight `NumericEntry` first.
     - Cut the entire Sleep `NumericEntry` block (label "Sleep", including its child `<Text>` "Sleep during the night before this reporting date." and its `PreviousValueButton`) out of the recovery branch, and paste it directly after the Morning weight block.
     - Replace the ratings `.map` over `[['Energy', …], ['Stress', …]]` with a single Energy block written out:

```tsx
        <CheckInFieldBlock label="Energy" description="How much energy did you have today?"
          focusTarget={(node) => registerField?.('energyLevel', node)} complete={form.energyLevel !== null}
          error={errors.energyLevel} testID="checkin-field-energy">
          <CheckInRatingScale label="Energy out of 10" lowLabel="Exhausted" highLabel="Very energetic"
            value={form.energyLevel} onChange={(v) => set('energyLevel', v)} accessibilityMode="options" optionTestIDPrefix="checkin-energy-rating" />
          <HistoryCaption value={form.energyLevel} history={history?.energyLevel} precision={0} />
        </CheckInFieldBlock>
```
  2. **Recovery branch.** As the first child of the `Card`, before Hunger, add:

```tsx
        <CheckInFieldBlock label="Stress" description="How much stress did you feel today?"
          focusTarget={(node) => registerField?.('stressLevel', node)} complete={form.stressLevel !== null}
          error={errors.stressLevel} testID="checkin-field-stress">
          <CheckInRatingScale label="Stress out of 10" lowLabel="Relaxed" highLabel="Very stressed"
            value={form.stressLevel} onChange={(v) => set('stressLevel', v)} accessibilityMode="options" optionTestIDPrefix="checkin-stress-rating" />
          <HistoryCaption value={form.stressLevel} history={history?.stressLevel} precision={0} />
        </CheckInFieldBlock>
```
- [ ] **Step 6: Titles and icons.**
  - In `checkin-presentation.ts`, set `readiness: { title: 'Morning' }` and `recovery: { title: 'Your day' }`.
  - In `CheckInStageHeader.tsx`, import `Sunrise` from `lucide-react-native` and set `STAGE_ICONS = { readiness: Sunrise, recovery: Gauge, adherence: Target, finish: ClipboardCheck }`. Remove the now-unused `Moon` import.
- [ ] **Step 7: Run the check-in suites.**
  `npx jest src/lib/checkin-validation.test.ts src/features/checkin src/components/checkin src/features/health src/screens --runInBand`
  Expected: the new test passes. For each failing old assertion, the **only** allowed changes are:
  - which step a field is on (sleep moves to step 1, stress moves to step 2)
  - the step titles ("Readiness" → "Morning", "Recovery" → "Your day")
  - the lucide mock (add `Sunrise: () => null`)

  If anything else fails, stop and report it.
- [ ] **Step 8: Update Maestro flows.** In `.maestro/home-checkin.yaml` and `.maestro/checkin-backfill.yaml`:
  - Move every step that taps `checkin-stress-rating-*` to after the first `checkin-next` tap.
  - Move every step that sets Sleep to before it.

  Run `npx jest src/__tests__/maestro-contract.test.ts --runInBand`. Expected: PASS.
- [ ] **Step 9: Commit**

```bash
git add src/features/checkin/config/fields.ts src/lib/checkin-validation.ts src/lib/checkin-validation.test.ts src/components/checkin src/features/checkin src/features/health src/screens .maestro
git commit -m "feat(mobile): group the check-in into morning and day steps"
```

---

### Task 4.2: "9 of 16 answered" counter and shorter copy

**Files:**
- Create: `src/features/checkin/answer-progress.ts`
- Test: `src/features/checkin/answer-progress.test.ts`
- Modify: `src/components/checkin/CheckInStageHeader.tsx` (optional `progress` prop)
- Modify: `src/features/checkin/CheckInEditorScreen.tsx` (pass `progress`; replace line ~334 copy; rename the save-draft button at line ~351)
- Update: tests that assert the replaced strings

**Interfaces:**
- Consumes: `FormState` from `./model`; `requiresWorkoutPerformance` from `@/lib/checkin-validation`
- Produces:
  - `answerProgress(form: FormState): { answered: number; total: number }`
  - `CheckInStageHeader` prop `progress?: { answered: number; total: number }`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/checkin/answer-progress.test.ts
import { answerProgress } from './answer-progress';
import { EMPTY_FORM } from './model';

it('counts 15 required answers, 16 when the workout needs a performance score', () => {
  expect(answerProgress(EMPTY_FORM)).toEqual({ answered: 0, total: 15 });
  expect(answerProgress({ ...EMPTY_FORM, workoutStatus: 'done' })).toEqual({ answered: 1, total: 16 });
});
it('counts explicit zeros and non-blank notes as answered', () => {
  expect(answerProgress({ ...EMPTY_FORM, dailySteps: 0, notes: '  ' }).answered).toBe(1);
  expect(answerProgress({ ...EMPTY_FORM, notes: 'Felt good' }).answered).toBe(1);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/features/checkin/answer-progress.ts
import { requiresWorkoutPerformance } from '@/lib/checkin-validation';

import type { FormState } from './model';

const ALWAYS: readonly (keyof FormState)[] = [
  'morningWeight', 'sleepHours', 'energyLevel', 'stressLevel', 'hungerLevel', 'digestion',
  'workoutStatus', 'nutritionScore', 'calorieIntake', 'waterLiters', 'dailySteps', 'protein', 'carbs', 'fats',
];

/** Mirrors validateCheckIn's required set: every field, plus performance after training, plus notes. */
export function answerProgress(form: FormState): { answered: number; total: number } {
  const fields = requiresWorkoutPerformance(form.workoutStatus) ? [...ALWAYS, 'workoutPerformance' as const] : ALWAYS;
  const answered = fields.filter((field) => form[field] !== null).length + (form.notes.trim() ? 1 : 0);
  return { answered, total: fields.length + 1 };
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Show it in the header.** In `CheckInStageHeader.tsx`:
  - Add `progress?: { answered: number; total: number }` to `Props` and destructure it.
  - Replace the step label text `{\`Step ${stepIndex + 1} of ${totalSteps}\`}` with:

```tsx
{`Step ${stepIndex + 1} of ${totalSteps}${progress ? ` · ${progress.answered} of ${progress.total} answered` : ''}`}
```
- [ ] **Step 6: Wire the editor** (`CheckInEditorScreen.tsx`):
  1. Import `answerProgress` from `./answer-progress`.
  2. Pass `progress={answerProgress(editor.form)}` to `<CheckInStageHeader …>` (line ~333).
  3. Replace the text "All fields are required. You can save a draft and finish later." (line ~334) with "Every answer is needed. Your draft saves as you go."
  4. Replace the button label "Save draft and return Home" (line ~351) with "Save and finish later".
- [ ] **Step 7: Update the tests.**
  `grep -rn "All fields are required\|Save draft and return Home" src .maestro`. Replace each old string in tests and flows with the new one.
  Run `npx jest src/features/checkin src/components/checkin src/screens src/__tests__ --runInBand`. Expected: PASS.
- [ ] **Step 8: Commit**

```bash
git add src/features/checkin/answer-progress.ts src/features/checkin/answer-progress.test.ts src/components/checkin/CheckInStageHeader.tsx src/features/checkin/CheckInEditorScreen.tsx src/features/checkin src/components/checkin src/screens src/__tests__ .maestro
git commit -m "feat(mobile): show answered count in the check-in"
```

---

### Task 4.3: Import sleep from Apple Health and Health Connect (device verification required)

**Files:**
- Modify: `src/features/health/health-model.ts` (`HEALTH_FIELDS`, `HealthWindow`, `healthDayWindow`, new `sleepHoursFromIntervals`)
- Modify: `src/features/health/healthkit-reader.ts` (client type, read types, sleep job)
- Modify: `src/features/health/healthconnect-reader.ts` (permissions, `recordFields`, SleepSession branch)
- Modify: `app.config.ts` (the `NSHealthShareUsageDescription` text; the Android permission list gains `android.permission.health.READ_SLEEP`)
- Modify: any `Record<HealthField, …>` flagged by typecheck (known: `src/features/health/health-review.ts:3` uses `Partial<…>`, so it needs no change)
- Test: `src/features/health/health-model.test.ts`, `src/features/health/health-readers.test.ts`, `src/features/health/health-config.test.ts`

**Interfaces:**
- Produces:
  - `HEALTH_FIELDS` includes `'sleepHours'`
  - `HealthWindow.sleepStart: Date` (18:00 on the day before the reporting date)
  - `sleepHoursFromIntervals(intervals: readonly { start: Date; end: Date }[], windowStart: Date, windowEnd: Date): number | null`

- [ ] **Step 1: Write the failing pure test.** Append to `health-model.test.ts`:

```ts
import { healthDayWindow, sleepHoursFromIntervals } from './health-model';

it('merges overlapping sleep intervals inside the overnight window', () => {
  const at = (h: number, m = 0, day = 26) => new Date(2026, 8, day, h, m);
  const start = at(18, 0, 25);
  const end = at(12);
  expect(sleepHoursFromIntervals([
    { start: at(23, 0, 25), end: at(3) },
    { start: at(2), end: at(6, 30) },          // overlaps the first by one hour
    { start: at(14, 0, 25), end: at(15, 0, 25) }, // afternoon nap before the window: ignored
  ], start, end)).toBe(7.5);
  expect(sleepHoursFromIntervals([], start, end)).toBeNull();
});

it('opens the sleep window at 18:00 the evening before', () => {
  expect(healthDayWindow('2026-09-26', new Date(2026, 8, 26, 9)).sleepStart).toEqual(new Date(2026, 8, 25, 18));
});
```

- [ ] **Step 2: Run it.** `npx jest src/features/health/health-model.test.ts --runInBand`. Expected: FAIL.
- [ ] **Step 3: Implement in `health-model.ts`**
  1. Change `HEALTH_FIELDS` to:
     `['morningWeight', 'sleepHours', 'dailySteps', 'calorieIntake', 'waterLiters', 'protein', 'carbs', 'fats'] as const`
  2. Add `sleepStart: Date` to `HealthWindow`.
  3. In `healthDayWindow`, add `sleepStart: new Date(year, month - 1, day - 1, 18)` to the returned object.
  4. Add:

```ts
/** Total merged time asleep inside [windowStart, windowEnd], in hours (one decimal). */
export function sleepHoursFromIntervals(intervals: readonly { start: Date; end: Date }[], windowStart: Date, windowEnd: Date): number | null {
  const clipped = intervals
    .map(({ start, end }) => ({ start: Math.max(start.getTime(), windowStart.getTime()), end: Math.min(end.getTime(), windowEnd.getTime()) }))
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a.start - b.start);
  if (!clipped.length) return null;
  let total = 0;
  let current = { ...clipped[0] };
  for (const next of clipped.slice(1)) {
    if (next.start <= current.end) current.end = Math.max(current.end, next.end);
    else { total += current.end - current.start; current = { ...next }; }
  }
  total += current.end - current.start;
  return normalizeMeasurement('sleepHours', total / 3_600_000);
}
```

- [ ] **Step 4: Run it.** Expected: PASS. Then run `npm run typecheck` and fix every error caused by the new `HealthField` member by adding a `sleepHours` case next to the existing `morningWeight` case.
- [ ] **Step 5: HealthKit reader.** In `healthkit-reader.ts`:
  1. Add `'queryCategorySamples'` to the `HealthKitClient` `Pick<…>` list.
  2. Change `HEALTHKIT_READ_TYPES` to:
     `['HKQuantityTypeIdentifierBodyMass', 'HKCategoryTypeIdentifierSleepAnalysis', ...TOTALS.map(t => t.identifier)] as const`
  3. Add this job to the `jobs` array, after the weight job:

```ts
    (async () => {
      try {
        const samples = await hk.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, ascending: true, filter: { date: { startDate: window.sleepStart, endDate: window.morningEnd } } });
        // 1 asleepUnspecified, 3 core, 4 deep, 5 REM. 0 inBed and 2 awake are not sleep.
        const asleep = samples.filter(s => [1, 3, 4, 5].includes(Number(s.value)));
        const hours = sleepHoursFromIntervals(asleep.map(s => ({ start: s.startDate, end: s.endDate })), window.sleepStart, window.morningEnd);
        if (hours !== null) measurements.push({ field: 'sleepHours', value: hours, sources: asleep[0]?.sourceRevision?.source ? sourceNames([asleep[0].sourceRevision.source]) : [provider] });
        else addIssue('sleepHours', 'empty', 'No accessible sleep recorded for last night.');
      } catch { addIssue('sleepHours', 'error', 'Sleep could not be read. Retry after unlocking your device.'); }
    })(),
```
     Import `sleepHoursFromIntervals` from `./health-model`.
- [ ] **Step 6: Health Connect reader.** In `healthconnect-reader.ts`:
  1. Add `'SleepSession'` to the permission list:
     `['Weight', 'Steps', 'Nutrition', 'Hydration', 'SleepSession']`
  2. Add `SleepSession: ['sleepHours']` to `recordFields`.
  3. In the per-record-type branch, add before the final `else`:

```ts
      } else if (recordType === 'SleepSession') {
        const page = await hc.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: window.sleepStart.toISOString(), endTime: window.morningEnd.toISOString() }, pageSize: 100 });
        const hours = sleepHoursFromIntervals(page.records.map(r => ({ start: new Date(r.startTime), end: new Date(r.endTime) })), window.sleepStart, window.morningEnd);
        if (hours === null) issues.push({ field: 'sleepHours', kind: 'empty', message: 'No accessible sleep recorded for last night.' });
        else measurements.push({ field: 'sleepHours', value: hours, sources: page.records[0]?.metadata?.dataOrigin ? [page.records[0].metadata.dataOrigin] : [provider] });
```
     Import `sleepHoursFromIntervals`. `window.sleepStart.toISOString()` is correct here: it is an instant for the provider, not a reporting-date key.
- [ ] **Step 7: Permissions and copy** in `app.config.ts`:
  - Add `'android.permission.health.READ_SLEEP',` after `READ_HYDRATION`.
  - Change `NSHealthShareUsageDescription` to: `'Dawnage reads your weight, sleep, steps, food intake and water for you to review. Chosen values enter your daily check-in and are shared with your coach when you submit.'`
  - Update `health-config.test.ts` to expect both.
- [ ] **Step 8: Reader tests.** In `health-readers.test.ts`, find the fake HealthKit client and add:
     `queryCategorySamples: jest.fn(async () => [{ value: 3, startDate: new Date(2026, 8, 25, 23), endDate: new Date(2026, 8, 26, 6, 30), sourceRevision: { source: { name: 'Watch', bundleIdentifier: 'com.apple.health' } } }])`
  Add an assertion that the result contains `{ field: 'sleepHours', value: 7.5 }`.
  Do the same for the Health Connect fake:
     `readRecords` returns `{ records: [{ startTime: '2026-09-25T17:30:00.000Z', endTime: '2026-09-26T01:00:00.000Z', metadata: { dataOrigin: 'com.fitbit' } }] }` when `recordType === 'SleepSession'`.
  Compute the expected hours for the test's timezone from those instants, or pick instants that fall inside the window in any timezone the tests run in.
- [ ] **Step 9: Run.** `npx jest src/features/health --runInBand && npm run typecheck`. Expected: PASS.
- [ ] **Step 10: Commit**

```bash
git add src/features/health app.config.ts
git commit -m "feat(mobile): import last night's sleep from health apps"
```
- [ ] **Step 11: 🔒 Device check (owner).** On a development build, run Check-in → Import from health app:
  - On iOS with Watch sleep data, and on Android with a Health Connect sleep source, "Sleep" appears in the review sheet with the right hours.
  - Denying sleep access shows the existing "Read access is off" message and does not affect the other fields.

  Record the result in `docs/release/2026-09-26-device-acceptance.md` under `## Sleep import`.

**Phase 4 exit:** `npm run verify` passes. With weight, sleep and steps imported, the Morning step takes one tap for energy plus one "Continue".
