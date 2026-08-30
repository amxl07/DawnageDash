import { Pressable, StyleSheet, View } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { RatingRow } from './RatingRow';

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { md: 12 },
  spacing: { sm: 8 },
  tabularNums: {},
  type: { body: {} },
  useTheme: () => ({
    colors: {
      borderStrong: '#aaa',
      elevated: '#fff',
      onPrimary: '#fff',
      primary: '#00f',
      primaryFill: '#00f',
    },
  }),
}));

describe('RatingRow', () => {
  const pressableType = (Pressable as unknown as { type: unknown }).type;

  it('keeps the default row as one adjustable accessibility element', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <RatingRow label="Hunger out of 10" min={1} max={10} value={5} onChange={jest.fn()} />,
      );
    });

    const group = renderer.root.findByType(View);
    expect(group.props).toMatchObject({
      accessible: true,
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Hunger out of 10',
      accessibilityValue: { min: 1, max: 10, now: 5 },
    });
    expect(
      renderer.root.findAll(
        (node: { type: unknown; props: { importantForAccessibility?: string } }) =>
          node.type === pressableType &&
          node.props.importantForAccessibility === 'no',
      ),
    ).toHaveLength(10);
  });

  it('exposes each option as the only accessible interactive node in option mode', () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <RatingRow
          label="Energy out of 10"
          min={1}
          max={10}
          value={4}
          onChange={onChange}
          accessibilityMode="options"
          optionTestIDPrefix="checkin-energy-rating"
        />,
      );
    });

    const group = renderer.root.findByType(View);
    expect(group.props.accessible).toBe(false);
    expect(group.props.accessibilityRole).toBeUndefined();

    const option = renderer.root.findByProps({ testID: 'checkin-energy-rating-5' });
    expect(option.type).toBe(pressableType);
    expect(option.props).toMatchObject({
      accessibilityRole: 'radio',
      accessibilityLabel: 'Energy out of 10, 5',
      accessibilityState: { selected: false, checked: false },
      accessibilityElementsHidden: false,
    });
    expect(StyleSheet.flatten(option.props.style)).toMatchObject({ minWidth: 44, minHeight: 44 });

    act(() => option.props.onPress());
    expect(onChange).toHaveBeenCalledWith(5);

    const selected = renderer.root.findByProps({ testID: 'checkin-energy-rating-4' });
    expect(selected.props.accessibilityState).toEqual({ selected: true, checked: true });
  });
});
