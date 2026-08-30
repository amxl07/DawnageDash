import { Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { BodyMeasurement } from '@/types/db';
import { MeasurementHistoryRow } from './MeasurementHistoryRow';

const MockNativeText = NativeText;
const MockView = View;

jest.mock('@/components/ui', () => ({
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  spacing: { sm: 8, md: 12 },
}));

const row: BodyMeasurement = {
  id: 'measurement-3',
  user_id: 'user-1',
  date: '2026-08-29',
  chest: 96,
  waist: 82.5,
  hips: null,
  thighs: 55,
  arms: 34,
};

function renderRow(onEdit = jest.fn()) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<MeasurementHistoryRow row={row} weekNumber={3} onEdit={onEdit} />);
  });

  const [button] = renderer.root.findAll(
    (node: { props: Record<string, unknown> }) => node.props.accessibilityRole === 'button',
  );
  if (!button) throw new Error('Expected an accessible history-row button');

  return { button, onEdit };
}

describe('MeasurementHistoryRow', () => {
  it('combines week, source date, values, and edit affordance into one label', () => {
    const { button } = renderRow();

    expect(button.props.accessibilityLabel).toBe(
      'Week 3, 29 August 2026. Chest 96, Waist 82.5, Hips —, Thighs 55, Arms 34. Tap to edit.',
    );
  });

  it('opens the exact history entry for editing', () => {
    const { button, onEdit } = renderRow();

    act(() => button.props.onPress());

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
