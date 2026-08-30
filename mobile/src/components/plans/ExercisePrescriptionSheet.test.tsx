import { StyleSheet, Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { PlanExercise } from '@/hooks/usePlans';
import { ExercisePrescriptionSheet } from './ExercisePrescriptionSheet';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => undefined) }));
jest.mock('lucide-react-native', () => ({ Play: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Sheet: ({ visible, title, children }: { visible: boolean; title: string; children: React.ReactNode }) =>
      visible ? (
        <native.View accessibilityLabel={`Sheet: ${title}`}>
          <native.Text>{title}</native.Text>
          {children}
        </native.View>
      ) : null,
    SheetScrollView: native.View,
    Text: native.Text,
  };
});
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { sm: 8 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      foreground: '#111',
      mutedForeground: '#666',
      primary: '#05f',
    },
  }),
}));

const prescription: PlanExercise = {
  id: 'row',
  name: 'Seated row',
  sets: 4,
  reps: '8–10',
  restSeconds: 90,
  warmupSets: 1,
  notes: 'Pause at the torso.',
  videoLink: 'https://example.com/row',
  substitutions: [
    {
      id: 'chest-row',
      name: 'Chest-supported row',
      sets: 3,
      reps: '10',
      warmupSets: 0,
      substitutions: [],
    },
  ],
};

function renderSheet(
  exercise: PlanExercise,
  onSubstitute?: (exercise: PlanExercise) => void,
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <ExercisePrescriptionSheet
        visible
        exercise={exercise}
        onClose={jest.fn()}
        onSubstitute={onSubstitute}
      />,
    );
  });
  const text = () =>
    renderer.root
      .findAllByType(NativeText)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children)
      .filter((value: unknown): value is string | number =>
        typeof value === 'string' || typeof value === 'number',
      )
      .join(' ');
  return { renderer, text };
}

describe('ExercisePrescriptionSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows every available prescription field and opens the supplied video', () => {
    const { renderer, text } = renderSheet(prescription);

    expect(text()).toContain('Seated row');
    expect(text()).toContain('3 work sets');
    expect(text()).toContain('1 warm-up set');
    expect(text()).toContain('8–10 reps');
    expect(text()).toContain('90 sec rest');
    expect(text()).toContain('Pause at the torso.');
    expect(text()).toContain('Alternatives');
    expect(text()).toContain('Chest-supported row');
    expect(
      renderer.root.findAll(
        (node: { props: Record<string, unknown> }) =>
          node.props.accessibilityLabel === 'Use Chest-supported row',
      ),
    ).toHaveLength(0);

    const video = renderer.root.findByProps({ accessibilityLabel: 'Watch demo for Seated row' });
    act(() => video.props.onPress());
    expect(jest.requireMock('expo-web-browser').openBrowserAsync).toHaveBeenCalledWith(
      'https://example.com/row',
    );
  });

  it('shows duration instead of repetitions when duration is the supplied target', () => {
    const { text } = renderSheet({
      ...prescription,
      reps: '',
      duration: '45 sec',
      substitutions: [],
    });

    expect(text()).toContain('45 sec');
    expect(text()).not.toContain('reps');
    expect(text()).not.toContain('Alternatives');
  });

  it('offers a 44 point substitution action only when a handler is supplied', () => {
    const onSubstitute = jest.fn();
    const { renderer } = renderSheet(prescription, onSubstitute);
    const action = renderer.root.findByProps({ accessibilityLabel: 'Use Chest-supported row' });

    expect(StyleSheet.flatten(action.props.style)).toMatchObject({ minHeight: 44 });
    act(() => action.props.onPress());
    expect(onSubstitute).toHaveBeenCalledWith(prescription.substitutions[0]);
  });
});
