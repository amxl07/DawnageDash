# Daily Check-In Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing four-stage daily check-in more tactile, visually rewarding, and pleasant to repeat while preserving every question, 1–10 value, validation rule, payload field, and coach-facing meaning.

**Architecture:** Add focused presentational components under `mobile/src/components/checkin` and keep routing, drafts, validation, mutation, and payload conversion in their existing owners. The new rating scale exposes the exact integers 1–10, uses two rows of five on phone widths, and applies only transform/opacity feedback. The route screen composes the new stage header and bounded transition without changing data flow.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, React Native Reanimated 4, Expo Haptics, Lucide React Native, Jest 29 with `jest-expo`

**Spec:** `docs/superpowers/specs/2026-08-31-daily-checkin-interaction-design.md`

## Global Constraints

- Preserve all four stages, existing question wording, field order, enum options, required/optional rules, ranges, and the review step.
- Preserve exact 1–10 integer selection for Energy, Stress, Hunger, Workout performance, and Nutrition score.
- Do not change `FormState`, database columns, `CheckInPayload`, `toPayload`, draft shape, validation semantics, mutation behavior, or coach analytics.
- Never prefill today's subjective ratings.
- Use the existing Dawnage color, type, spacing, radius, safe-area, responsive, and motion tokens.
- Keep every touch target at least 44 by 44 points.
- Animate opacity and transform only during frequent interactions; do not animate layout dimensions or position.
- Reduced Motion removes scale and travel while leaving complete static state feedback.
- Keep visual variety deterministic per check-in date and supplemental to the fixed questionnaire.
- Use Lucide icons rather than emoji as controls.
- Use `apply_patch` for file edits and preserve unrelated worktree changes.
- Execute this plan only after `2026-08-31-expo-router-test-boundary.md` is complete, so the screen suite lives under `mobile/src/screens/__tests__`.

## File Structure

- Create `mobile/src/components/checkin/checkin-presentation.ts`: deterministic daily copy and fixed stage metadata.
- Create `mobile/src/components/checkin/checkin-presentation.test.ts`: pure deterministic-copy and metadata tests.
- Create `mobile/src/components/checkin/CheckInStageHeader.tsx`: stage title, icon, progress, and daily framing.
- Create `mobile/src/components/checkin/CheckInStageHeader.test.tsx`: stage semantics and progress tests.
- Create `mobile/src/components/checkin/CheckInFieldBlock.tsx`: answered/invalid/unanswered visual state around an unchanged question.
- Create `mobile/src/components/checkin/CheckInFieldBlock.test.tsx`: state and accessibility tests.
- Create `mobile/src/components/checkin/CheckInSummarySection.tsx`: grouped confirmation rows.
- Create `mobile/src/components/checkin/CheckInSummarySection.test.tsx`: exact summary rendering tests.
- Create `mobile/src/components/checkin/CheckInRatingScale.tsx`: exact 1–10 responsive selector, animation, haptics, and accessibility.
- Create `mobile/src/components/checkin/CheckInRatingScale.test.tsx`: numeric, haptic, responsive, and accessibility tests.
- Modify `mobile/src/components/checkin/CheckInForm.tsx`: compose the focused components without changing form/payload semantics.
- Modify `mobile/src/components/checkin/CheckInForm.test.tsx`: lock the questionnaire and payload contract and verify composition.
- Modify `mobile/app/(app)/(tabs)/check-in.tsx`: compose the new header and stage-entry motion while retaining orchestration.
- Modify `mobile/src/screens/__tests__/tabs/check-in.test.tsx`: cover the unchanged validation/draft flow and the new header/transition contract.

---

### Task 1: Add deterministic daily framing and the stage header

**Files:**
- Create: `mobile/src/components/checkin/checkin-presentation.ts`
- Create: `mobile/src/components/checkin/checkin-presentation.test.ts`
- Create: `mobile/src/components/checkin/CheckInStageHeader.tsx`
- Create: `mobile/src/components/checkin/CheckInStageHeader.test.tsx`

**Interfaces:**
- Consumes: `CheckInStep`, a local `yyyy-MM-dd` date, existing `ProgressBar`, `Text`, theme tokens, and Lucide icons.
- Produces: `getCheckInDailyPrompt(date: string): string`, `CHECK_IN_STAGE_META`, and `CheckInStageHeader(props)`.

- [ ] **Step 1: Write failing deterministic-presentation tests**

Create `checkin-presentation.test.ts`:

```ts
import { CHECK_IN_DAILY_PROMPTS, CHECK_IN_STAGE_META, getCheckInDailyPrompt } from './checkin-presentation';

describe('check-in presentation', () => {
  it('returns stable supplemental copy for the same local date', () => {
    expect(getCheckInDailyPrompt('2026-08-31')).toBe(getCheckInDailyPrompt('2026-08-31'));
    expect(CHECK_IN_DAILY_PROMPTS).toContain(getCheckInDailyPrompt('2026-08-31'));
  });

  it('cycles deterministically without changing stage names', () => {
    expect(new Set(Array.from({ length: 14 }, (_, offset) =>
      getCheckInDailyPrompt(`2026-09-${String(offset + 1).padStart(2, '0')}`),
    )).size).toBeGreaterThan(1);
    expect(CHECK_IN_STAGE_META.readiness.title).toBe('Readiness and energy');
    expect(CHECK_IN_STAGE_META.recovery.title).toBe('Sleep and recovery');
    expect(CHECK_IN_STAGE_META.adherence.title).toBe('Nutrition and adherence');
    expect(CHECK_IN_STAGE_META.finish.title).toBe('Notes and confirmation');
  });
});
```

Create `CheckInStageHeader.test.tsx` with UI mocks matching the repository's component-test style:

```tsx
import { Text as NativeText, View } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInStageHeader } from './CheckInStageHeader';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui', () => ({
  ProgressBar: (props: object) => <View testID="stage-progress" {...props} />,
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <NativeText {...props}>{children}</NativeText>
  ),
}));
jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  radius: { pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({ colors: { primary: '#f04e45', primaryFill: '#511b1b', mutedForeground: '#888' } }),
}));

it('shows fixed stage copy, deterministic framing, and exact progress', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <CheckInStageHeader step="recovery" stepIndex={1} totalSteps={4} date="2026-08-31" />,
    );
  });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Sleep and recovery');
  expect(output).toContain('2 of 4');
  expect(renderer.root.findByProps({ testID: 'stage-progress' }).props).toMatchObject({
    value: 0.5,
    accessibilityLabel: 'Check-in step 2 of 4',
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `mobile/`:

```bash
npx jest \
  src/components/checkin/checkin-presentation.test.ts \
  src/components/checkin/CheckInStageHeader.test.tsx \
  --runInBand
```

Expected: FAIL because the presentation module and header do not exist.

- [ ] **Step 3: Implement the pure presentation model**

Create `checkin-presentation.ts` with these exact exports and no React dependency:

```ts
import type { CheckInStep } from './CheckInForm';

export const CHECK_IN_DAILY_PROMPTS = [
  'A quick honest check-in is enough.',
  'Small signals help your coach see the full week.',
  'Take a breath, then capture today as it is.',
  'Consistency matters more than a perfect day.',
  'A minute now makes your next plan more personal.',
  'Notice the day. Record it. Keep moving.',
  'Your daily signal helps reveal the trend.',
] as const;

export const CHECK_IN_STAGE_META: Record<CheckInStep, { title: string; description: string }> = {
  readiness: {
    title: 'Readiness and energy',
    description: 'A quick picture of how you are starting today.',
  },
  recovery: {
    title: 'Sleep and recovery',
    description: 'Capture sleep and the context that affects recovery.',
  },
  adherence: {
    title: 'Nutrition and adherence',
    description: 'Record training and the useful nutrition numbers.',
  },
  finish: {
    title: 'Notes and confirmation',
    description: 'Review your check-in before saving it.',
  },
};

export function getCheckInDailyPrompt(date: string): string {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const index = ((day % CHECK_IN_DAILY_PROMPTS.length) + CHECK_IN_DAILY_PROMPTS.length)
    % CHECK_IN_DAILY_PROMPTS.length;
  return CHECK_IN_DAILY_PROMPTS[index];
}
```

- [ ] **Step 4: Implement the stage header**

Create `CheckInStageHeader.tsx`. Map the four stages to `Gauge`, `Moon`, `Target`, and `ClipboardCheck` from Lucide. Render the exact metadata title/description, `Step {n} of {total}`, the deterministic prompt, and:

```tsx
export function CheckInStageHeader({ step, stepIndex, totalSteps, date }: Props) {
  const { colors } = useTheme();
  const Icon = STAGE_ICONS[step];
  const meta = CHECK_IN_STAGE_META[step];

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          accessible={false}
          style={{ padding: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primaryFill }}
        >
          <Icon size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="label" tone="primary">{`Step ${stepIndex + 1} of ${totalSteps}`}</Text>
          <Text variant="h2">{meta.title}</Text>
        </View>
      </View>
      <ProgressBar
        value={(stepIndex + 1) / totalSteps}
        glow={false}
        accessibilityLabel={`Check-in step ${stepIndex + 1} of ${totalSteps}`}
      />
      <Text variant="bodySm" tone="muted">{meta.description}</Text>
      <Text variant="bodySm" tone="muted">{getCheckInDailyPrompt(date)}</Text>
    </View>
  );
}
```

Use existing `spacing`, `radius`, `iconSize`, and theme colors. The icon container is decorative (`accessible={false}`) and the prompt is ordinary muted text, not an accessibility status announcement.

- [ ] **Step 5: Run tests and commit**

```bash
npx jest \
  src/components/checkin/checkin-presentation.test.ts \
  src/components/checkin/CheckInStageHeader.test.tsx \
  --runInBand
git add -- mobile/src/components/checkin/checkin-presentation.ts \
  mobile/src/components/checkin/checkin-presentation.test.ts \
  mobile/src/components/checkin/CheckInStageHeader.tsx \
  mobile/src/components/checkin/CheckInStageHeader.test.tsx
git commit -m "feat(mobile): add check-in daily framing"
```

Expected: both suites PASS and the commit contains no route or data-layer changes.

---

### Task 2: Add reusable field and confirmation presentation

**Files:**
- Create: `mobile/src/components/checkin/CheckInFieldBlock.tsx`
- Create: `mobile/src/components/checkin/CheckInFieldBlock.test.tsx`
- Create: `mobile/src/components/checkin/CheckInSummarySection.tsx`
- Create: `mobile/src/components/checkin/CheckInSummarySection.test.tsx`

**Interfaces:**
- Consumes: existing `Text`, theme tokens, Lucide `CheckCircle2`, children, and already formatted summary strings.
- Produces: `CheckInFieldBlock({ label, complete, error, children, testID })` and `CheckInSummarySection({ title, rows })`.

- [ ] **Step 1: Write failing component tests**

Create `CheckInFieldBlock.test.tsx` to verify all three states:

```tsx
import { StyleSheet, Text as NativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';
import { CheckInFieldBlock } from './CheckInFieldBlock';

jest.mock('lucide-react-native', () => ({ CheckCircle2: () => null }));
jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <NativeText {...props}>{children}</NativeText>
  ),
}));
jest.mock('@/theme', () => ({
  radius: { md: 12 }, spacing: { xs: 4, sm: 8, md: 12 },
  iconSize: { sm: 16 },
  useTheme: () => ({ colors: {
    border: '#222', borderStrong: '#444', card: '#111', elevated: '#191919',
    primary: '#f04e45', primaryFill: '#511b1b', mutedForeground: '#888',
  } }),
}));

it('distinguishes unanswered, answered, and invalid without hiding children', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(
    <CheckInFieldBlock label="Energy" complete={false} testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'field-energy' }).props.style).borderWidth).toBe(1);

  act(() => { renderer.update(
    <CheckInFieldBlock label="Energy" complete testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  expect(renderer.root.findByProps({ testID: 'field-energy-complete' })).toBeTruthy();

  act(() => { renderer.update(
    <CheckInFieldBlock label="Energy" complete error="Choose your energy level." testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Choose your energy level.');
});
```

Create `CheckInSummarySection.test.tsx`:

```tsx
import { Text as NativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';
import { CheckInSummarySection } from './CheckInSummarySection';

jest.mock('@/components/ui', () => ({ Text: NativeText }));
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12 } }));

it('renders every supplied label and exact formatted value', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(
    <CheckInSummarySection title="Readiness" rows={[
      ['Energy', '7/10'], ['Stress', '3/10'], ['Weight', '74.2 kg'],
    ]} />,
  ); });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Readiness');
  expect(output).toContain('Energy');
  expect(output).toContain('7/10');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest \
  src/components/checkin/CheckInFieldBlock.test.tsx \
  src/components/checkin/CheckInSummarySection.test.tsx \
  --runInBand
```

Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement the field block**

Implement `CheckInFieldBlock` as a non-accessible grouping `View`, so it does not swallow the accessibility nodes of its controls. Use this interface:

```ts
type Props = {
  label: string;
  complete: boolean;
  error?: string;
  children: React.ReactNode;
  testID?: string;
};
```

Render the unchanged visible label, a decorative `CheckCircle2` only when `complete && !error`, the children, and an inline live-region error. Use `colors.primary` for the invalid border, `colors.borderStrong` for completed, and `colors.border` for unanswered. Do not set `accessible` on the outer `View`.

```tsx
export function CheckInFieldBlock({ label, complete, error, children, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: error || complete ? 2 : 1,
        borderColor: error ? colors.primary : complete ? colors.borderStrong : colors.border,
        backgroundColor: complete ? colors.elevated : colors.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>{label}</Text>
        {complete && !error ? (
          <View testID={testID ? `${testID}-complete` : undefined} accessible={false}>
            <CheckCircle2 size={iconSize.sm} color={colors.primary} accessible={false} />
          </View>
        ) : null}
      </View>
      {children}
      {error ? <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 4: Implement the summary section**

Use this public interface:

```ts
type SummaryRow = readonly [label: string, value: string];
type Props = { title: string; rows: readonly SummaryRow[] };
```

Render the section title and each row as an accessible unit with `accessibilityLabel={`${label}: ${value}`}`. Use tabular numeric text for values and allow both label and value to wrap rather than forcing truncation.

```tsx
export function CheckInSummarySection({ title, rows }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">{title}</Text>
      {rows.map(([label, value]) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value}`}
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}
        >
          <Text variant="bodySm" tone="muted">{label}</Text>
          <Text variant="bodySm" numeric>{value}</Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 5: Run tests and commit**

```bash
npx jest \
  src/components/checkin/CheckInFieldBlock.test.tsx \
  src/components/checkin/CheckInSummarySection.test.tsx \
  --runInBand
git add -- mobile/src/components/checkin/CheckInFieldBlock.tsx \
  mobile/src/components/checkin/CheckInFieldBlock.test.tsx \
  mobile/src/components/checkin/CheckInSummarySection.tsx \
  mobile/src/components/checkin/CheckInSummarySection.test.tsx
git commit -m "feat(mobile): add check-in field presentation"
```

Expected: both suites PASS.

---

### Task 3: Build the exact 1–10 interactive rating scale

**Files:**
- Create: `mobile/src/components/checkin/CheckInRatingScale.tsx`
- Create: `mobile/src/components/checkin/CheckInRatingScale.test.tsx`

**Interfaces:**
- Consumes: exact `number | null`, `onChange(number)`, `useResponsiveLayout().isWide`, `useMotion`, Expo Haptics, Reanimated, and theme tokens.
- Produces: `CheckInRatingScale` with the same adjustable/options accessibility modes used by `RatingRow`.

- [ ] **Step 1: Write failing exact-value and haptic tests**

Create `CheckInRatingScale.test.tsx` and mock `useResponsiveLayout` with a mutable `mockIsWide`. Render the component with:

```tsx
<CheckInRatingScale
  label="Energy out of 10"
  value={4}
  onChange={onChange}
  accessibilityMode="options"
  optionTestIDPrefix="checkin-energy-rating"
/>
```

Assert:

```ts
expect(renderer.root.findAllByProps({ accessibilityRole: 'radio' })).toHaveLength(10);
expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-10' }).props.accessibilityLabel)
  .toBe('Energy out of 10, 10');
expect(StyleSheet.flatten(
  renderer.root.findByProps({ testID: 'checkin-energy-rating-10' }).props.style,
)).toEqual(expect.objectContaining({ minHeight: 44 }));

act(() => renderer.root.findByProps({ testID: 'checkin-energy-rating-7' }).props.onPress());
expect(onChange).toHaveBeenCalledWith(7);
expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

act(() => renderer.root.findByProps({ testID: 'checkin-energy-rating-4' }).props.onPress());
expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
```

The final assertion proves tapping the already selected value produces neither a data update nor a haptic.

- [ ] **Step 2: Write failing accessibility, progress, and responsive tests**

Add cases that verify:

```ts
expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-row-1' })).toBeTruthy();
expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-row-2' })).toBeTruthy();
expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-3-progress' }).props.style.opacity).toBe(1);
expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-5-progress' }).props.style.opacity).toBe(0);
```

Render adjustable mode and assert the group reports:

```ts
expect(group.props).toMatchObject({
  accessible: true,
  accessibilityRole: 'adjustable',
  accessibilityLabel: 'Hunger out of 10',
  accessibilityValue: { min: 1, max: 10, now: 5 },
});
```

Call its increment/decrement accessibility actions and expect exact adjacent integers. Set `mockIsWide = true`, rerender, and assert row 1 contains ten options while row 2 is absent.

Mock `useMotion` with a mutable reduced-motion result. In reduced mode, select a new value and assert the Reanimated timing call receives a zero duration and the final scale is `1`; numeric selection and haptics must still work.

- [ ] **Step 3: Run the suite to verify it fails**

```bash
npx jest src/components/checkin/CheckInRatingScale.test.tsx --runInBand
```

Expected: FAIL because `CheckInRatingScale` does not exist.

- [ ] **Step 4: Implement the rating scale**

Use a discriminated props union matching the existing accessibility contract:

```ts
type CommonProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
};

type Props = CommonProps & (
  | { accessibilityMode?: 'adjustable'; optionTestIDPrefix?: string }
  | { accessibilityMode: 'options'; optionTestIDPrefix: string }
);
```

Implementation rules:

1. Generate `const values = [1,2,3,4,5,6,7,8,9,10] as const`.
2. Use `[values]` for wide mode and `[values.slice(0, 5), values.slice(5)]` for phone mode.
3. Give each option `flex: 1`, `minWidth: HIT_SLOP_MIN`, and `minHeight: HIT_SLOP_MIN` inside a row with `gap: spacing.sm`.
4. Only the exact selected option uses `colors.primaryFill`, a two-point `colors.primary` border, and `tone="onPrimary"`.
5. Each option renders a two-point bottom progress strip with `opacity: value !== null && option <= value ? 1 : 0`; the strip is decorative and uses `colors.primary`.
6. `select(next)` returns immediately when `next === value`; otherwise it calls `onChange(next)` and `Haptics.selectionAsync()` once.
7. Adjustable mode owns the accessible group and hides its ten visual options. Options mode exposes ten radios with exact labels and selected state.
8. Use a small internal `RatingOption` with a shared scale value. When it becomes active, set scale to `motion.enabled ? 0.97 : 1` and settle to `1` with `withTiming(..., { duration: motion.duration.feedback })`. The animated style contains only `transform: [{ scale }]`.

The selection and responsive-row core should be explicit:

```tsx
const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const rows = isWide ? [values] : [values.slice(0, 5), values.slice(5, 10)];
const exposesOptions = accessibilityMode === 'options';

const select = (next: number) => {
  if (next === value) return;
  onChange(next);
  void Haptics.selectionAsync();
};

return (
  <View
    accessible={!exposesOptions}
    accessibilityRole={exposesOptions ? undefined : 'adjustable'}
    accessibilityLabel={exposesOptions ? undefined : label}
    accessibilityValue={exposesOptions ? undefined : { min: 1, max: 10, now: value ?? 1 }}
    accessibilityActions={exposesOptions ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={exposesOptions ? undefined : ({ nativeEvent }) => {
      const current = value ?? 1;
      if (nativeEvent.actionName === 'increment') select(Math.min(10, current + 1));
      if (nativeEvent.actionName === 'decrement') select(Math.max(1, current - 1));
    }}
    style={{ gap: spacing.sm }}
  >
    {rows.map((row, rowIndex) => (
      <View
        key={rowIndex}
        testID={optionTestIDPrefix ? `${optionTestIDPrefix}-row-${rowIndex + 1}` : undefined}
        style={{ flexDirection: 'row', gap: spacing.sm }}
      >
        {row.map((option) => (
          <RatingOption
            key={option}
            option={option}
            active={value === option}
            progressed={value !== null && option <= value}
            onPress={() => select(option)}
            accessible={exposesOptions}
            label={label}
            testID={optionTestIDPrefix ? `${optionTestIDPrefix}-${option}` : undefined}
          />
        ))}
      </View>
    ))}
  </View>
);
```

- [ ] **Step 5: Run focused tests, UI contracts, and commit**

```bash
npx jest src/components/checkin/CheckInRatingScale.test.tsx --runInBand
npm run verify:ui
git add -- mobile/src/components/checkin/CheckInRatingScale.tsx \
  mobile/src/components/checkin/CheckInRatingScale.test.tsx
git commit -m "feat(mobile): add tactile check-in rating scale"
```

Expected: the component suite and UI contracts PASS; no rating value is mapped or transformed.

---

### Task 4: Compose the new controls without changing the questionnaire contract

**Files:**
- Modify: `mobile/src/components/checkin/CheckInForm.tsx`
- Modify: `mobile/src/components/checkin/CheckInForm.test.tsx`

**Interfaces:**
- Consumes: `CheckInRatingScale`, `CheckInFieldBlock`, `CheckInSummarySection`, existing `FormState`, controls, validation errors, and payload helpers.
- Produces: the same `CheckInForm`, `EMPTY_FORM`, `fromRow`, `prefillFrom`, and `toPayload` exports with unchanged types and values.

- [ ] **Step 1: Add a complete payload characterization test**

Before changing production code, extend `CheckInForm.test.tsx`:

```ts
expect(toPayload(COMPLETE_FORM, '2026-08-30')).toEqual({
  date: '2026-08-30',
  morning_weight: 74.2,
  sleep_hours: 8,
  workout_status: 'done',
  workout_performance: 8,
  nutrition_score: 9,
  calorie_intake: 2200,
  water_liters: 2.5,
  daily_steps: 9000,
  protein: 160,
  carbs: 220,
  fats: 60,
  energy_level: 7,
  hunger_level: 5,
  stress_level: 3,
  digestion: 'none',
  notes: 'Slept well',
});
```

Run it once before the refactor; it must PASS and becomes the non-regression lock for stored data.

- [ ] **Step 2: Replace the rating mock and write failing composition assertions**

Mock `./CheckInRatingScale`, `./CheckInFieldBlock`, and `./CheckInSummarySection` directly. The rating mock must expose its label, value, accessibility mode, prefix, and `onChange`. Assert all fixed rating questions are still wired:

```ts
expect(ratingProps('Energy out of 10')).toMatchObject({ value: 7, optionTestIDPrefix: 'checkin-energy-rating' });
expect(ratingProps('Stress out of 10')).toMatchObject({ value: 3, optionTestIDPrefix: 'checkin-stress-rating' });
expect(ratingProps('Hunger out of 10')).toMatchObject({ value: 5 });
expect(ratingProps('Workout performance out of 10')).toMatchObject({ value: 8 });
expect(ratingProps('Nutrition score out of 10')).toMatchObject({ value: 9 });
```

Retain the existing test proving that changing Workout to `rest_day` clears `workoutPerformance` and serializes it as `null`.

- [ ] **Step 3: Run the form suite to verify the new composition test fails**

```bash
npx jest src/components/checkin/CheckInForm.test.tsx --runInBand
```

Expected: the payload characterization passes and the new component assertions fail because `CheckInForm` still uses `RatingRow`.

- [ ] **Step 4: Integrate rating and field blocks**

In `CheckInForm.tsx`:

- Replace each check-in `RatingRow` with `CheckInRatingScale` using the same label, exact value, and setter.
- Preserve `accessibilityMode="options"` and existing test ID prefixes for Energy and Stress.
- Use adjustable mode for Hunger, Workout performance, and Nutrition score, matching their current accessibility exposure.
- Wrap rating and segmented questions in `CheckInFieldBlock`; set `complete` from the exact existing value (`value !== null`) and pass the existing error.
- Keep Stepper labels, values, increments, precision, limits, suffixes, hints, and error props unchanged.
- Keep `WORKOUT_SEGMENTS`, `DIGESTION_SEGMENTS`, conditional performance logic, and `setWorkoutStatus` unchanged.
- Keep the optional macro disclosure. Add an opacity-only Reanimated entry to its content using `motion.duration.enter`; omit the entry animation when `motion.enabled` is false.

The Energy block establishes the composition used for each rating question without altering its visible text:

```tsx
<CheckInFieldBlock
  label="Energy"
  complete={form.energyLevel !== null}
  error={errors.energyLevel}
  testID="checkin-field-energy"
>
  <CheckInRatingScale
    label="Energy out of 10"
    value={form.energyLevel}
    onChange={(value) => set('energyLevel', value)}
    accessibilityMode="options"
    optionTestIDPrefix="checkin-energy-rating"
  />
</CheckInFieldBlock>
```

Do not edit `FormState`, `EMPTY_FORM`, `fromRow`, `prefillFrom`, or `toPayload` except imports required by the presentation refactor.

- [ ] **Step 5: Group the unchanged confirmation summary**

Replace the single summary list with four `CheckInSummarySection` instances:

```ts
const summarySections = [
  { title: 'Readiness and energy', rows: [weight, energy, stress] },
  { title: 'Sleep and recovery', rows: [sleep, hunger, digestion] },
  { title: 'Nutrition and adherence', rows: [workout, conditionalPerformance, nutrition, calories, water, steps, protein, carbs, fats] },
  { title: 'Coach note', rows: [['Notes', form.notes.trim() || 'Not recorded']] },
];
```

Build the row tuples with the same labels and formatting strings currently rendered. Omit only the performance row when `requiresWorkoutPerformance` is false, exactly as today.

- [ ] **Step 6: Run form, validation, and payload tests**

```bash
npx jest \
  src/components/checkin/CheckInForm.test.tsx \
  src/lib/checkin-validation.test.ts \
  --runInBand
```

Expected: PASS. All question/value assertions, conditional performance behavior, exact payload, and validation suites remain green.

- [ ] **Step 7: Commit the form composition**

```bash
git add -- mobile/src/components/checkin/CheckInForm.tsx \
  mobile/src/components/checkin/CheckInForm.test.tsx
git commit -m "feat(mobile): polish daily check-in questions"
```

---

### Task 5: Integrate stage framing and bounded motion into the route screen

**Files:**
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`
- Modify: `mobile/src/screens/__tests__/tabs/check-in.test.tsx`

**Interfaces:**
- Consumes: `CheckInStageHeader`, `CHECK_IN_STAGE_META`, current screen orchestration, and `useMotion`.
- Produces: unchanged route behavior with deterministic framing and reduced-motion-aware stage entry.

- [ ] **Step 1: Extend the relocated screen test with failing header assertions**

Mock `CheckInStageHeader` as a view that records these props:

```tsx
CheckInStageHeader: (props: {
  step: string;
  stepIndex: number;
  totalSteps: number;
  date: string;
}) => <MockView testID="checkin-stage-header" {...props} />,
```

After the restored draft loads, assert:

```ts
expect(renderer.root.findByProps({ testID: 'checkin-stage-header' }).props).toMatchObject({
  step: 'finish',
  stepIndex: 3,
  totalSteps: 4,
  date: '2026-08-30',
});
```

After invalid submission returns to readiness, assert `step: 'readiness'` and `stepIndex: 0`. Retain all existing validation, focus-after-layout, and unrelated-error preservation assertions.

- [ ] **Step 2: Add reduced-motion entry assertions**

Mock Reanimated `View` so it exposes the `entering` prop. With `useMotion().enabled` false, assert the stage content has no entering animation. Add one enabled-motion render where the mock motion duration is 200 and assert an entering transition is supplied. Do not assert Reanimated internals; assert only presence versus absence.

- [ ] **Step 3: Run the route suite to verify it fails**

```bash
npx jest src/screens/__tests__/tabs/check-in.test.tsx --runInBand
```

Expected: FAIL because the route does not render `CheckInStageHeader` or the bounded animated wrapper.

- [ ] **Step 4: Integrate the stage header**

In `check-in.tsx`:

- Replace the local `CHECK_IN_STEPS` array with ordered keys:

```ts
const CHECK_IN_STEPS: CheckInStep[] = ['readiness', 'recovery', 'adherence', 'finish'];
```

- Update every former `.key`/`.title` access to the key-based model:

```ts
const activeStep = CHECK_IN_STEPS[stepIndex];

if (step) setStepIndex(CHECK_IN_STEPS.findIndex((candidate) => candidate === step));

const nextErrors = validateCheckInStep(activeStep, form);

AccessibilityInfo.announceForAccessibility(
  `Step ${bounded + 1} of ${CHECK_IN_STEPS.length}: ${CHECK_IN_STAGE_META[CHECK_IN_STEPS[bounded]].title}`,
);
```

- Pass `step={activeStep}` to `CheckInForm` and `CheckInStageHeader`.
- Preserve the existing top title (`How was today?` or the selected date), streak text, error summary, previous-measurement shortcut, and draft status.
- Replace the duplicated progress/title/description block with:

```tsx
<CheckInStageHeader
  step={activeStep}
  stepIndex={stepIndex}
  totalSteps={CHECK_IN_STEPS.length}
  date={targetDate}
/>
```

- Keep the shared `Screen archetype="root"` so top position remains safe-area inset plus base spacing.
- Remove the duplicate `Step n of 4` text from the sticky action status because the header now owns persistent progress. Keep the existing draft `StatusPill` in the action bar when `draftStatus` is present.

- [ ] **Step 5: Add bounded stage-entry motion**

Import `Animated` and `FadeIn` from Reanimated. Wrap only `CheckInForm`:

```tsx
<Animated.View
  key={activeStep}
  entering={motion.enabled ? FadeIn.duration(motion.duration.enter) : undefined}
>
  <CheckInForm
    form={form}
    setForm={updateForm}
    previous={previous}
    step={activeStep}
    errors={errors}
  />
</Animated.View>
```

Do not add slide travel, automatic step advancement, swipe navigation, or layout transitions. Keep `scrollTo({ y: 0, animated: motion.enabled })`, announcements, validation routing, and sticky-action behavior unchanged.

- [ ] **Step 6: Run screen, form, draft, and validation suites**

```bash
npx jest \
  src/screens/__tests__/tabs/check-in.test.tsx \
  src/components/checkin/CheckInForm.test.tsx \
  src/components/checkin/CheckInRatingScale.test.tsx \
  src/components/checkin/CheckInStageHeader.test.tsx \
  src/hooks/useCheckInDraft.test.ts \
  src/lib/checkin-validation.test.ts \
  --runInBand
```

Expected: all suites PASS.

- [ ] **Step 7: Commit the route integration**

```bash
git add -- 'mobile/app/(app)/(tabs)/check-in.tsx' \
  mobile/src/screens/__tests__/tabs/check-in.test.tsx
git commit -m "feat(mobile): make daily check-in more interactive"
```

---

### Task 6: Run the production verification gate

**Files:**
- Verify: all files changed by Tasks 1–5

**Interfaces:**
- Consumes: both implementation plans' committed output.
- Produces: evidence that route hygiene, questionnaire compatibility, accessibility contracts, types, lint, tests, and production bundling remain valid.

- [ ] **Step 1: Confirm the route boundary and frozen questionnaire source**

Run from the repository root:

```bash
rg --files mobile/app | rg '\.(test|spec)\.[jt]sx?$'
git diff fe202a8..HEAD -- mobile/src/lib/checkin-validation.ts mobile/src/hooks/useCheckInMutation.ts
```

Expected: the first command returns no paths. The second command is empty because validation and mutation contracts were not changed.

- [ ] **Step 2: Run all mobile verification commands**

Run from `mobile/`:

```bash
npm run verify
```

Expected: TypeScript, ESLint, every Jest suite, and UI contracts PASS.

- [ ] **Step 3: Produce a clean iOS export**

```bash
CHECKIN_EXPORT_DIR="$(mktemp -d /tmp/dawnage-checkin-export.XXXXXX)"
CI=1 npx expo export --platform ios --output-dir "$CHECKIN_EXPORT_DIR"
```

Expected: bundling completes without treating any test as a route, without missing-default-export warnings for test files, and without a runtime `jest` reference.

- [ ] **Step 4: Inspect the final diff and repository state**

```bash
git diff --check fe202a8..HEAD
git status --short
git log --oneline --decorate -8
```

Expected: no whitespace errors, no uncommitted implementation files, and separate commits for route hygiene, presentation primitives, rating control, form composition, and screen integration.

- [ ] **Step 5: Record device-only evidence without overstating it**

On a simulator or physical iPhone, verify:

1. A compact viewport shows each 1–10 scale as two rows of five with no clipping.
2. A notched/Dynamic Island device keeps the title below the safe area.
3. Large text wraps labels and keeps all controls usable.
4. Reduce Motion removes selection scale and stage fades.
5. VoiceOver announces each question and exact selected number.
6. Completing, editing, retrying, and restoring a draft preserve every value.

If no device is available to the implementation session, report these six checks as outstanding release evidence rather than claiming them complete. Expo Go notification warnings remain expected; use a development build for remote notification testing.
