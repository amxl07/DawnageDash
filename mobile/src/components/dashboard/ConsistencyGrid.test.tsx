import type { ProcessedCheckIn } from '@/lib/checkin-utils';
import { format } from 'date-fns';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInHistorySheet } from './CheckInHistorySheet';
import { ConsistencyGrid } from './ConsistencyGrid';

jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  ChevronRight: 'ChevronRight',
  X: 'X',
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const BottomSheetModal = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>) => {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return <View>{children}</View>;
    },
  );
  BottomSheetModal.displayName = 'MockBottomSheetModal';

  return {
    BottomSheetBackdrop: View,
    BottomSheetFlatList: ({ data, renderItem }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => React.ReactNode }) => (
      <View>{data.map((item, index) => <React.Fragment key={index}>{renderItem({ item, index })}</React.Fragment>)}</View>
    ),
    BottomSheetModal,
    BottomSheetScrollView: View,
    BottomSheetView: View,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/theme', () => ({
  horizontalInset: () => 16,
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24 },
  radius: { sm: 8, card: 16 },
  spacing: { base: 16, xs: 4, sm: 8, md: 12 },
  tabularNums: {},
  type: {
    body: {},
    bodySm: {},
    label: {},
  },
  useMotion: () => ({ enabled: false, duration: { enter: 200 } }),
  useTheme: () => ({
    colors: {
      border: '#dddddd',
      borderStrong: '#aaaaaa',
      card: '#ffffff',
      elevated: '#f6f6f6',
      mutedForeground: '#777777',
      foreground: '#111111',
      onPrimary: '#ffffff',
      primary: '#0000ff',
      gold: '#ffcc00',
      chart4: '#3366ff',
      success: '#00aa00',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

function checkIn(dateString: string): ProcessedCheckIn {
  const [year, month, day] = dateString.split('-').map(Number);
  return {
    date: new Date(year, (month ?? 1) - 1, day),
    dateString,
    dayNumber: 1,
    status: 'done',
    originalCheckIn: {
      id: dateString,
      user_id: 'user',
      date: dateString,
      workout_status: 'done',
    },
  };
}

describe('ConsistencyGrid', () => {
  it('exposes one 44pt history action while leaving cells noninteractive', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ConsistencyGrid processed={[checkIn('2026-08-29')]} onOpenHistory={jest.fn()} />);
    });
    const root = renderer!.root;

    const buttons = root.findAll(
      (candidate: { props: { accessibilityRole?: string } }) =>
        candidate.props.accessibilityRole === 'button',
    );

    expect(new Set(buttons.map((button: { props: { accessibilityLabel?: string } }) => button.props.accessibilityLabel))).toEqual(new Set([
      expect.stringMatching(/^Consistency: \d+ of \d+ days, \d+ percent\. Open check-in history\.$/),
    ]));
    expect(buttons[0]!.props).toMatchObject({
      accessibilityLabel: expect.stringMatching(/^Consistency: \d+ of \d+ days, \d+ percent\. Open check-in history\.$/),
      style: expect.objectContaining({ minHeight: 44 }),
    });
  });

  it('selects a history row before closing its sheet', () => {
    const today = new Date();
    const dateString = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    const events: string[] = [];
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <CheckInHistorySheet
          visible
          processed={[checkIn(dateString)]}
          onSelectDay={(dateString) => events.push(`select:${dateString}`)}
          onClose={() => events.push('close')}
        />,
      );
    });

    const row = renderer!.root.find(
      (candidate: { props: { accessibilityLabel?: string } }) =>
        candidate.props.accessibilityLabel === `${format(today, 'EEEE d MMMM')}, workout done`,
    );
    act(() => row.props.onPress());

    expect(row.props.style({ pressed: false })).toMatchObject({ minHeight: 44 });
    expect(events).toEqual([`select:${dateString}`, 'close']);
  });
});
