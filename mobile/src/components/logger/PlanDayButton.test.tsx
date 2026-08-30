// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { PlanDayButton } from './PlanDayButton';

jest.mock('@/components/ui', () => {
  const { Text } = jest.requireActual('react-native');
  return { Text };
});

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { pill: 999 },
  spacing: { base: 16 },
  useTheme: () => ({
    colors: {
      borderStrong: '#aaaaaa',
      primary: '#0000ff',
      primaryFill: '#eeeeff',
    },
  }),
}));

describe('PlanDayButton', () => {
  it('keeps each compact logger day at least 44pt tall and exposes selected tab state', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <PlanDayButton
          dayNumber={2}
          focus="Lower body"
          active
          onPress={jest.fn()}
        />,
      );
    });

    const control = renderer.root.findByProps({
      accessibilityLabel: 'Day 2, Lower body',
    });
    expect(control.props.accessibilityRole).toBe('tab');
    expect(control.props.accessibilityState).toEqual({ selected: true });
    expect(control.props.style).toMatchObject({ minHeight: 44 });
  });
});
