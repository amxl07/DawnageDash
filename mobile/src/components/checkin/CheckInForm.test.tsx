import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { CheckInHistory } from '@/features/checkin/history';
import { NumericCommitProvider } from '@/features/checkin/components/NumericCommitProvider';
import { NumericEntry } from '@/features/checkin/components/NumericEntry';
import { validateCheckIn, validateCheckInStep } from '@/lib/checkin-validation';
import type { DailyCheckIn } from '@/types/db';
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
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetTextInput: jest.requireActual('react-native').TextInput,
}));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual<typeof import('react-native')>('react-native');
  const react = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    cancelAnimation: jest.fn(),
    default: {
      View: native.View,
      createAnimatedComponent: (Component: typeof Pressable) => Component,
    },
    Easing: { bezier: jest.fn(() => 'standard-easing') },
    interpolateColor: (value: number, _range: number[], colors: string[]) => colors[value ? 1 : 0],
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
jest.mock('@/components/ui', () => {
  const { Pressable: TestPressable, Text: TestText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ...jest.requireActual('@/components/ui/Card'),
    ...jest.requireActual('@/components/ui/Input'),
    ...jest.requireActual('@/components/ui/RatingRow'),
    ...jest.requireActual('@/components/ui/SegmentedControl'),
    ...jest.requireActual('@/components/ui/Text'),
    Button: ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => (
      <TestPressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
        <TestText>{label}</TestText>
      </TestPressable>
    ),
  };
});

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
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
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
  options: {
    previous?: DailyCheckIn | null;
    history?: CheckInHistory;
    showCarryForward?: boolean;
    errors?: Partial<Record<keyof FormState, string>>;
    focusField?: keyof FormState;
    focusRequest?: number;
    onEditSection?: (step: CheckInStep) => void;
  } = {},
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <NumericCommitProvider>
        <CheckInForm
          form={form}
          setForm={setForm}
          previous={options.previous ?? null}
          step={step}
          errors={options.errors ?? {}}
          history={options.history}
          showCarryForward={options.showCarryForward}
          focusField={options.focusField}
          focusRequest={options.focusRequest}
          onEditSection={options.onEditSection}
        />
      </NumericCommitProvider>,
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

function visibleStrings(node: RenderedNode | string): string[] {
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
      && node.props.accessibilityLabel?.startsWith(`${label}, `) === true,
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
  const optionWidths = options.map((option) => (
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
    const recovery = renderForm('recovery');
    const stress = ratingOptions(recovery, 'Stress out of 10');

    expect(energy.map((option) => option.props.accessibilityLabel))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Energy out of 10, ${index + 1}${index === 0 ? ', Exhausted' : index === 9 ? ', Very energetic' : ''}`));
    expect(stress.map((option) => option.props.accessibilityLabel))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Stress out of 10, ${index + 1}${index === 0 ? ', Relaxed' : index === 9 ? ', Very stressed' : ''}`));
    expect(ratingOption(readiness, 'checkin-energy-rating-7').props.accessibilityState)
      .toEqual({ selected: true, checked: true });
    expect(ratingOption(recovery, 'checkin-stress-rating-3').props.accessibilityState)
      .toEqual({ selected: true, checked: true });
    expect(readiness.root.findByProps({ testID: 'checkin-field-energy-complete' })).toBeTruthy();
    expect(recovery.root.findByProps({ testID: 'checkin-field-stress-complete' })).toBeTruthy();
    expectTextOrder(readiness, ['Morning weight', 'Sleep', 'Energy']);
    expect(readiness.root.findAllByProps({ testID: 'checkin-field-stress' })).toHaveLength(0);
    expect(ratingOptions(recovery, 'Hunger out of 10')).toHaveLength(10);
    expect(recovery.root.findByProps({ testID: 'checkin-field-hunger-complete' })).toBeTruthy();
    expect(recovery.root.findByProps({ testID: 'checkin-field-digestion-complete' })).toBeTruthy();
    expectTextOrder(recovery, ['Stress', 'Hunger', 'Digestion']);
    expect(recovery.root.findAllByType(NumericEntry).some(({ props }) => props.label === 'Sleep')).toBe(false);

    const adherence = renderForm('adherence');
    expect(ratingOptions(adherence, 'Workout performance out of 10')).toHaveLength(10);
    expect(ratingOptions(adherence, 'Nutrition score out of 10')).toHaveLength(10);
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
    ]);
  });

  it('uses direct numeric inputs instead of rulers and gives sleep four explicit presets', () => {
    const readiness = renderForm('readiness', COMPLETE_FORM, () => {}, { focusField: 'morningWeight' });
    expect(readiness.root.findByProps({ accessibilityLabel: 'Morning weight' }).props.keyboardType).toBe('decimal-pad');
    expect(readiness.root.findAllByProps({ testID: 'checkin-ruler-weight' })).toHaveLength(0);

    let current = COMPLETE_FORM;
    const morning = renderForm('readiness', current, (updater) => { current = updater(current); });
    const sleep = morning.root.findAllByType(NumericEntry).find(({ props }) => props.label === 'Sleep');
    expect(sleep?.props.quickValues).toEqual([6, 7, 8, 9]);
    expect(morning.root.findAllByProps({ testID: 'checkin-ruler-sleep' })).toHaveLength(0);
    act(() => morning.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: '9 h' }).props.onPress());
    expect(current.sleepHours).toBe(9);

    const adherence = renderForm('adherence', COMPLETE_FORM, () => {}, { focusField: 'waterLiters' });
    expect(adherence.root.findByProps({ accessibilityLabel: 'Water' }).props.keyboardType).toBe('decimal-pad');
    const water = adherence.root.findAllByType(NumericEntry).find(({ props }) => props.label === 'Water');
    expect(water?.props.quickValues).toEqual([1, 1.5, 2, 2.5, 3]);
    expect(adherence.root.findAllByProps({ testID: 'checkin-ruler-water' })).toHaveLength(0);
  });

  it('requires each unanswered rating and serializes exact selections across the complete form', () => {
    let form: FormState = {
      ...COMPLETE_FORM,
      energyLevel: null, stressLevel: null, hungerLevel: null,
      workoutPerformance: null, nutritionScore: null,
    };
    for (const [step, field, prefix, value] of [
      ['readiness', 'energyLevel', 'checkin-energy-rating', 1],
      ['recovery', 'stressLevel', 'checkin-stress-rating', 10],
      ['recovery', 'hungerLevel', 'checkin-hunger-rating', 4],
      ['adherence', 'workoutPerformance', 'checkin-workout-performance-rating', 7],
      ['adherence', 'nutritionScore', 'checkin-nutrition-rating', 9],
    ] as const) {
      expect(validateCheckInStep(step, form)).toHaveProperty(field);
      const renderer = renderForm(step, form, (updater) => { form = updater(form); });
      expect(ratingOption(renderer, `${prefix}-${value}`).props.accessibilityState.checked).toBe(false);
      act(() => ratingOption(renderer, `${prefix}-${value}`).props.onPress());
      expect(form[field]).toBe(value);
      expect(validateCheckInStep(step, form)).not.toHaveProperty(field);
      act(() => renderer.unmount());
    }
    expect(validateCheckIn(form)).toEqual({ step: null, errors: {} });
    expect(toPayload(form, '2026-09-14')).toMatchObject({
      date: '2026-09-14', energy_level: 1, stress_level: 10, hunger_level: 4,
      workout_performance: 7, nutrition_score: 9,
    });
  });

  it('shows every required measurement immediately, including unanswered fields', () => {
    const readiness = renderForm('readiness', { ...COMPLETE_FORM, morningWeight: null });
    expect(readiness.root.findByProps({ accessibilityLabel: 'Morning weight' }).props.value).toBe('');
    const adherence = renderForm('adherence', {
      ...COMPLETE_FORM, calorieIntake: null, waterLiters: null, dailySteps: null,
      protein: null, carbs: null, fats: null,
    });
    for (const label of ['Calories', 'Water', 'Steps', 'Protein', 'Carbs', 'Fats']) {
      expect(adherence.root.findByProps({ accessibilityLabel: label }).props.value).toBe('');
    }
  });

  it('keeps an invalid measurement editable and reports its error on blur', () => {
    let current = COMPLETE_FORM;
    const renderer = renderForm('adherence', current, (update) => { current = update(current); });
    const calories = renderer.root.findByProps({ accessibilityLabel: 'Calories' });
    act(() => { calories.props.onFocus(); calories.props.onChangeText('bad'); });
    act(() => calories.props.onBlur());
    expect(renderer.root.findByProps({ accessibilityLabel: 'Calories' }).props.value).toBe('bad');
    expect(renderer.root.findByProps({ children: 'Enter a number or clear this field.' })).toBeTruthy();
    expect(current.calorieIntake).toBe(2200);
  });

  it('shows the required notes error beside the editable field', () => {
    const renderer = renderForm('finish', { ...COMPLETE_FORM, notes: '' }, () => {}, {
      errors: { notes: 'Add your notes.' },
    });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Notes' }).props.value).toBe('');
    expect(renderer.root.findByProps({ children: 'Add your notes.' })).toBeTruthy();
  });

  it('shows neutral history only after an answer and exposes per-field carry-forward', () => {
    const previous = {
      id: 'previous', user_id: 'user-1', date: '2026-08-29',
      morning_weight: 72.6, sleep_hours: 7.5, workout_status: 'done',
      workout_performance: 7, nutrition_score: 8, calorie_intake: 2100,
      water_liters: 2.75, daily_steps: 8500, protein: 150, carbs: 200, fats: 60,
      energy_level: 6, hunger_level: 5, stress_level: 4, digestion: 'none', notes: null,
    } satisfies DailyCheckIn;
    const history = {
      morningWeight: {
        points: [], min14: 71.9, max14: 73.4, lastValue: 72.6, count: 8,
      },
    } satisfies CheckInHistory;

    const answered = renderForm('readiness', COMPLETE_FORM, () => {}, {
      previous, history, showCarryForward: true, focusField: 'morningWeight',
    });
    expect(JSON.stringify(answered.toJSON())).not.toContain('Recent range 71.9');
    act(() => answered.root.findByProps({ accessibilityLabel: 'Recent history for Morning weight' }).props.onPress());
    expect(JSON.stringify(answered.toJSON())).toContain('Recent range 71.9');
    expect(answered.root.findByProps({
      accessibilityLabel: 'Use previous Morning weight value, 72.6 kg, from 2026-08-29',
    })).toBeTruthy();

    const unanswered = renderForm('readiness', { ...COMPLETE_FORM, morningWeight: null }, () => {}, {
      previous, history, showCarryForward: true, focusField: 'morningWeight',
    });
    expect(JSON.stringify(unanswered.toJSON())).not.toContain('Recent range');
  });

  it('uses direct keypad inputs for calories and steps', () => {
    const renderer = renderForm('adherence');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Calories' }).props.keyboardType)
      .toBe('number-pad');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Steps' }).props.keyboardType)
      .toBe('number-pad');
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

  it('keeps notes editable and groups every exact persisted value into accessible summaries', () => {
    const onEditSection = jest.fn();
    const renderer = renderForm('finish', COMPLETE_FORM, () => {}, { onEditSection });

    expect(renderer.root.findByProps({ accessibilityLabel: 'Notes' }).props.value)
      .toBe('Slept well');
    expectTextOrder(renderer, [
      'Morning',
      'Your day',
      'Nutrition and adherence',
      'Notes',
    ]);
    [
      'Weight: 74.2 kg',
      'Energy: 7/10',
      'Stress: 3/10',
      'Sleep: 8 h',
      'Hunger: 5/10',
      'Digestion: Normal',
      'Workout: Done',
      'Workout performance: 8/10',
      'Nutrition: 9/10',
      'Calories: 2200 kcal',
      'Water: 2.5 L',
      'Steps: 9000',
      'Protein: 160 g',
      'Carbs: 220 g',
      'Fats: 60 g',
    ].forEach((accessibilityLabel) => {
      expect(renderer.root.findByProps({ accessibilityLabel }).props.accessible).toBe(true);
    });
    for (const [label, step] of [
      ['Edit morning', 'readiness'],
      ['Edit your day', 'recovery'],
      ['Edit adherence', 'adherence'],
    ] as const) {
      const action = ratingOption(renderer, `checkin-edit-${step}`);
      expect(action.props.accessibilityLabel).toBe(label);
      act(() => action.props.onPress());
      expect(onEditSection).toHaveBeenLastCalledWith(step);
    }

    const restDay = renderForm('finish', { ...COMPLETE_FORM, workoutStatus: 'rest_day' });
    expect(restDay.root.findAllByProps({ accessibilityLabel: 'Workout performance: 8/10' }))
      .toHaveLength(0);
  });

  it('shows missing required measurements in restored review drafts and retains explicit zeros', () => {
    const incomplete = renderForm('finish', {
      ...COMPLETE_FORM,
      morningWeight: null,
      calorieIntake: null,
      waterLiters: null,
      dailySteps: null,
      protein: null,
      carbs: null,
      fats: null,
    });
    for (const label of ['Weight: Not recorded', 'Calories: Not recorded', 'Water: Not recorded', 'Steps: Not recorded', 'Protein: Not recorded', 'Carbs: Not recorded', 'Fats: Not recorded']) {
      expect(incomplete.root.findByProps({ accessibilityLabel: label })).toBeTruthy();
    }

    const recordedZero = renderForm('finish', {
      ...COMPLETE_FORM,
      calorieIntake: 0,
      waterLiters: 0,
      dailySteps: 0,
    });
    expect(recordedZero.root.findByProps({ accessibilityLabel: 'Calories: 0 kcal' })).toBeTruthy();
    expect(recordedZero.root.findByProps({ accessibilityLabel: 'Water: 0 L' })).toBeTruthy();
    expect(recordedZero.root.findByProps({ accessibilityLabel: 'Steps: 0' })).toBeTruthy();
  });
});
