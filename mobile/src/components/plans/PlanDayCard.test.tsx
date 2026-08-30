import { Pressable, StyleSheet } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { PlanDay } from '@/hooks/usePlans';
import { PlanDayCard } from './PlanDayCard';

const mockMotion = {
  enabled: true,
  duration: { feedback: 160, enter: 200 },
  easing: { standard: [0.16, 1, 0.3, 1] as const },
};

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => undefined) }));
jest.mock('lucide-react-native', () => ({ ChevronDown: 'ChevronDown', Play: 'Play' }));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: native.View,
      createAnimatedComponent: (Component: typeof Pressable) => Component,
    },
    Easing: { bezier: jest.fn(() => 'standard-easing') },
    FadeIn: { duration: jest.fn((duration: number) => ({ type: 'fade-in', duration })) },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: jest.fn((value: number) => value),
  };
});
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { md: 12, card: 16, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  tabularNums: {},
  type: {
    body: { fontSize: 16 },
    bodySm: { fontSize: 14 },
    h2: { fontSize: 20 },
    label: { fontSize: 12 },
  },
  useMotion: () => mockMotion,
  useTheme: () => ({
    colors: {
      border: '#ddd',
      borderStrong: '#aaa',
      card: '#fff',
      elevated: '#fafafa',
      foreground: '#111',
      gold: '#a60',
      mutedForeground: '#666',
      onPrimary: '#fff',
      primary: '#05f',
      primaryFill: '#05f',
      success: '#080',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

const mockOpenBrowserAsync = jest.requireMock('expo-web-browser').openBrowserAsync as jest.Mock;
const mockReanimated = jest.requireMock('react-native-reanimated') as {
  FadeIn: { duration: jest.Mock };
  withTiming: jest.Mock;
};
const mockFadeDuration = mockReanimated.FadeIn.duration;
const mockWithTiming = mockReanimated.withTiming;

const day: PlanDay = {
  id: 'day-2',
  day_number: 2,
  focus: 'Upper body',
  exercises: [
    {
      id: 'press',
      name: 'Shoulder press',
      sets: 3,
      reps: '8–10',
      warmupSets: 0,
      substitutions: [],
      notes: 'Keep ribs down',
      videoLink: 'https://example.com/press',
    },
  ],
  notes: 'Move with control',
  updated_at: '2026-08-29T10:00:00.000Z',
};

function renderCard(status: 'today' | 'active' | 'complete' | 'upcoming' = 'today') {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<PlanDayCard day={day} status={status} onStart={jest.fn()} />);
  });
  return renderer;
}

function pressByLabel(renderer: ReturnType<typeof create>, label: string) {
  const node = renderer.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: label });
  act(() => node.props.onPress());
  return node;
}

describe('PlanDayCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotion.enabled = true;
  });

  it.each([
    ['today', 'Today', 'Start Day 2'],
    ['active', 'Active', 'Continue Day 2'],
    ['complete', 'Complete', 'Repeat Day 2'],
    ['upcoming', 'Upcoming', 'Start Day 2'],
  ] as const)('shows %s status with the exact action label', (status, badge, action) => {
    const renderer = renderCard(status);
    expect(renderer.root.findByProps({ children: badge })).toBeTruthy();

    pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: ' + badge);

    expect(renderer.root.findByProps({ accessibilityLabel: action })).toBeTruthy();
  });

  it('preserves count, notes, video alternative, expansion state, and 44pt actions', () => {
    const renderer = renderCard();
    const disclosure = renderer.root.findByProps({
      accessibilityLabel: 'Day 2, Upper body, 1 exercise, status: Today',
    });

    expect(disclosure.props.accessibilityState).toEqual({ expanded: false });
    expect(StyleSheet.flatten(disclosure.props.style)).toMatchObject({ minHeight: 44 });
    expect(renderer.root.findByProps({ children: 'Upper body · 1 exercise' })).toBeTruthy();

    act(() => disclosure.props.onPress());

    expect(disclosure.props.accessibilityState).toEqual({ expanded: true });
    expect(renderer.root.findByProps({ children: 'Move with control' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Keep ribs down' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: '3 × 8–10' })).toBeTruthy();
    const video = renderer.root.findByProps({
      accessibilityRole: 'button',
      accessibilityLabel: 'Watch demo for Shoulder press',
    });
    expect(StyleSheet.flatten(video.props.style)).toMatchObject({ minWidth: 44, minHeight: 44 });

    act(() => video.props.onPress());
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://example.com/press');
  });

  it('uses a 160ms chevron rotation and at most 200ms opacity entrance', () => {
    const renderer = renderCard();

    pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: Today');

    expect(mockWithTiming).toHaveBeenCalledWith(
      180,
      expect.objectContaining({ duration: 160 }),
    );
    expect(mockFadeDuration).toHaveBeenCalledWith(200);
    expect(renderer.root.findByProps({ testID: 'plan-day-expanded-content' }).props.entering).toEqual({
      type: 'fade-in',
      duration: 200,
    });
  });

  it('makes expansion immediate under Reduced Motion', () => {
    mockMotion.enabled = false;
    const renderer = renderCard();

    pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: Today');

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: 'plan-day-expanded-content' }).props.entering).toBeUndefined();
  });
});
