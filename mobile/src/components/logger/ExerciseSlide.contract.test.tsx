import { StyleSheet } from 'react-native';

import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { WorkoutSet } from '@/features/workout/workoutReducer';
import { ExerciseSlide } from './ExerciseSlide';

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Check: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
  ChevronUp: () => null,
  Copy: () => null,
  Minus: () => null,
  Play: () => null,
  Plus: () => null,
  RotateCcw: () => null,
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
    const detailsStyle = typeof details.props.style === 'function'
      ? details.props.style({ pressed: false })
      : details.props.style;
    expect(StyleSheet.flatten(detailsStyle).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('marks the first incomplete stable set current and forwards its toggle', () => {
    mockResponsiveLayout({ isCompact: true });
    const onToggleSet = jest.fn();
    let renderer!: ReturnType<typeof create>;
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

    const [currentEditor] = renderer.root.findAll(
      (node: { props: Record<string, unknown> }) => node.props.testID === 'current-set-editor',
    );
    const [complete] = renderer.root.findAll(
      (node: { props: Record<string, unknown> }) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Complete set',
    );

    expect(currentEditor).toBeTruthy();
    expect(complete).toBeTruthy();
    act(() => complete.props.onPress());
    expect(onToggleSet).toHaveBeenCalledWith('squat-set-2');
  });
});
