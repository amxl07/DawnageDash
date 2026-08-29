import type { TodayAction } from '@/lib/today-action';
import { Button } from '@/components/ui';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { TodayActionCard } from './TodayActionCard';

jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { card: 16, md: 12 },
  spacing: { base: 16, sm: 8, md: 12 },
  tabularNums: {},
  type: { body: {}, bodySm: {}, h2: {} },
  useMotion: () => ({
    pressScale: 0.98,
    spring: { press: {} },
  }),
  useTheme: () => ({
    colors: {
      border: '#dddddd',
      card: '#ffffff',
      elevated: '#f6f6f6',
      foreground: '#111111',
      gold: '#ffcc00',
      mutedForeground: '#777777',
      onPrimary: '#ffffff',
      primary: '#0000ff',
      primaryFill: '#0000ff',
      success: '#00aa00',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

const action: TodayAction = {
  kind: 'review-update',
  title: 'Review your updated plan',
  detail: 'Your coach changed your training plan.',
  route: '/(app)/(tabs)/plans',
};

describe('TodayActionCard', () => {
  it('offers one primary button and an accessible action summary', () => {
    const onPress = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<TodayActionCard action={action} onPress={onPress} />);
    });

    const root = renderer!.root;
    const buttons = root.findAllByType(Button);
    const [summary] = root.findAll(
      (candidate: { props: { accessible?: boolean; accessibilityLabel?: string } }) =>
        candidate.props.accessible === true &&
        candidate.props.accessibilityLabel ===
          'Review your updated plan. Your coach changed your training plan.',
    );

    expect(summary).toBeDefined();
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.props).toMatchObject({
      label: 'Review your updated plan',
      accessibilityHint: 'Your coach changed your training plan.',
    });

    act(() => buttons[0]!.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
