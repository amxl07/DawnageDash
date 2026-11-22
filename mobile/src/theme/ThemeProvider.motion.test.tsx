import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Text, type AppStateStatus } from 'react-native';

import { ThemeProvider, useMotion } from './ThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));

function Probe() {
  const policy = useMotion();
  return <Text testID="motion-policy">{policy.enabled ? 'motion' : 'reduced'}</Text>;
}

let changeMotion: ((enabled: boolean) => void) | undefined;
let changeAppState: ((state: AppStateStatus) => void) | undefined;
const removeMotion = jest.fn();
const removeAppState = jest.fn();

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  // AccessibilityInfo declares unrelated overloads; this fixture only consumes motion events.
  const subscribe = ((event: string, listener: (enabled: boolean) => void) => {
    if (event === 'reduceMotionChanged') changeMotion = listener;
    return { remove: removeMotion };
  }) as unknown as typeof AccessibilityInfo.addEventListener;
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(subscribe);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    changeAppState = listener;
    return { remove: removeAppState };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  removeMotion.mockClear();
  removeAppState.mockClear();
  changeMotion = undefined;
  changeAppState = undefined;
});

it('updates the shared policy when the OS changes Reduce Motion while open', async () => {
  const view = await render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(view.getByText('motion')).toBeTruthy();
  await act(() => changeMotion?.(true));
  expect(view.getByText('reduced')).toBeTruthy();
  await act(() => changeMotion?.(false));
  expect(view.getByText('motion')).toBeTruthy();
});

it('does not overwrite a newer motion event with a late startup query', async () => {
  let resolve!: (value: boolean) => void;
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(new Promise<boolean>((r) => { resolve = r; }));
  const view = await render(<ThemeProvider><Probe /></ThemeProvider>);
  await act(() => changeMotion?.(true));
  await act(() => resolve(false));
  expect(view.getByText('reduced')).toBeTruthy();
});

it('refreshes the preference after returning from system settings', async () => {
  const view = await render(<ThemeProvider><Probe /></ThemeProvider>);
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await act(() => changeAppState?.('active'));
  expect(view.getByText('reduced')).toBeTruthy();
});

it('removes the shared subscriptions on unmount', async () => {
  const view = await render(<ThemeProvider><Probe /></ThemeProvider>);
  await view.unmount();
  expect(removeMotion).toHaveBeenCalledTimes(1);
  expect(removeAppState).toHaveBeenCalledTimes(1);
});
