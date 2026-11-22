import { render } from '@testing-library/react-native';

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
  expect(view.getByText(/Aug.*29|29.*Aug/)).toBeTruthy();
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
