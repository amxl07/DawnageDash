import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ButtonFallback as Button } from './ButtonFallback';

jest.mock('react-native-reanimated', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { createAnimatedComponent: () => Pressable },
    useAnimatedStyle: () => ({}),
    useSharedValue: (value: number) => ({ value, get: () => value, set: (next: number) => { value = next; } }),
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
      borderStrong: '#777777',
      destructive: '#aa0000',
      mutedForeground: '#666666',
      onPrimary: '#ffffff',
      primary: '#bb3300',
      primaryFill: '#cc3300',
      primaryPressed: '#a02b20',
      pressed: '#eeeeee',
    },
  }),
}));

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));

describe('Button', () => {
  it('shows touch feedback with motion disabled and commits only on release', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Continue" onPress={onPress} />);
    const button = view.getByRole('button', { name: 'Continue' });
    await fireEvent(button, 'pressIn');
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe('#a02b20');
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent(button, 'pressOut');
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe('#cc3300');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('keeps its label, exposes busy state, and suppresses activation while loading', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Save changes" loading onPress={onPress} />);

    const button = view.getByRole('button', { name: 'Save changes' });
    expect(view.getByText('Save changes')).toBeTruthy();
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('clears a held press when the action becomes unavailable', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Save changes" onPress={onPress} />);
    await fireEvent(view.getByRole('button'), 'pressIn');
    await view.rerender(<Button label="Save changes" onPress={onPress} disabled />);
    expect(StyleSheet.flatten(view.getByRole('button').props.style).backgroundColor).toBe('#777777');
    await fireEvent.press(view.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    await view.rerender(<Button label="Save changes" onPress={onPress} />);
    expect(StyleSheet.flatten(view.getByRole('button').props.style).backgroundColor).toBe('#cc3300');
  });

  it('supports text and destructive action variants without changing the label contract', async () => {
    expect((await render(<Button label="Cancel" variant="text" />)).getByText('Cancel')).toBeTruthy();
    expect((await render(<Button label="Delete" variant="destructive" />)).getByText('Delete')).toBeTruthy();
  });
});
