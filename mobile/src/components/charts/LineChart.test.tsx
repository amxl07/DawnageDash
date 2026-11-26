import { Platform, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { LineChart } from './LineChart';
import type { Series } from './types';

jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }),
}));
jest.mock('@/components/ui', () => ({ Text: jest.requireActual('@/components/ui/Text').Text }));

const series: Series[] = [
  {
    name: 'Waist',
    color: '#f00',
    dash: [6, 4],
    data: [
      { date: '2026-07-01', value: 86 },
      { date: '2026-07-22', value: null },
      { date: '2026-08-29', value: 82.5 },
    ],
  },
  {
    name: 'Hips',
    color: '#0f0',
    data: [{ date: '2026-08-29', value: 98 }],
  },
];

it('provides the authored summary and truthful latest values for sparse series', async () => {
  const view = await render(
    <LineChart
      series={series}
      summary="Body measurements by recorded date. Missing values appear as gaps."
      yAxisSuffix=" cm"
    />,
  );

  expect(
    view.getByRole('image', {
      name: 'Body measurements by recorded date. Missing values appear as gaps.',
    }),
  ).toBeTruthy();
  expect(view.getByText('82.5 cm')).toBeTruthy();
  expect(view.getByText('98 cm')).toBeTruthy();
  expect(view.getByText(/Jul.*1|1.*Jul/)).toBeTruthy();
  expect(view.getAllByText(/Aug.*29|29.*Aug/).length).toBeGreaterThan(0);
});

it('keeps a single observation visible rather than claiming more data is required', async () => {
  const view = await render(
    <LineChart
      series={[{ name: 'Waist', color: '#f00', data: [{ date: '2026-08-29', value: 82.5 }] }]}
      summary="One waist measurement."
    />,
  );

  expect(view.getByRole('image', { name: 'One waist measurement.' })).toBeTruthy();
  expect(view.getByText('82.5')).toBeTruthy();
  expect(view.queryByText(/Not enough data/)).toBeNull();
});

it('ignores non-finite values when reporting the latest observation', async () => {
  const view = await render(
    <LineChart
      series={[{
        name: 'Waist',
        color: '#f00',
        data: [
          { date: '2026-08-20', value: 83 },
          { date: '2026-08-29', value: Number.NaN },
        ],
      }]}
      summary="Waist measurements."
      yAxisSuffix=" cm"
    />,
  );

  expect(view.getByText('83 cm')).toBeTruthy();
});


it('lets assistive technology move by actual dates and recovers when a selected date disappears', async () => {
  const view = await render(<LineChart series={series} summary="Recorded measurements" yAxisSuffix=" cm" />);
  await fireEvent(view.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('86 cm');
  await view.rerender(<LineChart series={[{ ...series[0], data: [{ date: '2026-09-10', value: 81 }] }]} summary="Recorded measurements" yAxisSuffix=" cm" />);
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('81 cm');
});
it('preserves the unit of each series in the selected readout', async () => {
  const view = await render(<LineChart summary="Weight and waist" series={[
    { name: 'Weight', unit: 'kg', color: 'red', data: [{ date: '2026-09-24', value: 70 }] },
    { name: 'Waist', unit: 'cm', color: 'blue', data: [{ date: '2026-09-24', value: 81 }] },
  ]} />);
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('Weight: 70 kg');
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('Waist: 81 cm');
});

it('exposes the selected date to web assistive technology and keyboard controls', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  try {
    const view = await render(<LineChart series={series} summary="Recorded measurements" yAxisSuffix=" cm" />);
    expect(view.getByRole('adjustable').props['aria-valuenow']).toBe(2);
    const preventDefault = jest.fn();
    await fireEvent(view.getByRole('adjustable'), 'keyDown', { key: 'ArrowLeft', preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(view.getByRole('adjustable').props['aria-valuenow']).toBe(1);
    expect(view.getByRole('adjustable').props['aria-valuetext']).toContain('86 cm');
    await view.unmount();
  } finally { platform.restore(); }
});

it('uses one custom headline while keeping actual-date selection and chronological values accessible', async () => {
  const view = await render(<LineChart series={series} summary="Recorded measurements" yAxisSuffix=" cm"
    legend={false} renderReadout={(date) => <Text>{`Headline ${date}`}</Text>} />);
  expect(view.getByText('Headline 2026-08-29')).toBeTruthy();
  expect(view.queryByText('Waist: 82.5 cm · Hips: 98 cm')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Previous date' }));
  expect(view.getByText('Headline 2026-07-01')).toBeTruthy();
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('Waist: 86 cm');
  await fireEvent.press(view.getByRole('button', { name: 'All values' }));
  expect(view.getByText(/Waist: 86 cm · Hips: Not reported/)).toBeTruthy();
  expect(view.getByText(/Waist: 82.5 cm · Hips: 98 cm/)).toBeTruthy();
});

it('starts on the preferred recorded date and keeps comparison legend names without latest values', async () => {
  const view = await render(<LineChart series={series} summary="Recorded measurements" yAxisSuffix=" cm"
    defaultSelectedDate="2026-07-01" legend="names" />);
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('Waist: 86 cm');
  expect(view.getByText('Waist')).toBeTruthy();
  expect(view.getByText('Hips')).toBeTruthy();
  expect(view.queryByText('82.5 cm')).toBeNull();
  expect(view.queryByText('98 cm')).toBeNull();
});

it('includes the custom headline comparison in the accessible selected value', async () => {
  const view = await render(<LineChart series={series} summary="Recorded measurements"
    readoutDescription={(date) => date === '2026-08-29' ? 'Recorded 29 Aug 2026. Down 3.5 cm from 1 Jul 2026.' : 'Recorded 1 Jul 2026. First recorded value in this range.'} />);
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('Down 3.5 cm from 1 Jul 2026');
  await fireEvent.press(view.getByRole('button', { name: 'Previous date' }));
  expect(view.getByRole('adjustable').props.accessibilityValue.text).toContain('First recorded value in this range');
});
