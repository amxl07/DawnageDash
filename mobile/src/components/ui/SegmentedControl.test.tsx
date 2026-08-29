import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { SegmentedControl } from './SegmentedControl';

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8 },
  tabularNums: {},
  type: {
    bodySm: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16 },
  },
  useMotion: () => ({
    duration: { feedback: 160 },
    easing: { standard: [0.16, 1, 0.3, 1] },
    enabled: true,
    reduced: false,
  }),
  useTheme: () => ({
    colors: {
      primary: '#00a000',
      primaryFill: '#008000',
      onPrimary: '#ffffff',
      mutedForeground: '#777777',
      borderStrong: '#222222',
      elevated: '#eeeeee',
      foreground: '#111111',
      success: '#00ff00',
      gold: '#ffcc00',
    },
    isDark: false,
  }),
}));

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });

  return {
    root: renderer.root,
    getByRole: (role: string, name: string) => {
      const [node] = renderer.root.findAll(
        (candidate: { props: { accessibilityRole?: string; accessibilityLabel?: string } }) =>
          candidate.props.accessibilityRole === role && candidate.props.accessibilityLabel === name,
      );
      if (!node) throw new Error(`No ${role} named ${name}`);
      return node;
    },
  };
}

function press(node: { props: { onPress?: () => void } }) {
  act(() => {
    node.props.onPress?.();
  });
}

function resolvedStyle(node: { props: { style?: unknown } }) {
  const style = node.props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
}

describe('SegmentedControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports radio selection and changes value once', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <SegmentedControl
        label="Plan type"
        value="training"
        onChange={onChange}
        segments={[
          { value: 'training', label: 'Training' },
          { value: 'nutrition', label: 'Nutrition' },
        ]}
      />,
    );

    expect(getByRole('radio', 'Training').props.accessibilityState).toMatchObject({ selected: true });
    press(getByRole('radio', 'Nutrition'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('nutrition');
  });

  it('emits one selection haptic only when the value changes', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <SegmentedControl
        label="Plan type"
        value="training"
        onChange={onChange}
        segments={[
          { value: 'training', label: 'Training' },
          { value: 'nutrition', label: 'Nutrition' },
        ]}
      />,
    );

    press(getByRole('radio', 'Training'));
    press(getByRole('radio', 'Nutrition'));

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('nutrition');
  });

  it('uses direct selected surfaces and no traveling thumb when large options wrap', () => {
    const { root, getByRole } = render(
      <SegmentedControl
        label="Plan type"
        value="nutrition"
        large
        onChange={jest.fn()}
        segments={[
          { value: 'training', label: 'Training' },
          { value: 'nutrition', label: 'Nutrition' },
          { value: 'recovery', label: 'Recovery' },
          { value: 'mindset', label: 'Mindset' },
        ]}
      />,
    );

    expect(getByRole('radio', 'Nutrition').props.accessibilityState).toMatchObject({ selected: true });
    expect(resolvedStyle(getByRole('radio', 'Nutrition'))).toMatchObject({
      backgroundColor: '#008000',
      borderColor: '#00a000',
    });
    expect(root.findAll((node: { props: { pointerEvents?: string } }) => node.props.pointerEvents === 'none')).toHaveLength(0);
  });
});
