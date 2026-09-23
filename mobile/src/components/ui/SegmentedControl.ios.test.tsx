import * as Haptics from 'expo-haptics';
import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedControl } from './SegmentedControl.ios';

jest.mock('@expo/ui/swift-ui', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    Host: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Picker: ({ children, ...props }: any) => <View testID="native-segmented-picker" {...props}>{children}</View>,
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  accessibilityLabel: (value: string) => ({ name: 'accessibilityLabel', value }),
  controlSize: (value: string) => ({ name: 'controlSize', value }),
  frame: (value: object) => ({ name: 'frame', value }),
  pickerStyle: (value: string) => ({ name: 'pickerStyle', value }),
  tag: (value: string) => ({ name: 'tag', value }),
  tint: (value: string) => ({ name: 'tint', value }),
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8 },
  useMotion: () => ({ duration: { feedback: 160 }, easing: { standard: [0.16, 1, 0.3, 1] } }),
  useTheme: () => ({
    colors: {
      primary: '#00a000', primaryFill: '#008000', primarySoft: '#e8f5e8',
      primaryPressed: '#006000', pressed: '#e0e4e0', onPrimary: '#ffffff',
      mutedForeground: '#777777', borderStrong: '#222222',
    },
    isDark: false,
  }),
}));

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));
jest.mock('./AppSymbol', () => ({
  AppSymbol: () => {
    const { View } = jest.requireActual('react-native');
    return <View />;
  },
}));

describe('iOS SegmentedControl adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the native segmented picker and changes only to a different value', async () => {
    const onChange = jest.fn();
    const view = await render(
      <SegmentedControl
        label="Training view"
        showLabel={false}
        value="plan"
        onChange={onChange}
        segments={[
          { value: 'plan', label: 'Plan' },
          { value: 'history', label: 'History' },
        ]}
      />,
    );

    const picker = view.getByTestId('native-segmented-picker');
    expect(picker.props.selection).toBe('plan');
    expect(picker.props.label).toBe('Training view');
    expect(picker.props.modifiers).toEqual(expect.arrayContaining([
      { name: 'pickerStyle', value: 'segmented' },
      { name: 'controlSize', value: 'large' },
      { name: 'frame', value: { minHeight: 44 } },
      { name: 'accessibilityLabel', value: 'Training view' },
    ]));

    await fireEvent(picker, 'selectionChange', 'plan');
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent(picker, 'selectionChange', 'history');
    expect(onChange).toHaveBeenCalledWith('history');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('retains the large React Native choice renderer', async () => {
    const view = await render(
      <SegmentedControl
        label="Workout"
        large
        value="done"
        onChange={jest.fn()}
        segments={[
          { value: 'done', label: 'Done' },
          { value: 'rest', label: 'Rest' },
        ]}
      />,
    );

    expect(view.queryByTestId('native-segmented-picker')).toBeNull();
    expect(await view.findByRole('radio', { name: 'Done' })).toBeTruthy();
  });

  it('retains the fallback renderer when no option matches the controlled value', async () => {
    const view = await render(
      <SegmentedControl
        label="Rest duration"
        value=""
        onChange={jest.fn()}
        segments={[
          { value: '60', label: '60 sec' },
          { value: '90', label: '90 sec' },
        ]}
      />,
    );

    expect(view.queryByTestId('native-segmented-picker')).toBeNull();
    expect(await view.findByRole('radio', { name: '60 sec' })).toBeTruthy();
  });
});
