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

it('shows one concise stage title with accessible exact progress', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <CheckInStageHeader step="recovery" stepIndex={1} totalSteps={4} date="2026-08-31" progress={{ answered: 3, total: 15 }} />,
    );
  });

  const output = JSON.stringify(renderer.toJSON());
  const [progress] = renderer.root.findAll(
    (node: { props: { accessibilityRole?: string } }) => node.props.accessibilityRole === 'progressbar',
  );

  expect(output).toContain('Your day');
  expect(output).toContain('3 of 15 answered');
  expect(output).not.toContain('Capture sleep and the context that affects recovery.');
  expect(output).not.toContain('A quick honest check-in is enough.');
  expect(renderer.root.findByProps({ children: 'Your day' }).props.variant).toBe('h1');
  expect(progress.props).toMatchObject({
    accessibilityLabel: 'Check-in step 2 of 4',
    accessibilityValue: { min: 0, max: 100, now: 50 },
  });
  act(() => renderer.update(
    <CheckInStageHeader step="adherence" stepIndex={2} totalSteps={4} date="2026-08-31" progress={{ answered: 9, total: 16 }} />,
  ));
  expect(JSON.stringify(renderer.toJSON())).toContain('9 of 16 answered');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('3 of 15 answered');
});
