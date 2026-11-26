import { fireEvent, render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';

let mockFontScale = 1;
let mockTouchTarget = 44;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));
jest.mock('lucide-react-native', () =>
  Object.fromEntries(['ArrowLeftRight', 'Check', 'Clock3', 'Pencil', 'TriangleAlert'].map((name) => [name, () => null])),
);
jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  HIT_SLOP_MIN: mockTouchTarget,
  useMotion: () => ({ ...jest.requireActual('@/theme/tokens').motion, enabled: false, reduced: true }),
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }),
}));
jest.mock('@/components/ui', () => ({ Text: jest.requireActual('@/components/ui/Text').Text }));

const sharedReact = jest.requireActual('react');
const sharedNative = jest.requireActual('react-native');
const sharedReanimated = jest.requireActual('react-native-reanimated');

function loadWeekRecordStrip() {
  let component!: typeof import('./WeekRecordStrip').WeekRecordStrip;
  // Metro snapshots named imports. Load after selecting the platform token,
  // while sharing the renderer's React/native instances across module scopes.
  jest.isolateModules(() => {
    jest.doMock('react', () => sharedReact);
    jest.doMock('react-native', () => sharedNative);
    jest.doMock('react-native-reanimated', () => sharedReanimated);
    component = jest.requireActual<typeof import('./WeekRecordStrip')>('./WeekRecordStrip').WeekRecordStrip;
  });
  return component;
}

const week = [14, 15, 16, 17, 18, 19, 20].map((day) => ({
  date: `2026-09-${day}`, state: 'absent' as const,
}));
const measured = (width: number) => ({ nativeEvent: { layout: { width, height: 100, x: 0, y: 0 } } });

beforeEach(() => {
  jest.clearAllMocks();
  mockFontScale = 1;
  mockTouchTarget = 44;
});

it('reports the saved count while preserving every dated status and future availability', async () => {
  const WeekRecordStrip = loadWeekRecordStrip();
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
  await fireEvent.press(view.getByRole('button', { name: /Friday.*upcoming/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(view.getByRole('button', { name: /Thursday.*Draft saved/ }).props.accessibilityState.selected).toBe(true);
});

it.each([
  { width: 350, touchTarget: 44 },
  { width: 320, touchTarget: 44 },
  { width: 350, touchTarget: 48 },
  { width: 336, touchTarget: 48 },
])('fits seven dates into $width points with $touchTarget-point touch targets', async ({ width, touchTarget }) => {
  mockTouchTarget = touchTarget;
  const WeekRecordStrip = loadWeekRecordStrip();
  const view = await render(<WeekRecordStrip days={week} today="2026-09-20" onSelect={jest.fn()} />);
  const strip = view.getByTestId('week-record-strip');
  await fireEvent(strip, 'layout', measured(width));

  expect(strip.props.scrollEnabled).toBe(false);
  const cells = view.getAllByRole('button').map((day) => StyleSheet.flatten(day.props.style));
  expect(cells).toHaveLength(7);
  cells.forEach((cell) => {
    expect(cell.width).toBeGreaterThanOrEqual(touchTarget);
    expect(cell.minHeight).toBeGreaterThanOrEqual(touchTarget);
  });
  const { gap } = StyleSheet.flatten(strip.props.contentContainerStyle);
  expect(cells.reduce((total, cell) => total + cell.width, gap * 6)).toBeCloseTo(width, 5);
  expect(view.queryByText('Scroll to see all days')).toBeNull();
});

it('keeps narrow dates scrollable and reveals today after the content is laid out', async () => {
  const WeekRecordStrip = loadWeekRecordStrip();
  const view = await render(<WeekRecordStrip days={week} today="2026-09-20" onSelect={jest.fn()} />);
  const strip = view.getByTestId('week-record-strip');
  await fireEvent(strip, 'layout', measured(280));
  await fireEvent(strip, 'contentSizeChange', 332, 100);

  expect(strip.props.scrollEnabled).toBe(true);
  expect(strip.props.showsHorizontalScrollIndicator).toBe(true);
  expect(view.getByText('Scroll to see all days')).toBeTruthy();
  expect(ScrollView.prototype.scrollTo).toHaveBeenLastCalledWith({ x: 52, animated: false });
  expect(StyleSheet.flatten(view.getAllByRole('button')[0].props.style).width).toBe(44);
});

it('adapts to larger text and resets its offset when the full week fits again', async () => {
  const WeekRecordStrip = loadWeekRecordStrip();
  const props = { days: week, today: '2026-09-20', onSelect: jest.fn() };
  const view = await render(<WeekRecordStrip {...props} />);
  const strip = view.getByTestId('week-record-strip');
  await fireEvent(strip, 'layout', measured(350));
  mockFontScale = 1.5;
  await view.rerender(<WeekRecordStrip {...props} />);
  await fireEvent(strip, 'contentSizeChange', 486, 120);

  expect(strip.props.scrollEnabled).toBe(true);
  expect(StyleSheet.flatten(view.getAllByRole('button')[0].props.style).width).toBe(66);
  expect(ScrollView.prototype.scrollTo).toHaveBeenLastCalledWith({ x: 136, animated: false });

  mockFontScale = 1;
  await view.rerender(<WeekRecordStrip {...props} />);
  expect(strip.props.scrollEnabled).toBe(false);
  expect(ScrollView.prototype.scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
});

it('does not jump back to today when a saved status refreshes', async () => {
  const WeekRecordStrip = loadWeekRecordStrip();
  const view = await render(<WeekRecordStrip days={week} today="2026-09-20" onSelect={jest.fn()} />);
  await fireEvent(view.getByTestId('week-record-strip'), 'layout', measured(280));
  jest.mocked(ScrollView.prototype.scrollTo).mockClear();

  await view.rerender(<WeekRecordStrip days={week.map((day) => ({ ...day, state: 'synced' }))} today="2026-09-20" onSelect={jest.fn()} />);
  expect(ScrollView.prototype.scrollTo).not.toHaveBeenCalled();
});
