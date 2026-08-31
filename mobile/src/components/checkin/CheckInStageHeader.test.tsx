// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInStageHeader } from './CheckInStageHeader';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  radius: { pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12 },
  tabularNums: {},
  type: {
    label: {},
    h2: {},
    bodySm: {},
  },
  useMotion: () => ({
    duration: { enter: 200 },
    reduced: false,
  }),
  useTheme: () => ({
    colors: {
      primary: '#f04e45',
      primaryFill: '#511b1b',
      mutedForeground: '#888',
      foreground: '#fff',
      success: '#0f0',
      gold: '#fc0',
      onPrimary: '#fff',
      elevated: '#222',
      border: '#444',
    },
    isDark: true,
  }),
}));

it('shows fixed stage copy, deterministic framing, and accessible exact progress', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <CheckInStageHeader step="recovery" stepIndex={1} totalSteps={4} date="2026-08-31" />,
    );
  });

  const output = JSON.stringify(renderer.toJSON());
  const [progress] = renderer.root.findAll(
    (node: { props: { accessibilityRole?: string } }) => node.props.accessibilityRole === 'progressbar',
  );

  expect(output).toContain('Sleep and recovery');
  expect(output).toContain('Step 2 of 4');
  expect(progress.props).toMatchObject({
    accessibilityLabel: 'Check-in step 2 of 4',
    accessibilityValue: { min: 0, max: 100, now: 50 },
  });
});
