import type { WeekDay } from '@/lib/streak';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { WeekStrip } from './WeekStrip';

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { card: 20, pill: 99 },
  spacing: { base: 16, xs: 4, sm: 8, md: 12 },
  tabularNums: {},
  type: {
    body: { fontSize: 16, lineHeight: 24 },
    bodySm: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16 },
  },
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      borderStrong: '#222222',
      border: '#dddddd',
      card: '#ffffff',
      chart4: '#3366ff',
      elevated: '#f8f8f8',
      foreground: '#111111',
      gold: '#ffcc00',
      mutedForeground: '#777777',
      onPrimary: '#ffffff',
      primary: '#00a000',
      success: '#00ff00',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

jest.mock('lucide-react-native', () => ({
  Check: 'Check',
}));

function week(): WeekDay[] {
  const values: [string, string, WeekDay['state'], boolean][] = [
    ['2026-08-24', 'M', 'missed', false],
    ['2026-08-25', 'T', 'missed', false],
    ['2026-08-26', 'W', 'done', false],
    ['2026-08-27', 'T', 'done', false],
    ['2026-08-28', 'F', 'done', true],
    ['2026-08-29', 'S', 'future', false],
    ['2026-08-30', 'S', 'future', false],
  ];

  return values.map(([dateString, initial, state, isToday]) => ({
    date: new Date(`${dateString}T12:00:00`),
    dateString,
    initial,
    state,
    isToday,
    workoutStatus: state === 'done' ? 'done' : null,
  }));
}

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });
  return renderer.root;
}

function button(root: ReturnType<typeof create>['root'], label: string) {
  const [node] = root.findAll(
    (candidate: { props: { accessibilityRole?: string; accessibilityLabel?: string } }) =>
      candidate.props.accessibilityRole === 'button' && candidate.props.accessibilityLabel === label,
  );
  if (!node) throw new Error(`No day button named ${label}`);
  return node;
}

describe('WeekStrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps all 44pt days in a horizontal week strip', () => {
    const root = render(<WeekStrip days={week()} onSelectDay={jest.fn()} />);
    const [strip] = root.findAll(
      (candidate: { props: { horizontal?: boolean } }) => candidate.props.horizontal === true,
    );

    expect(strip.props.contentContainerStyle).toMatchObject({ gap: 8 });
    expect(strip.props.accessibilityRole).toBeUndefined();
    expect(button(root, 'Friday 28 August, checked in, workout done. Tap to edit.').props.style).toMatchObject({
      minWidth: 44,
      minHeight: 44,
    });
  });

  it('selects a completed current day and keeps future days disabled', () => {
    const root = render(<WeekStrip days={week()} onSelectDay={jest.fn()} />);

    expect(button(root, 'Friday 28 August, checked in, workout done. Tap to edit.').props.accessibilityState).toMatchObject({
      selected: true,
      disabled: false,
    });
    expect(button(root, 'Saturday 29 August, upcoming').props.accessibilityState).toMatchObject({
      disabled: true,
      selected: false,
    });
  });
});
