import { Button } from '@/components/ui';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { StreakHero } from './StreakHero';

jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  Flame: 'Flame',
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24 },
  radius: { card: 16, md: 12 },
  spacing: { base: 16, sm: 8, md: 12, xs: 4, lg: 20 },
  tabularNums: {},
  type: { body: {}, bodySm: {}, display: {}, h2: {}, label: {} },
  useMotion: () => ({
    enabled: false,
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

describe('StreakHero', () => {
  it('keeps an incomplete streak informative without adding a check-in button', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <StreakHero streak={4} dayNumber={12} weekNumber={2} checkedInToday={false} />,
      );
    });

    const root = renderer!.root;
    const [summary] = root.findAll(
      (candidate: { props: { accessible?: boolean; accessibilityLabel?: string } }) =>
        candidate.props.accessible === true &&
        candidate.props.accessibilityLabel ===
          '4 day streak. Day 12 · Week 2. Not checked in today.',
    );

    expect(summary).toBeDefined();
    expect(root.findAllByType(Button)).toHaveLength(0);
  });
});
