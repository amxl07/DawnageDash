/* eslint-disable @typescript-eslint/no-require-imports */
import * as Haptics from 'expo-haptics';
import { fireEvent, render, within } from '@testing-library/react-native';
import { CheckInRatingScale } from './CheckInRatingScale';

let mockWide = false;
let mockMotion = true;
const mockTiming = jest.fn((value: number, _config?: object) => value);
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ isWide: mockWide, isCompact: false }) }));
jest.mock('@/components/ui/Text', () => ({ Text: require('react-native').Text }));
jest.mock('@/theme', () => ({ HIT_SLOP_MIN: 44, radius: { md: 12 }, spacing: { xs: 4, sm: 8 }, tabularNums: {}, type: { body: {} }, useMotion: () => ({ enabled: mockMotion, pressScale: 0.97, duration: { micro: 120 }, easing: { standard: [0.16, 1, 0.3, 1] } }), useTheme: () => ({ colors: {} }) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: require('react-native').View,
    createAnimatedComponent: (component: unknown) => component,
  },
  cancelAnimation: jest.fn(),
  Easing: { bezier: () => 'ease' },
  interpolateColor: (value: number, _range: number[], colors: string[]) => colors[value ? 1 : 0],
  useAnimatedStyle: (callback: () => unknown) => callback(),
  useSharedValue: (initial: number) => { const ref = require('react').useRef(initial); return { get: () => ref.current, set: (value: number) => { ref.current = value; } }; },
  withTiming: (value: number, config?: object) => mockTiming(value, config),
}));
beforeEach(() => { jest.clearAllMocks(); mockWide = false; mockMotion = true; });

it('exposes all exact integer options and both endpoint meanings', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy out of 10" value={4} onChange={changed} accessibilityMode="options" optionTestIDPrefix="energy" />);
  expect(screen.getAllByRole('radio')).toHaveLength(10);
  expect(screen.getByRole('radio', { name: 'Energy out of 10, 1, Low' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Energy out of 10, 10, High' })).toBeTruthy();
  await fireEvent.press(screen.getByTestId('energy-7'));
  await fireEvent.press(screen.getByTestId('energy-4'));
  expect(changed.mock.calls).toEqual([[7]]);
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});

it('uses two rows of five on a phone and one row only on a wide layout', async () => {
  const props = { label: 'Energy', value: 4, onChange: jest.fn(), accessibilityMode: 'options' as const, optionTestIDPrefix: 'energy' };
  const screen = await render(<CheckInRatingScale {...props} />);
  expect(within(screen.getByTestId('energy-row-1')).getAllByRole('radio')).toHaveLength(5);
  expect(within(screen.getByTestId('energy-row-2')).getAllByRole('radio')).toHaveLength(5);
  mockWide = true;
  await screen.rerender(<CheckInRatingScale {...props} />);
  expect(within(screen.getByTestId('energy-row-1')).getAllByRole('radio')).toHaveLength(10);
  expect(screen.queryByTestId('energy-row-2')).toBeNull();
});

it('starts an unset adjustable rating at 1 on the first increment', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Hunger" value={null} onChange={changed} />);
  const group = screen.getByRole('adjustable');
  expect(group.props.accessibilityValue.text).toBe('Not selected');
  expect(group.props.accessibilityHint).toContain('1 means Low; 10 means High');
  await fireEvent(group, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(changed).toHaveBeenCalledWith(1);
});

it('moves by adjacent integers and clamps at both accessible endpoints', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Hunger" value={5} onChange={changed} />);
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(changed.mock.calls).toEqual([[6], [4]]);
  await screen.rerender(<CheckInRatingScale label="Hunger" value={1} onChange={changed} />);
  expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('Low');
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  await screen.rerender(<CheckInRatingScale label="Hunger" value={10} onChange={changed} />);
  expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('High');
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(changed).toHaveBeenCalledTimes(2);
});

it('keeps the chosen value and ten options available with reduced motion', async () => {
  mockMotion = false;
  const screen = await render(<CheckInRatingScale label="Energy" value={8} onChange={jest.fn()} accessibilityMode="options" optionTestIDPrefix="energy" />);
  expect(screen.getByTestId('energy-8').props.accessibilityState.checked).toBe(true);
  expect(screen.getAllByRole('radio')).toHaveLength(10);
});

it('starts press feedback on touch down and restores it on release without selecting', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy" value={4} onChange={changed} accessibilityMode="options" optionTestIDPrefix="energy" />);
  mockTiming.mockClear();

  await fireEvent(screen.getByTestId('energy-7'), 'pressIn');
  expect(mockTiming).toHaveBeenLastCalledWith(0.97, expect.objectContaining({ duration: 120 }));
  expect(changed).not.toHaveBeenCalled();

  await fireEvent(screen.getByTestId('energy-7'), 'pressOut');
  expect(mockTiming).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: 120 }));
  expect(changed).not.toHaveBeenCalled();
});

it('does not replay press feedback when a saved rating is restored by props', async () => {
  const props = { label: 'Energy', onChange: jest.fn(), accessibilityMode: 'options' as const, optionTestIDPrefix: 'energy' };
  const screen = await render(<CheckInRatingScale {...props} value={null} />);
  mockTiming.mockClear();

  await screen.rerender(<CheckInRatingScale {...props} value={7} />);

  expect(screen.getByTestId('energy-7').props.accessibilityState.checked).toBe(true);
  expect(mockTiming).not.toHaveBeenCalled();
});
