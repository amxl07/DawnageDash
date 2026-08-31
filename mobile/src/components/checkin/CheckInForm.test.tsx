import { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { CheckInForm, EMPTY_FORM, toPayload, type CheckInStep, type FormState } from './CheckInForm';

const mockMotion = {
  enabled: true,
  reduced: false,
  duration: { feedback: 160, enter: 200, micro: 120 },
  easing: { standard: [0.16, 1, 0.3, 1] as const },
  pressScale: 0.97,
};
const mockWithTiming = jest.fn((value: number, _config?: object) => value);
const pressableType = (Pressable as unknown as { type: unknown }).type;

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual<typeof import('react-native')>('react-native');
  const react = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: {
      View: native.View,
      createAnimatedComponent: (Component: typeof Pressable) => Component,
    },
    Easing: { bezier: jest.fn(() => 'standard-easing') },
    FadeIn: { duration: jest.fn((duration: number) => ({ type: 'fade-in', duration })) },
    FadeInDown: {
      duration: jest.fn((duration: number) => ({
        easing: (easing: string) => ({
          withInitialValues: (initialValues: object) => ({
            type: 'fade-in-down',
            duration,
            easing,
            initialValues,
          }),
        }),
      })),
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (initial: number) => {
      const shared = react.useRef<{ get: () => number; set: (value: number) => void } | null>(null);
      if (shared.current === null) {
        let current = initial;
        shared.current = {
          get: () => current,
          set: (value: number) => { current = value; },
        };
      }
      return shared.current;
    },
    withTiming: (...args: [number, object?]) => mockWithTiming(...args),
  };
});
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui/Card'),
  ...jest.requireActual('@/components/ui/Input'),
  ...jest.requireActual('@/components/ui/RatingRow'),
  ...jest.requireActual('@/components/ui/SegmentedControl'),
  ...jest.requireActual('@/components/ui/Stepper'),
  ...jest.requireActual('@/components/ui/Text'),
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

function setResponsiveLayout(width: number, fontScale: number) {
  const isCompact = width < 360 || fontScale >= 1.3;
  mockedUseResponsiveLayout.mockReturnValue({
    width,
    height: 800,
    fontScale,
    mode: isCompact ? 'compact' : 'regular',
    isCompact,
    isWide: false,
    horizontal: 16,
    maxContentWidth: undefined,
  });
}
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, md: 20 },
  radius: { md: 12, card: 20 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  tabularNums: {},
  type: {
    body: {},
    bodySm: {},
    h2: {},
    label: {},
  },
  useMotion: () => mockMotion,
  useTheme: () => ({
    colors: {
      border: '#222',
      borderStrong: '#444',
      card: '#111',
      destructive: '#f00',
      elevated: '#191919',
      focusRing: '#fff',
      foreground: '#eee',
      gold: '#a60',
      mutedForeground: '#888',
      onPrimary: '#fff',
      primary: '#f04e45',
      primaryFill: '#511b1b',
      success: '#080',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

const COMPLETE_FORM: FormState = {
  ...EMPTY_FORM,
  morningWeight: 74.2,
  energyLevel: 7,
  stressLevel: 3,
  sleepHours: 8,
  hungerLevel: 5,
  digestion: 'none',
  workoutStatus: 'done',
  workoutPerformance: 8,
  nutritionScore: 9,
  calorieIntake: 2200,
  waterLiters: 2.5,
  dailySteps: 9000,
  protein: 160,
  carbs: 220,
  fats: 60,
  notes: 'Slept well',
};

function renderForm(
  step: CheckInStep,
  form: FormState = COMPLETE_FORM,
  setForm: (updater: (prev: FormState) => FormState) => void = () => {},
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <CheckInForm
        form={form}
        setForm={setForm}
        previous={null}
        step={step}
        errors={{}}
      />,
    );
  });
  return renderer;
}

function StatefulForm({ initialForm }: { initialForm: FormState }) {
  const [form, setForm] = useState(initialForm);
  return (
    <CheckInForm
      form={form}
      setForm={setForm}
      previous={null}
      step="adherence"
      errors={{}}
    />
  );
}

type RenderedNode = ReturnType<ReturnType<typeof create>['toJSON']>;

function visibleStrings(node: RenderedNode): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(visibleStrings);
  return node.children?.flatMap(visibleStrings) ?? [];
}

function expectTextOrder(renderer: ReturnType<typeof create>, expected: string[]) {
  const text = visibleStrings(renderer.toJSON());
  let cursor = -1;
  expected.forEach((value) => {
    const index = text.indexOf(value, cursor + 1);
    expect(index).toBeGreaterThan(cursor);
    cursor = index;
  });
}

function ratingOptions(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAll(
    (node: { type: unknown; props: { accessibilityRole?: string; accessibilityLabel?: string } }) =>
      node.type === pressableType
      && node.props.accessibilityRole === 'radio'
      && node.props.accessibilityLabel?.startsWith(`${label}, `),
  );
}

function ratingOption(renderer: ReturnType<typeof create>, testID: string) {
  return renderer.root.find(
    (node: { type: unknown; props: { testID?: string } }) =>
      node.type === pressableType && node.props.testID === testID,
  );
}

function hostView(renderer: ReturnType<typeof create>, testID: string) {
  return renderer.root.find(
    (node: { type: unknown; props: { testID?: string } }) =>
      node.type === 'View' && node.props.testID === testID,
  );
}

function closestAncestorStyle(
  node: ReturnType<typeof hostView>,
  matches: (style: Record<string, unknown>) => boolean,
) {
  let current = node.parent;
  while (current) {
    const style = StyleSheet.flatten(current.props.style) as Record<string, unknown> | undefined;
    if (style && matches(style)) return style;
    current = current.parent;
  }
  throw new Error('No matching styled ancestor');
}

function compactRatingGeometry(width: number, fontScale: number) {
  setResponsiveLayout(width, fontScale);
  const renderer = renderForm('readiness');
  const field = hostView(renderer, 'checkin-field-energy');
  const fieldStyle = StyleSheet.flatten(field.props.style);
  const cardStyle = closestAncestorStyle(
    field,
    (style) => style.borderRadius === 20 && typeof style.padding === 'number',
  );
  const row = hostView(renderer, 'checkin-energy-rating-row-1');
  const rowStyle = StyleSheet.flatten(row.props.style);
  const options = ratingOptions(renderer, 'Energy out of 10').slice(0, 5);
  const optionWidths = options.map((option: { props: { style: unknown } }) => (
    StyleSheet.flatten(option.props.style as StyleProp<ViewStyle>).minWidth as number
  ));
  const horizontalPadding = (style: Record<string, number>) =>
    style.paddingHorizontal ?? style.padding ?? 0;
  const layout = mockedUseResponsiveLayout.mock.results.at(-1)?.value;

  return {
    availableWidth:
      layout.width
      - layout.horizontal * 2
      - horizontalPadding(cardStyle as Record<string, number>) * 2
      - horizontalPadding(fieldStyle as Record<string, number>) * 2,
    requiredWidth:
      optionWidths.reduce((total: number, optionWidth: number) => total + optionWidth, 0)
      + (rowStyle.gap as number) * 4,
    fieldHorizontalPadding: horizontalPadding(fieldStyle as Record<string, number>),
    rowGap: rowStyle.gap as number,
  };
}

describe('CheckInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotion.enabled = true;
    mockMotion.reduced = false;
    mockMotion.duration.enter = 200;
    setResponsiveLayout(390, 1);
  });

  it('serializes the complete questionnaire without changing its stored contract', () => {
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
  });

  it('renders the real rating controls with exact values, modes, selection, and question order', () => {
    const readiness = renderForm('readiness');
    const energy = ratingOptions(readiness, 'Energy out of 10');
    const stress = ratingOptions(readiness, 'Stress out of 10');

    expect(energy.map((option: { props: { accessibilityLabel: string } }) => option.props.accessibilityLabel))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Energy out of 10, ${index + 1}`));
    expect(stress.map((option: { props: { accessibilityLabel: string } }) => option.props.accessibilityLabel))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Stress out of 10, ${index + 1}`));
    expect(ratingOption(readiness, 'checkin-energy-rating-7').props.accessibilityState)
      .toEqual({ selected: true, checked: true });
    expect(ratingOption(readiness, 'checkin-stress-rating-3').props.accessibilityState)
      .toEqual({ selected: true, checked: true });
    expect(readiness.root.findByProps({ testID: 'checkin-field-energy-complete' })).toBeTruthy();
    expect(readiness.root.findByProps({ testID: 'checkin-field-stress-complete' })).toBeTruthy();
    expectTextOrder(readiness, ['Morning weight', 'Energy', 'Stress']);

    const recovery = renderForm('recovery');
    expect(recovery.root.findByProps({
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Hunger out of 10',
    }).props.accessibilityValue).toEqual({ min: 1, max: 10, now: 5 });
    expect(recovery.root.findByProps({ testID: 'checkin-field-hunger-complete' })).toBeTruthy();
    expect(recovery.root.findByProps({ testID: 'checkin-field-digestion-complete' })).toBeTruthy();
    expectTextOrder(recovery, ['Sleep', 'Hunger', 'Digestion']);

    const adherence = renderForm('adherence');
    expect(adherence.root.findByProps({
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Workout performance out of 10',
    }).props.accessibilityValue).toEqual({ min: 1, max: 10, now: 8 });
    expect(adherence.root.findByProps({
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Nutrition score out of 10',
    }).props.accessibilityValue).toEqual({ min: 1, max: 10, now: 9 });
    expect(adherence.root.findByProps({ testID: 'checkin-field-workout-complete' })).toBeTruthy();
    expect(adherence.root.findByProps({ testID: 'checkin-field-workout-performance-complete' })).toBeTruthy();
    expect(adherence.root.findByProps({ testID: 'checkin-field-nutrition-complete' })).toBeTruthy();
    expectTextOrder(adherence, [
      'Workout',
      'How did it go?',
      'Nutrition score',
      'Calories',
      'Water',
      'Steps',
      'More detail (optional)',
    ]);
  });

  it.each([
    ['recovery', 'Digestion'],
    ['adherence', 'Workout'],
  ] as const)('renders the %s prompt %s visibly exactly once', (step, prompt) => {
    const text = visibleStrings(renderForm(step).toJSON());

    expect(text.filter((value) => value === prompt)).toHaveLength(1);
  });

  it('fits five 44pt rating targets inside the actual 320pt nested content width', () => {
    const geometry = compactRatingGeometry(320, 1);

    expect(geometry.requiredWidth).toBeLessThanOrEqual(geometry.availableWidth);
  });

  it('uses the compact rating spacing at elevated font scale', () => {
    const narrow = compactRatingGeometry(320, 1);
    const largeText = compactRatingGeometry(390, 1.3);

    expect(largeText.fieldHorizontalPadding).toBe(4);
    expect(largeText.rowGap).toBe(4);
    expect(largeText.fieldHorizontalPadding).toBe(narrow.fieldHorizontalPadding);
    expect(largeText.rowGap).toBe(narrow.rowGap);
    expect(largeText.requiredWidth).toBeLessThanOrEqual(largeText.availableWidth);
  });

  it('clears performance when a workout becomes a rest day and normalizes its payload', () => {
    let current = COMPLETE_FORM;
    const renderer = renderForm('adherence', current, (updater) => { current = updater(current); });

    act(() => renderer.root.findByProps({
      accessibilityRole: 'radio',
      accessibilityLabel: 'Rest',
    }).props.onPress());

    expect(current.workoutStatus).toBe('rest_day');
    expect(current.workoutPerformance).toBeNull();
    expect(toPayload({ ...COMPLETE_FORM, workoutStatus: 'rest_day', workoutPerformance: 8 }, '2026-08-30').workout_performance)
      .toBeNull();
  });

  it('reveals workout performance with a bounded fade/translation when motion is enabled', () => {
    let animated!: ReturnType<typeof create>;
    act(() => {
      animated = create(
        <StatefulForm initialForm={{ ...COMPLETE_FORM, workoutStatus: 'rest_day' }} />,
      );
    });
    expect(animated.root.findAllByProps({ testID: 'checkin-workout-performance-reveal' }))
      .toHaveLength(0);

    act(() => animated.root.findByProps({
      accessibilityRole: 'radio',
      accessibilityLabel: 'Done',
    }).props.onPress());

    expect(animated.root.findByProps({
      testID: 'checkin-workout-performance-reveal',
    }).props.entering).toEqual({
      type: 'fade-in-down',
      duration: 200,
      easing: 'standard-easing',
      initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
    });
  });

  it('reveals workout performance without entry animation in reduced motion', () => {
    mockMotion.enabled = false;
    mockMotion.reduced = true;
    mockMotion.duration.enter = 0;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <StatefulForm initialForm={{ ...COMPLETE_FORM, workoutStatus: 'rest_day' }} />,
      );
    });

    act(() => renderer.root.findByProps({
      accessibilityRole: 'radio',
      accessibilityLabel: 'Done',
    }).props.onPress());

    expect(renderer.root.findByProps({
      testID: 'checkin-workout-performance-reveal',
    }).props.entering).toBeUndefined();
  });

  it('reveals optional macros with opacity entry only when motion is enabled', () => {
    const animated = renderForm('adherence');

    act(() => animated.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(animated.root.findByProps({ testID: 'checkin-macros-content' }).props.entering).toEqual({
      type: 'fade-in',
      duration: 200,
    });

    mockMotion.enabled = false;
    const reduced = renderForm('adherence');
    act(() => reduced.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(reduced.root.findByProps({ testID: 'checkin-macros-content' }).props.entering).toBeUndefined();
  });

  it('stacks optional macros on narrow screens', () => {
    setResponsiveLayout(320, 1);
    const renderer = renderForm('adherence');

    act(() => renderer.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'checkin-macros-content' }).props.style,
    ).flexDirection).toBe('column');
  });

  it('stacks optional macros at elevated font scale', () => {
    setResponsiveLayout(390, 1.3);
    const renderer = renderForm('adherence');

    act(() => renderer.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'checkin-macros-content' }).props.style,
    ).flexDirection).toBe('column');
  });

  it('keeps optional macros in a row outside compact mode', () => {
    setResponsiveLayout(390, 1);
    const renderer = renderForm('adherence');

    act(() => renderer.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'checkin-macros-content' }).props.style,
    ).flexDirection).toBe('row');
  });

  it('rotates the macro chevron with timing and changes instantly in reduced motion', () => {
    const animated = renderForm('adherence');
    mockWithTiming.mockClear();

    act(() => animated.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(mockWithTiming).toHaveBeenCalledWith(180, {
      duration: 200,
      easing: 'standard-easing',
    });
    expect(StyleSheet.flatten(
      animated.root.findByProps({ testID: 'checkin-macros-chevron' }).props.style,
    ).transform).toEqual([{ rotate: '180deg' }]);

    mockMotion.enabled = false;
    mockMotion.reduced = true;
    mockMotion.duration.enter = 0;
    const reduced = renderForm('adherence');
    mockWithTiming.mockClear();
    act(() => reduced.root.findByProps({ accessibilityLabel: 'More detail: macros' }).props.onPress());

    expect(mockWithTiming).not.toHaveBeenCalledWith(180, expect.anything());
    expect(StyleSheet.flatten(
      reduced.root.findByProps({ testID: 'checkin-macros-chevron' }).props.style,
    ).transform).toEqual([{ rotate: '180deg' }]);
  });

  it('keeps notes editable and groups every exact persisted value into accessible summaries', () => {
    const renderer = renderForm('finish');

    expect(renderer.root.findByProps({ accessibilityLabel: 'Notes (optional)' }).props.value)
      .toBe('Slept well');
    expectTextOrder(renderer, [
      'Notes (optional)',
      'Ready to save',
      'Readiness and energy',
      'Sleep and recovery',
      'Nutrition and adherence',
      'Coach note',
    ]);
    [
      'Weight: 74.2 kg',
      'Energy: 7/10',
      'Stress: 3/10',
      'Sleep: 8 h',
      'Hunger: 5/10',
      'Digestion: none',
      'Workout: done',
      'Workout performance: 8/10',
      'Nutrition: 9/10',
      'Calories: 2200 kcal',
      'Water: 2.5 L',
      'Steps: 9000',
      'Protein: 160 g',
      'Carbs: 220 g',
      'Fats: 60 g',
      'Notes: Slept well',
    ].forEach((accessibilityLabel) => {
      expect(renderer.root.findByProps({ accessibilityLabel }).props.accessible).toBe(true);
    });

    const restDay = renderForm('finish', { ...COMPLETE_FORM, workoutStatus: 'rest_day' });
    expect(restDay.root.findAllByProps({ accessibilityLabel: 'Workout performance: 8/10' }))
      .toHaveLength(0);
  });
});
