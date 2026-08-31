import { Pressable } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInForm, EMPTY_FORM, toPayload, type CheckInStep, type FormState } from './CheckInForm';

const mockMotion = {
  enabled: true,
  duration: { feedback: 160, enter: 200, micro: 120 },
  easing: { standard: [0.16, 1, 0.3, 1] as const },
  pressScale: 0.97,
};
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
    withTiming: jest.fn((value: number) => value),
  };
});
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isWide: false }),
}));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui/Card'),
  ...jest.requireActual('@/components/ui/Input'),
  ...jest.requireActual('@/components/ui/RatingRow'),
  ...jest.requireActual('@/components/ui/SegmentedControl'),
  ...jest.requireActual('@/components/ui/Stepper'),
  ...jest.requireActual('@/components/ui/Text'),
}));
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

describe('CheckInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotion.enabled = true;
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
