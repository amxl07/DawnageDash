import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { WorkoutSet } from '@/features/workout/workoutReducer';
import { ExerciseSlide } from './ExerciseSlide';
import { SetEditor } from './SetEditor';

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Minus: () => null,
  Play: () => null,
  Plus: () => null,
  Trash2: () => null,
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, md: 20 },
  radius: { sm: 8, md: 12 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  tabularNums: { fontVariant: ['tabular-nums'] },
  type: {
    body: { fontSize: 16, lineHeight: 24 },
    bodySm: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16 },
  },
  useMotion: () => ({
    enabled: false,
    reduced: true,
    duration: { feedback: 0 },
    easing: { standard: [0.16, 1, 0.3, 1] },
  }),
  useTheme: () => ({
    shadow: { card: {}, sheet: {} },
    colors: {
      card: '#fff',
      elevated: '#fafafa',
      foreground: '#111',
      mutedForeground: '#666',
      primary: '#c00',
      primaryFill: '#d00',
      onPrimary: '#fff',
      success: '#080',
      destructive: '#c00',
      border: '#ddd',
      borderStrong: '#888',
    },
  }),
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

function mockResponsiveLayout({ isCompact }: { isCompact: boolean }) {
  mockedUseResponsiveLayout.mockReturnValue({
    width: isCompact ? 320 : 768,
    height: 800,
    fontScale: 1,
    mode: isCompact ? 'compact' : 'regular',
    isCompact,
    isWide: false,
    horizontal: 16,
    maxContentWidth: undefined,
  });
}

const incompleteSet: WorkoutSet = {
  id: 'squat-set-1',
  weight: '',
  reps: '',
  rpe: '',
  duration: '',
  kind: 'work',
  completed: false,
};

function renderSetEditor(
  overrides: Partial<React.ComponentProps<typeof SetEditor>> = {},
) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <SetEditor
        index={0}
        set={incompleteSet}
        previous={undefined}
        targetReps="8–10"
        isCurrent
        canRemove
        onUpdate={jest.fn()}
        onToggle={jest.fn()}
        onRemove={jest.fn()}
        {...overrides}
      />,
    );
  });

  const findOne = (predicate: (node: { props: Record<string, unknown> }) => boolean) => {
    const [node] = renderer.root.findAll(predicate);
    if (!node) throw new Error('Expected rendered node was not found');
    return node;
  };

  return {
    getByLabelText: (label: string) => findOne((node) => node.props.accessibilityLabel === label),
    getByRole: (role: string, name: string) =>
      findOne(
        (node) => node.props.accessibilityRole === role && node.props.accessibilityLabel === name,
      ),
    getByTestId: (testID: string) => findOne((node) => node.props.testID === testID),
    queryByTestId: (testID: string) => {
      const [node] = renderer.root.findAll(
        (candidate: { props: Record<string, unknown> }) => candidate.props.testID === testID,
      );
      return node ?? null;
    },
    setAvailableWidth: (width: number) => {
      act(() => {
        findOne((node) => node.props.testID === 'set-editor-container').props.onLayout({
          nativeEvent: { layout: { width } },
        });
      });
    },
    getByText: (value: string) =>
      findOne((node) =>
        Array.isArray(node.props.children)
          ? node.props.children.join('') === value
          : node.props.children === value,
      ),
    queryByText: (value: string) => {
      const [node] = renderer.root.findAll((candidate: { props: Record<string, unknown> }) =>
        Array.isArray(candidate.props.children)
          ? candidate.props.children.join('') === value
          : candidate.props.children === value,
      );
      return node ?? null;
    },
  };
}

describe('SetEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResponsiveLayout({ isCompact: false });
  });

  it('renders stacked labeled controls in compact mode', () => {
    mockResponsiveLayout({ isCompact: true });
    const { getByLabelText, getByRole, getByTestId } = renderSetEditor();

    expect(getByTestId('set-editor-fields').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })]),
    );
    expect(getByLabelText('Set 1 weight in kilograms')).toBeTruthy();
    expect(getByLabelText('Set 1 repetitions')).toBeTruthy();
    expect(getByLabelText('Set 1 RPE')).toBeTruthy();
    expect(getByRole('checkbox', 'Mark set 1 complete')).toBeTruthy();
  });

  it('defaults safely to stacked controls before container measurement', () => {
    const { getByTestId, queryByTestId } = renderSetEditor();

    expect(getByTestId('set-editor-fields').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })]),
    );
    expect(queryByTestId('set-editor')).toBeNull();
  });

  it('keeps a common-phone measured width stacked even in regular responsive mode', () => {
    const { getByLabelText, getByTestId, queryByTestId, setAvailableWidth } = renderSetEditor();

    setAvailableWidth(390);

    expect(getByTestId('set-editor-fields').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })]),
    );
    expect(queryByTestId('set-editor')).toBeNull();
    expect(getByLabelText('Set 1 weight in kilograms')).toBeTruthy();
    expect(getByLabelText('Set 1 repetitions')).toBeTruthy();
  });

  it('keeps a near-boundary container stacked until every inline control fits', () => {
    const { getByTestId, queryByTestId, setAvailableWidth } = renderSetEditor();

    setAvailableWidth(430);

    expect(queryByTestId('set-editor')).toBeNull();
    expect(getByTestId('set-editor-fields').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })]),
    );
  });

  it('uses an inline row after measuring sufficient available width', () => {
    const { getByTestId, setAvailableWidth } = renderSetEditor();

    setAvailableWidth(600);

    expect(getByTestId('set-editor').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'row' })]),
    );
  });

  it('returns to stacked controls when a wide container resizes narrow', () => {
    const { getByTestId, queryByTestId, setAvailableWidth } = renderSetEditor();

    setAvailableWidth(600);
    expect(getByTestId('set-editor')).toBeTruthy();

    setAvailableWidth(390);
    expect(queryByTestId('set-editor')).toBeNull();
    expect(getByTestId('set-editor-fields').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })]),
    );
  });

  it('shows previous performance and the current set as text, not color alone', () => {
    const { getByText } = renderSetEditor({
      previous: { weight: '60', reps: '8', rpe: '7' },
    });

    expect(getByText('Current set')).toBeTruthy();
    expect(getByText('Last: 60 kg × 8 @ 7')).toBeTruthy();
  });

  it('exposes checked state and readable state text for a completed set', () => {
    const { getByRole, getByText, queryByText } = renderSetEditor({
      set: { ...incompleteSet, completed: true },
      isCurrent: false,
    });

    expect(getByRole('checkbox', 'Mark set 1 incomplete').props.accessibilityState).toEqual({
      checked: true,
    });
    expect(getByText('Completed')).toBeTruthy();
    expect(queryByText('Current set')).toBeNull();
  });

  it('routes edits and actions with 44 point minimum targets', () => {
    const onUpdate = jest.fn();
    const onToggle = jest.fn();
    const onRemove = jest.fn();
    const { getByLabelText, getByRole } = renderSetEditor({ onUpdate, onToggle, onRemove });

    act(() => {
      getByLabelText('Set 1 weight in kilograms').props.onChangeText('62.5');
      getByLabelText('Set 1 repetitions').props.onChangeText('8');
      getByLabelText('Set 1 RPE').props.onChangeText('7');
      getByRole('checkbox', 'Mark set 1 complete').props.onPress();
      getByRole('button', 'Remove set 1').props.onPress();
    });

    expect(onUpdate).toHaveBeenNthCalledWith(1, 'weight', '62.5');
    expect(onUpdate).toHaveBeenNthCalledWith(2, 'reps', '8');
    expect(onUpdate).toHaveBeenNthCalledWith(3, 'rpe', '7');
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(getByRole('checkbox', 'Mark set 1 complete').props.style).toEqual(
      expect.objectContaining({ minWidth: 44, minHeight: 44 }),
    );
    expect(getByRole('button', 'Remove set 1').props.style).toEqual(
      expect.objectContaining({ minWidth: 44, minHeight: 44 }),
    );
  });

  it('keeps remove disabled when it is the only set', () => {
    const onRemove = jest.fn();
    const { getByRole } = renderSetEditor({ canRemove: false, onRemove });
    const remove = getByRole('button', 'Remove set 1');

    expect(remove.props.accessibilityState).toEqual({ disabled: true });
    expect(remove.props.onPress).toBeUndefined();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('renders one labeled duration input instead of weight and repetition inputs', () => {
    const onUpdate = jest.fn();
    const { getByLabelText, queryByText } = renderSetEditor({
      tracking: 'duration',
      targetDuration: '45 sec',
      onUpdate,
    });

    expect(queryByText('Weight (kg)')).toBeNull();
    expect(queryByText('Repetitions')).toBeNull();
    const duration = getByLabelText('Set 1 duration in seconds');
    expect(StyleSheet.flatten(duration.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => duration.props.onChangeText('42'));
    expect(onUpdate).toHaveBeenCalledWith('duration', '42');
    expect(queryByText('Target: 45 sec')).toBeTruthy();
  });

  it('labels warm-up sets distinctly from work sets', () => {
    const { getByRole, getByText } = renderSetEditor({
      set: { ...incompleteSet, kind: 'warmup' },
    });

    expect(getByText('Warm-up 1')).toBeTruthy();
    expect(getByRole('checkbox', 'Mark warm-up 1 complete')).toBeTruthy();
  });

  it('offers a 44 point plate-calculator action only for weight-repetition sets', () => {
    const onOpenPlateCalculator = jest.fn();
    const weightEditor = renderSetEditor({ onOpenPlateCalculator });
    const action = weightEditor.getByRole('button', 'Calculate plates for set 1');

    expect(StyleSheet.flatten(action.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => action.props.onPress());
    expect(onOpenPlateCalculator).toHaveBeenCalledTimes(1);

    const durationEditor = renderSetEditor({ tracking: 'duration', onOpenPlateCalculator });
    expect(durationEditor.queryByText('Plates')).toBeNull();
  });
});

describe('ExerciseSlide set completion', () => {
  it('exposes a visible 44 point Details action for a plan prescription', () => {
    mockResponsiveLayout({ isCompact: true });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ExerciseSlide
          exercise={{
            id: 'squat',
            name: 'Squat',
            tracking: 'weight-reps',
            sets: [incompleteSet],
          }}
          prescription={{
            id: 'squat',
            name: 'Squat',
            sets: 1,
            reps: '8',
            warmupSets: 0,
            substitutions: [],
          }}
          onUpdateSet={jest.fn()}
          onToggleSet={jest.fn()}
          onAddSet={jest.fn()}
          onRemoveSet={jest.fn()}
        />,
      );
    });

    const details = renderer.root.findByProps({
      accessibilityRole: 'button',
      accessibilityLabel: 'Show details for Squat',
    });
    expect(StyleSheet.flatten(details.props.style)).toMatchObject({ minHeight: 44 });
  });

  it('marks the first incomplete stable set current and forwards its toggle', () => {
    mockResponsiveLayout({ isCompact: true });
    const onToggleSet = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ExerciseSlide
          exercise={{
            id: 'squat',
            name: 'Squat',
            tracking: 'weight-reps',
            sets: [
              { ...incompleteSet, id: 'squat-set-1', completed: true },
              { ...incompleteSet, id: 'squat-set-2' },
            ],
          }}
          previous={[
            { weight: '60', reps: '8', rpe: '7' },
            { weight: '65', reps: '8', rpe: '8' },
          ]}
          onUpdateSet={jest.fn()}
          onToggleSet={onToggleSet}
          onAddSet={jest.fn()}
          onRemoveSet={jest.fn()}
        />,
      );
    });

    const [currentText] = renderer.root.findAll(
      (node: { props: { children?: unknown } }) => node.props.children === 'Current set',
    );
    const [previousTextNode] = renderer.root.findAll(
      (node: { props: { children?: unknown } }) => node.props.children === 'Last: 65 kg × 8 @ 8',
    );
    const [checkbox] = renderer.root.findAll(
      (node: { props: Record<string, unknown> }) =>
        node.props.accessibilityRole === 'checkbox' &&
        node.props.accessibilityLabel === 'Mark set 2 complete',
    );

    expect(currentText).toBeTruthy();
    expect(previousTextNode).toBeTruthy();
    expect(checkbox).toBeTruthy();
    act(() => checkbox.props.onPress());
    expect(onToggleSet).toHaveBeenCalledWith(1);
  });
});
