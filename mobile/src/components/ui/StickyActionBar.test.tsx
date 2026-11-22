import { StyleSheet } from 'react-native';

import { act, create } from 'react-test-renderer';

import { StickyActionBar } from './StickyActionBar';

jest.mock('expo-router/js-tabs', () => {
  const React = jest.requireActual('react');
  return { BottomTabBarHeightContext: React.createContext(0) };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/theme', () => ({
  spacing: { sm: 8, base: 16 },
  useTheme: () => ({ colors: { border: '#dddddd', card: '#ffffff' } }),
}));

jest.mock('./Button', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Button: ({ label }: { label: string }) => <Text>{label}</Text> };
});

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));

describe('StickyActionBar', () => {
  it('reports its occupied multiline height without imposing a fixed content height', () => {
    const onHeightChange = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <StickyActionBar
          status="A detailed error that wraps at large text sizes."
          primaryLabel="Save this daily record"
          secondaryLabel="Review all fields"
          onPrimary={jest.fn()}
          onSecondary={jest.fn()}
          onHeightChange={onHeightChange}
        />,
      );
    });

    const bar = renderer!.root.findByProps({ testID: 'sticky-action-bar' });
    expect(StyleSheet.flatten(bar.props.style).height).toBeUndefined();

    act(() => bar.props.onLayout({ nativeEvent: { layout: { height: 148 } } }));
    expect(onHeightChange).toHaveBeenCalledWith(148);
  });
});
