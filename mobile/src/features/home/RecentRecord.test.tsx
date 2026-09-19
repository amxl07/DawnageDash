import { fireEvent, render } from '@testing-library/react-native';
import { RecentRecord } from './RecentRecord';

jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }) }));
jest.mock('@/components/ui', () => ({ Text: jest.requireActual('@/components/ui/Text').Text }));

it('exposes dated chart selection without requiring a gesture', async () => {
  const view = await render(<RecentRecord summary={{ from: '2026-09-09', to: '2026-09-15', sleep: { value: 7.5, samples: 2 }, latestWeight: { date: '2026-09-15', value: 72.4 }, weightPoints: [{ date: '2026-09-12', value: 73 }, { date: '2026-09-15', value: 72.4 }] }} />);
  const chart = view.getByRole('adjustable', { name: 'Weight history' });
  expect(chart.props.accessibilityValue.text).toContain('72.4 kilograms');
  await fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(view.getByRole('adjustable', { name: 'Weight history' }).props.accessibilityValue.text).toContain('73.0 kilograms');
  expect(view.getByRole('adjustable', { name: 'Weight history' }).props.accessibilityValue.now).toBe(1);
});

it('selects the interior point at its rendered location on a wide chart', async () => {
  const points = [11, 12, 13, 14, 15].map((day, index) => ({ date: '2026-09-' + day, value: 73 - index / 10 }));
  const view = await render(<RecentRecord summary={{ from: '2026-09-09', to: '2026-09-15', sleep: { value: null, samples: 0 }, latestWeight: points[4], weightPoints: points }} />);
  await fireEvent(view.getByRole('adjustable'), 'layout', { nativeEvent: { layout: { width: 400, height: 96 } } });
  // Map the second dated point through the actual rendered SVG viewport. The
  // plot and its touch surface share this aspect ratio, so x is not stretched.
  const [plot] = view.getByRole('adjustable').queryAll((node) => typeof node.props.vbWidth === 'number');
  const { vbWidth: svgWidth, vbHeight: svgHeight } = plot.props;
  const scale = Math.min(400 / svgWidth, 96 / svgHeight);
  const locationX = (400 - svgWidth * scale) / 2 + (4 + (svgWidth - 8) / 4) * scale;
  await fireEvent.press(view.getByRole('adjustable'), { nativeEvent: { locationX } });
  expect(view.getByRole('adjustable').props.accessibilityValue.now).toBe(2);
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('72.9 kilograms');
});

it('exposes every dated value and missing gap without requiring chart inspection', async () => {
  const view = await render(<RecentRecord summary={{
    from: '2026-09-09',
    to: '2026-09-15',
    sleep: { value: null, samples: 0 },
    latestWeight: { date: '2026-09-15', value: 72.4 },
    weightPoints: [
      { date: '2026-09-12', value: 73 },
      { date: '2026-09-13', value: null },
      { date: '2026-09-15', value: 72.4 },
    ],
  }} />);

  await fireEvent.press(view.getByRole('button', { name: 'View weight values' }));
  expect(view.getByText(/2026.*No weight reported/)).toBeTruthy();
  expect(view.getAllByText(/2026.*72.4 kg/)).toHaveLength(2);
});
