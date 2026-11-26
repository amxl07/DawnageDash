import { StyleSheet } from 'react-native';

import { act, create } from 'react-test-renderer';

import type { PlanDay } from '@/hooks/usePlans';
import { PlanDayCard } from './PlanDayCard';

// Exercise the React Native host contract here; the SwiftUI adapter has dedicated tests.
jest.mock('@/components/ui/Button', () => ({ Button: jest.requireActual('@/components/ui/ButtonFallback').ButtonFallback }));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => undefined) }));
jest.mock('lucide-react-native', () => ({ ChevronDown: 'ChevronDown', Play: 'Play' }));
jest.mock('@/components/ui/DisclosureChevron', () => {
  const native = jest.requireActual('react-native');
  return {
    DisclosureChevron: ({ expanded }: { expanded: boolean }) => (
      <native.View testID="disclosure-chevron" accessibilityState={{ expanded }} />
    ),
  };
});
jest.mock('@/components/ui/MotionReveal', () => {
  const native = jest.requireActual('react-native');
  return {
    MotionReveal: ({ children, ...props }: React.ComponentProps<typeof native.View> & { revision?: string }) => (
      <native.View {...props}>{children}</native.View>
    ),
  };
});
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { md: 12, card: 16, pill: 999, button: 12 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  tabularNums: {},
  type: {
    body: { fontSize: 16 },
    bodySm: { fontSize: 14 },
    h2: { fontSize: 20 },
    label: { fontSize: 12 },
  },
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
      primaryPressed: '#04c',
      pressed: '#eee',
      success: '#080',
    },
    shadow: { card: {}, sheet: {} },
  }),
  useMotion: () => ({ enabled: false, pressScale: 1, spring: { press: {} } }),
}));

const mockOpenBrowserAsync = jest.requireMock('expo-web-browser').openBrowserAsync as jest.Mock;
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

function renderCard(
  status: 'today' | 'active' | 'complete' | 'upcoming' = 'today',
  testID?: string,
  onShowDetails = jest.fn(),
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <PlanDayCard
        day={day}
        status={status}
        onStart={jest.fn()}
        onShowDetails={onShowDetails}
        testID={testID}
      />,
    );
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

  it('preserves count, notes, video alternative, expansion state, and 48pt actions', () => {
    const renderer = renderCard('today', 'plan-current-day');
    const disclosure = renderer.root.findByProps({
      accessibilityLabel: 'Day 2, Upper body, 1 exercise, status: Today',
    });

    expect(disclosure.props.accessibilityState).toEqual({ expanded: false });
    expect(disclosure.props.testID).toBe('plan-current-day');
    expect(StyleSheet.flatten(disclosure.props.style({ pressed: false }))).toMatchObject({ minHeight: 48 });
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
    expect(StyleSheet.flatten(video.props.style({ pressed: false }))).toMatchObject({ minWidth: 48, minHeight: 48 });

    act(() => video.props.onPress());
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://example.com/press');
  });

  it('opens the full prescription from the exercise inside its day disclosure', () => {
    const onShowDetails = jest.fn();
    const renderer = renderCard('today', undefined, onShowDetails);

    pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: Today');
    const details = renderer.root.findByProps({
      accessibilityLabel: 'Show details for Shoulder press',
    });
    expect(StyleSheet.flatten(details.props.style({ pressed: false }))).toMatchObject({ minWidth: 48, minHeight: 48 });

    act(() => details.props.onPress());

    expect(onShowDetails).toHaveBeenCalledWith(day.exercises[0]);
  });

  it('delegates disclosure state and local content reveal to shared motion primitives', () => {
    const renderer = renderCard();

    pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: Today');

    expect(renderer.root.findByProps({ testID: 'disclosure-chevron' }).props.accessibilityState)
      .toEqual({ expanded: true });
    expect(renderer.root.findByProps({ testID: 'plan-day-expanded-content' }).props.revision)
      .toBe('open');
  });
});

it('keeps template prescriptions readable without exposing an unsupported Start action', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<PlanDayCard day={day} status="unknown" onShowDetails={jest.fn()} />); });
  pressByLabel(renderer, 'Day 2, Upper body, 1 exercise, status: Preview');
  expect(renderer.root.findByProps({ children: '3 × 8–10' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Start Day 2' })).toHaveLength(0);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Show details for Shoulder press' })).toBeTruthy();
});
