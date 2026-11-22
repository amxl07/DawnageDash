import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { RestDock, WorkoutRestFooter } from './RestDock';

let mockTimerState = {
  duration: 90,
  remaining: 45,
  progress: 0.5,
  running: true,
  complete: false,
  paused: false,
  extend: jest.fn(),
  start: jest.fn(),
  toggle: jest.fn(),
  reset: jest.fn(),
  skip: jest.fn(),
};

jest.mock('./useRestTimer', () => ({
  REST_PRESETS: [60, 90, 120, 180],
  useRestTimer: () => mockTimerState,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('expo-router/js-tabs', () => {
  const React = jest.requireActual('react');
  return { BottomTabBarHeightContext: React.createContext(0) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('@/components/ui', () => ({
  Button: () => null,
  Text: jest.requireActual('react-native').Text,
}));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/theme', () => ({
  spacing: { xs: 4, sm: 8, base: 16 },
  radius: { sm: 8, pill: 999 },
  useTheme: () => ({ colors: { border: '#333333', card: '#111111', elevated: '#222222', primary: '#ff5544', primarySoft: '#331111', pressed: '#292929' } }),
}));

it('reports the compact rest footer height for content clearance', () => {
  const onHeightChange = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<WorkoutRestFooter onHeightChange={onHeightChange}><Text>Rest</Text></WorkoutRestFooter>);
  });
  const footer = renderer.root.findByProps({ testID: 'workout-rest-footer' });
  act(() => footer.props.onLayout({ nativeEvent: { layout: { height: 72 } } }));
  expect(onHeightChange).toHaveBeenCalledWith(72);
  act(() => renderer.unmount());
  expect(onHeightChange).toHaveBeenLastCalledWith(0);
});

it('exposes active rest progress without hiding the timer controls', () => {
  mockTimerState = { ...mockTimerState, duration: 90, remaining: 45, progress: 0.5, running: true, complete: false, paused: false };
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<RestDock preference={{ autoStart: false, seconds: 90 }} onPreferenceChange={jest.fn()} />);
  });

  const progress = renderer.root.findByProps({ accessibilityRole: 'progressbar' });
  expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 90, now: 45, text: '45 seconds remaining' });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Pause rest timer' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Skip rest' })).toBeTruthy();
});
