import { fireEvent, render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';

import { Button } from './Button.ios';

jest.mock('@expo/ui/swift-ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
  Button: ({ children, label, onPress, testID, modifiers }: any) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={`native-${testID ?? 'button'}`}
      nativeModifiers={modifiers}
    >
      {children ?? <Text>{label}</Text>}
    </Pressable>
  ),
  Host: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  HStack: ({ children }: any) => <View>{children}</View>,
  ProgressView: () => <View accessibilityLabel="Loading" />,
  Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  accessibilityHint: (value: string) => ({ name: 'accessibilityHint', value }),
  accessibilityIdentifier: (value: string) => ({ name: 'accessibilityIdentifier', value }),
  accessibilityLabel: (value: string) => ({ name: 'accessibilityLabel', value }),
  accessibilityValue: (value: string) => ({ name: 'accessibilityValue', value }),
  buttonBorderShape: (value: string) => ({ name: 'buttonBorderShape', value }),
  buttonStyle: (value: string) => ({ name: 'buttonStyle', value }),
  controlSize: (value: string) => ({ name: 'controlSize', value }),
  disabled: (value: boolean) => ({ name: 'disabled', value }),
  frame: (value: object) => ({ name: 'frame', value }),
  tint: (value: string) => ({ name: 'tint', value }),
}));

jest.mock('expo-glass-effect', () => ({
  isGlassEffectAPIAvailable: () => true,
  isLiquidGlassAvailable: () => true,
}));

jest.mock('@/hooks/useReducedTransparency', () => ({ useReducedTransparency: () => false }));

jest.mock('react-native-reanimated', () => {
  const { Pressable: NativePressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { createAnimatedComponent: () => NativePressable },
    useAnimatedStyle: () => ({}),
    useSharedValue: (value: number) => ({ get: () => value, set: (next: number) => { value = next; } }),
    withSpring: (value: number) => value,
    cancelAnimation: jest.fn(),
  };
});

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { button: 14, pill: 999 },
  spacing: { sm: 8, md: 12, lg: 24 },
  useMotion: () => ({ enabled: false, pressScale: 1, spring: { press: {} } }),
  useTheme: () => ({
    colors: {
      borderStrong: '#777777', destructive: '#aa0000', onPrimary: '#ffffff',
      primary: '#bb3300', primaryFill: '#cc3300', primaryPressed: '#a02b20', pressed: '#eeeeee',
    },
    isDark: false,
  }),
}));

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));

describe('iOS Button adapter', () => {
  it('maps a simple content action to a themed prominent native button', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button label="Continue with a deliberately long action label" onPress={onPress} testID="continue" />,
    );

    const button = view.getByTestId('native-continue');
    expect(button.props.nativeModifiers).toEqual(expect.arrayContaining([
      { name: 'buttonStyle', value: 'borderedProminent' },
      { name: 'buttonBorderShape', value: 'capsule' },
      { name: 'controlSize', value: 'large' },
      { name: 'tint', value: '#cc3300' },
      { name: 'accessibilityIdentifier', value: 'continue' },
    ]));
    expect(view.getByText('Continue with a deliberately long action label')).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the label and disables activation while busy', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Save changes" loading onPress={onPress} testID="save" />);
    const button = view.getByTestId('native-save');

    expect(view.getByText('Save changes')).toBeTruthy();
    expect(button.props.nativeModifiers).toEqual(expect.arrayContaining([
      { name: 'disabled', value: true },
      { name: 'accessibilityValue', value: 'In progress' },
    ]));
    expect(button.props.onPress).toBeUndefined();
  });

  it('uses glass prominence only for a capable floating action', async () => {
    const view = await render(<Button label="Quick add" context="floating" testID="quick-add" />);
    expect(view.getByTestId('native-quick-add').props.nativeModifiers).toEqual(expect.arrayContaining([
      { name: 'buttonStyle', value: 'glassProminent' },
    ]));
  });

  it('keeps regular secondary actions at the minimum native target size', async () => {
    const view = await render(<Button label="Review details" variant="secondary" testID="review" />);
    expect(view.getByTestId('native-review').props.nativeModifiers).toEqual(expect.arrayContaining([
      { name: 'frame', value: { minHeight: 44 } },
      { name: 'accessibilityLabel', value: 'Review details' },
    ]));
  });

  it('keeps custom React Native icon content on the fallback renderer', async () => {
    const view = await render(
      <Button label="Add measurement" icon={<RNText>custom icon</RNText>} testID="add" />,
    );

    expect(view.queryByTestId('native-add')).toBeNull();
    expect(view.getByText('custom icon')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Add measurement' })).toBeTruthy();
  });
});
