import { fireEvent, render } from '@testing-library/react-native';
import { WeekRecordStrip } from './WeekRecordStrip';

jest.mock('lucide-react-native', () =>
  Object.fromEntries(['Check', 'Clock3', 'Pencil', 'TriangleAlert'].map((name) => [name, () => null])),
);
jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  useMotion: () => ({ ...jest.requireActual('@/theme/tokens').motion, enabled: false, reduced: true }),
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }),
}));
jest.mock('@/components/ui', () => ({ Text: jest.requireActual('@/components/ui/Text').Text }));

it('reports the saved count while preserving every dated status and future availability', async () => {
  const onSelect = jest.fn();
  const days = [
    { date: '2026-09-14', state: 'synced' as const },
    { date: '2026-09-15', state: 'queued' as const },
    { date: '2026-09-16', state: 'blocked' as const },
    { date: '2026-09-17', state: 'draft' as const },
    { date: '2026-09-18', state: 'absent' as const },
    { date: '2026-09-19', state: 'absent' as const },
    { date: '2026-09-20', state: 'absent' as const },
  ];
  const view = await render(<WeekRecordStrip days={days} today="2026-09-17" onSelect={onSelect} />);

  expect(view.getByText('Check-ins this week')).toBeTruthy();
  expect(view.getByText('3 of 7 saved')).toBeTruthy();
  expect(view.getByRole('button', { name: /Monday.*Saved and synced/ })).toBeTruthy();
  expect(view.getByRole('button', { name: /Tuesday.*Waiting to sync/ })).toBeTruthy();
  expect(view.getByRole('button', { name: /Wednesday.*Needs attention/ })).toBeTruthy();
  expect(view.getByRole('button', { name: /Thursday.*Draft saved/ })).toBeTruthy();
  expect(view.getByRole('button', { name: /Friday.*upcoming/ }).props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(view.getByRole('button', { name: /Tuesday.*Waiting to sync/ }));
  expect(onSelect).toHaveBeenCalledWith('2026-09-15');
});
