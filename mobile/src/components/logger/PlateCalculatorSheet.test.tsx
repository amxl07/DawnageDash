import { StyleSheet, Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { PlateCalculatorSheet } from './PlateCalculatorSheet';

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
  radius: { sm: 8 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  tabularNums: {},
  type: { body: { fontSize: 16 } },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      borderStrong: '#aaa',
      card: '#fff',
      foreground: '#111',
      mutedForeground: '#666',
      primary: '#05f',
      primaryFill: '#05f',
      onPrimary: '#fff',
      destructive: '#c00',
    },
  }),
}));

function renderSheet(initialTargetKg = '100', onUse = jest.fn()) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <PlateCalculatorSheet
        visible
        initialTargetKg={initialTargetKg}
        onClose={jest.fn()}
        onUse={onUse}
      />,
    );
  });
  const byLabel = (label: string) => renderer.root.findByProps({ accessibilityLabel: label });
  const text = () =>
    renderer.root
      .findAllByType(NativeText)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children)
      .filter((value: unknown): value is string | number =>
        typeof value === 'string' || typeof value === 'number',
      )
      .join(' ');
  return { renderer, byLabel, text, onUse };
}

describe('PlateCalculatorSheet', () => {
  it('defaults to a 20kg bar and announces an exact per-side result', () => {
    const { byLabel, text } = renderSheet();

    expect(byLabel('20 kilogram bar').props.accessibilityState).toEqual({ selected: true });
    expect(text()).toContain('Per side: 25 kg + 15 kg');
    expect(byLabel('Per side: 25 kg + 15 kg')).toBeTruthy();
  });

  it('offers 15kg and custom bars without applying the load', () => {
    const { byLabel, text, onUse } = renderSheet();

    act(() => byLabel('15 kilogram bar').props.onPress());
    expect(text()).toContain('Per side: 25 kg + 15 kg + 2.5 kg');

    act(() => byLabel('Custom bar').props.onPress());
    const customInput = byLabel('Custom bar weight in kilograms');
    act(() => customInput.props.onChangeText('10'));
    expect(text()).toContain('Per side: 25 kg + 20 kg');
    expect(onUse).not.toHaveBeenCalled();
  });

  it('updates the entered weight only from the explicit 44 point Use this load action', () => {
    const onUse = jest.fn();
    const { byLabel } = renderSheet('63', onUse);
    const target = byLabel('Target load in kilograms');

    act(() => target.props.onChangeText('100'));
    expect(onUse).not.toHaveBeenCalled();
    const use = byLabel('Use this load');
    expect(StyleSheet.flatten(use.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => use.props.onPress());
    expect(onUse).toHaveBeenCalledWith('100');
  });

  it('shows validation instead of a calculation for an invalid target or bar', () => {
    const { byLabel, text, onUse } = renderSheet('not-a-number');

    expect(text()).toContain('Enter a finite nonnegative target load.');
    expect(byLabel('Use this load').props.accessibilityState).toEqual({ disabled: true });
    act(() => byLabel('Custom bar').props.onPress());
    act(() => byLabel('Custom bar weight in kilograms').props.onChangeText('-5'));
    expect(text()).toContain('Enter a finite nonnegative bar weight.');
    expect(onUse).not.toHaveBeenCalled();
  });

  it('keeps unsupported finite precision editable and disables applying it', () => {
    const { renderer, byLabel, text, onUse } = renderSheet('65.1000001');

    act(() => byLabel('Custom bar').props.onPress());
    act(() => byLabel('Custom bar weight in kilograms').props.onChangeText('20.1'));
    expect(byLabel('Target load in kilograms').props.value).toBe('65.1000001');
    expect(byLabel('Custom bar weight in kilograms').props.value).toBe('20.1');
    expect(text()).toContain('Use no more than 6 decimal places.');
    expect(renderer.root.findByProps({ accessibilityLiveRegion: 'polite' }).props.children).toBe(
      'Use no more than 6 decimal places.',
    );
    const use = byLabel('Use this load');
    expect(use.props.accessibilityState).toEqual({ disabled: true });
    expect(use.props.onPress).toBeUndefined();
    expect(onUse).not.toHaveBeenCalled();
  });
});
