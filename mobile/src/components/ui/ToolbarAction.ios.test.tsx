import { fireEvent, render } from '@testing-library/react-native';
import { ToolbarAction } from './ToolbarAction.ios';

jest.mock('@expo/ui/swift-ui', () => {
  const { Pressable: NativePressable, Text, View } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress, testID, systemImage, modifiers }: any) => (
      <NativePressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID}
        systemImage={systemImage} nativeModifiers={modifiers}><Text>{label}</Text></NativePressable>
    ),
    Host: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  accessibilityHint: (value: string) => ({ name: 'accessibilityHint', value }),
  accessibilityIdentifier: (value: string) => ({ name: 'accessibilityIdentifier', value }),
  accessibilityLabel: (value: string) => ({ name: 'accessibilityLabel', value }),
  buttonStyle: (value: string) => ({ name: 'buttonStyle', value }),
  controlSize: (value: string) => ({ name: 'controlSize', value }),
  disabled: (value: boolean) => ({ name: 'disabled', value }),
  frame: (value: object) => ({ name: 'frame', value }),
  labelStyle: (value: string) => ({ name: 'labelStyle', value }),
  tint: (value: string) => ({ name: 'tint', value }),
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, md: 20 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({
    colors: { destructive: '#aa0000', mutedForeground: '#666666', primary: '#bb3300', pressed: '#eeeeee' },
    isDark: false,
  }),
}));

describe('iOS ToolbarAction adapter', () => {
  it('maps the semantic action to an icon-only native button', async () => {
    const onPress = jest.fn();
    const view = await render(<ToolbarAction label="Close" symbol="close" onPress={onPress} testID="close-action" />);
    const action = view.getByTestId('close-action');

    expect(action.props.systemImage).toBe('xmark');
    expect(action.props.nativeModifiers).toEqual(expect.arrayContaining([
      { name: 'buttonStyle', value: 'plain' },
      { name: 'labelStyle', value: 'iconOnly' },
      { name: 'accessibilityLabel', value: 'Close' },
      { name: 'frame', value: { width: 44, height: 44 } },
    ]));
    fireEvent.press(action);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
