/* eslint-disable @typescript-eslint/no-require-imports */
import * as Haptics from 'expo-haptics';
import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

let CheckInRatingScale: typeof import('./CheckInRatingScale').CheckInRatingScale;

let mockWide = false;
let mockMotion = true;
let mockFontScale = 1;
let mockTouchTarget = 44;
const mockTiming = jest.fn((value: number, _config?: object) => value);
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ isWide: mockWide, isCompact: false, fontScale: mockFontScale }) }));
jest.mock('@/components/ui/Text', () => ({ Text: require('react-native').Text }));
jest.mock('@/theme', () => ({ get HIT_SLOP_MIN() { return mockTouchTarget; }, radius: { md: 12 }, spacing: { xs: 4, sm: 8 }, tabularNums: {}, type: { body: { fontSize: 17, lineHeight: 24 } }, useMotion: () => ({ enabled: mockMotion, pressScale: 0.97, duration: { micro: 120, feedback: 160 }, easing: { standard: [0.16, 1, 0.3, 1] } }), useTheme: () => ({ colors: {} }) }));
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

function loadRatingScale() {
  // Metro snapshots named imports: load the control after setting the platform token.
  // Keep one React dispatcher and the same native/animation mocks across module scopes.
  const react = require('react');
  const native = require('react-native');
  const reanimated = require('react-native-reanimated');
  const haptics = require('expo-haptics');
  jest.isolateModules(() => {
    jest.doMock('react', () => react);
    jest.doMock('react-native', () => native);
    jest.doMock('react-native-reanimated', () => reanimated);
    jest.doMock('expo-haptics', () => haptics);
    CheckInRatingScale = require('./CheckInRatingScale').CheckInRatingScale;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWide = false;
  mockMotion = true;
  mockFontScale = 1;
  mockTouchTarget = 44;
  loadRatingScale();
});

const optionsProps = { label: 'Energy', value: null, onChange: jest.fn(), accessibilityMode: 'options' as const, optionTestIDPrefix: 'energy' };
type Screen = Awaited<ReturnType<typeof render>>;
async function measureWidth(screen: Screen, width: number) {
  await fireEvent(screen.getByTestId('energy'), 'layout', { nativeEvent: { layout: { width, height: 120, x: 0, y: 0 } } });
}

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

it('keeps two rows until ten full targets fit the measured control width', async () => {
  const screen = await render(<CheckInRatingScale {...optionsProps} />);
  await measureWidth(screen, 300);
  expect(within(screen.getByTestId('energy-row-1')).getAllByRole('radio')).toHaveLength(5);
  expect(within(screen.getByTestId('energy-row-2')).getAllByRole('radio')).toHaveLength(5);
  mockWide = true;
  await screen.rerender(<CheckInRatingScale {...optionsProps} />);
  expect(screen.getByTestId('energy-row-2')).toBeTruthy();
  mockWide = false;
  await screen.rerender(<CheckInRatingScale {...optionsProps} />);
  await measureWidth(screen, 476);
  expect(within(screen.getByTestId('energy-row-1')).getAllByRole('radio')).toHaveLength(10);
  expect(screen.queryByTestId('energy-row-2')).toBeNull();
  await measureWidth(screen, 475);
  expect(screen.getByTestId('energy-row-2')).toBeTruthy();
});

it('returns to two rows when text grows even though the control width is unchanged', async () => {
  const screen = await render(<CheckInRatingScale {...optionsProps} />);
  await measureWidth(screen, 500);
  expect(screen.queryByTestId('energy-row-2')).toBeNull();
  mockFontScale = 2;
  await screen.rerender(<CheckInRatingScale {...optionsProps} />);
  expect(within(screen.getByTestId('energy-row-1')).getAllByRole('radio')).toHaveLength(5);
  expect(within(screen.getByTestId('energy-row-2')).getAllByRole('radio')).toHaveLength(5);
});

it.each([[240, 1, 44], [260, 1, 48], [240, 1.6, 44], [240, 2, 44], [176, 2.5, 44]])('keeps targets and enlarged numbers inside %spt at %sx text with %spt targets', async (width, fontScale, touchTarget) => {
  mockFontScale = fontScale;
  mockTouchTarget = touchTarget;
  loadRatingScale();
  const screen = await render(<CheckInRatingScale {...optionsProps} />);
  await measureWidth(screen, width);
  const rows = screen.getAllByTestId(/^energy-row-\d+$/);
  expect(screen.getAllByRole('radio')).toHaveLength(10);
  for (const row of rows) {
    const options = within(row).getAllByRole('radio');
    const gap = StyleSheet.flatten(row.props.style).gap;
    let requiredWidth = gap * (options.length - 1);
    for (const option of options) {
      const style = StyleSheet.flatten(option.props.style);
      expect(style.minWidth).toBeGreaterThanOrEqual(touchTarget);
      expect(style.minHeight).toBeGreaterThanOrEqual(touchTarget);
      expect(style.minWidth).toBeGreaterThanOrEqual(20 * fontScale);
      expect(style.minHeight).toBeGreaterThanOrEqual(24 * fontScale);
      requiredWidth += style.minWidth;
    }
    expect(requiredWidth).toBeLessThanOrEqual(width);
  }
});

it('starts unanswered and selects every exact integer with one haptic per change', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale {...optionsProps} onChange={changed} />);
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getAllByRole('radio').every((option) => !option.props.accessibilityState.checked)).toBe(true);
  for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    await fireEvent.press(screen.getByTestId(`energy-${value}`));
    expect(changed).toHaveBeenLastCalledWith(value);
    await screen.rerender(<CheckInRatingScale {...optionsProps} value={value} onChange={changed} />);
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
    expect(screen.getByTestId(`energy-${value}`).props.accessibilityState.checked).toBe(true);
  }
  expect(changed.mock.calls).toEqual([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]);
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(10);
});

it.each([null, 5])('ignores unknown accessibility actions for value %s', async (value) => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy" value={value} onChange={changed} />);
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(changed).not.toHaveBeenCalled();
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

it('starts an unset adjustable rating at 10 on the first decrement', async () => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy" value={null} onChange={changed} />);
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(changed).toHaveBeenCalledWith(10);
});

it.each([0, 11, 4.5, NaN])('does not expose a restored invalid rating %s as a selected option', async (value) => {
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy" value={value} onChange={changed} />);
  expect(screen.getByRole('adjustable').props.accessibilityValue.text).toBe('Not selected');
  expect(changed).not.toHaveBeenCalled();
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(changed).toHaveBeenCalledWith(1);
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
  expect(screen.getByRole('adjustable').props.accessibilityValue).toMatchObject({ min: 1, max: 10, now: 5 });
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
  const changed = jest.fn();
  const screen = await render(<CheckInRatingScale label="Energy" value={8} onChange={changed} accessibilityMode="options" optionTestIDPrefix="energy" />);
  expect(screen.getByTestId('energy-8').props.accessibilityState.checked).toBe(true);
  expect(screen.getAllByRole('radio')).toHaveLength(10);
  await fireEvent(screen.getByTestId('energy-7'), 'pressIn');
  await fireEvent.press(screen.getByTestId('energy-7'));
  await fireEvent(screen.getByTestId('energy-7'), 'pressOut');
  expect(changed).toHaveBeenCalledWith(7);
  expect(mockTiming).not.toHaveBeenCalled();
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
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
