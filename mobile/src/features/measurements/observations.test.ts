import type { BodyMeasurement } from '@/types/db';
import {
  buildMeasurementSeries,
  buildMeasurementChartSeries,
  measurementComparison,
  parseMeasurementObservation,
} from './observations';

const row = (
  id: string,
  date: string,
  waist: BodyMeasurement['waist'],
): BodyMeasurement => ({
  id,
  user_id: 'user-1',
  date,
  chest: null,
  waist,
  hips: null,
  thighs: null,
  arms: null,
});

describe('measurement observations', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['not-a-number', null],
    [0, null],
    [19.9, null],
    [250.1, null],
    ['20', 20],
    [82.5, 82.5],
    ['250', 250],
  ])('keeps %p distinct from a valid measurement', (input, expected) => {
    expect(parseMeasurementObservation(input)).toBe(expected);
  });

  it('keeps actual dates, missing gaps, and the first same-day source row', () => {
    const series = buildMeasurementSeries(
      [
        row('latest', '2026-09-15', 81),
        row('same-day-older', '2026-09-15', 82),
        row('missing', '2026-09-08', null),
        row('baseline', '2026-08-18', '86'),
      ],
      'waist',
    );

    expect(series).toEqual([
      { date: '2026-08-18', value: 86 },
      { date: '2026-09-08', value: null },
      { date: '2026-09-15', value: 81 },
    ]);
  });

  it('carries the field identity and unit with chart observations', () => {
    expect(
      buildMeasurementChartSeries([row('waist', '2026-09-15', 81)], {
        field: 'waist',
        name: 'Waist',
        color: '#f00',
        dash: [6, 4],
      }),
    ).toEqual({
      id: 'waist',
      name: 'Waist',
      unit: 'cm',
      color: '#f00',
      dash: [6, 4],
      data: [{ date: '2026-09-15', value: 81 }],
    });
  });

  it('handles empty and one-point series without inventing a baseline', () => {
    expect(buildMeasurementSeries([], 'waist')).toEqual([]);
    expect(measurementComparison([row('only', '2026-09-15', 81)], 'waist')).toEqual({
      baseline: null,
      latest: { date: '2026-09-15', value: 81 },
      delta: null,
    });
  });

  it('compares the first and last valid field values rather than whole rows', () => {
    expect(
      measurementComparison(
        [
          row('latest-row-missing', '2026-09-15', null),
          row('latest-waist', '2026-09-08', 82.5),
          row('baseline-waist', '2026-07-01', 86),
          row('oldest-row-missing', '2026-06-01', null),
        ],
        'waist',
      ),
    ).toEqual({
      baseline: { date: '2026-07-01', value: 86 },
      latest: { date: '2026-09-08', value: 82.5 },
      delta: -3.5,
    });
  });
});
