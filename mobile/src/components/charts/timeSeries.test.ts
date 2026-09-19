import { buildTimeSeriesGeometry, nearestDatedPointIndex } from './timeSeries';

describe('time-series geometry', () => {
  it('positions irregular observations by elapsed date and breaks paths at missing values', () => {
    const geometry = buildTimeSeriesGeometry(
      [
        { date: '2026-01-01', value: 80 },
        { date: '2026-01-02', value: 79 },
        { date: '2026-01-08', value: null },
        { date: '2026-01-11', value: 78 },
      ],
      { width: 110, height: 60, insetX: 5, insetY: 5, min: 78, max: 80 },
    );

    expect(geometry.points.map((point) => point.x)).toEqual([5, 15, 105]);
    expect(geometry.segments).toHaveLength(2);
    expect(geometry.segments[0]?.map((point) => point.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
    ]);
    expect(geometry.segments[1]?.map((point) => point.date)).toEqual(['2026-01-11']);
  });

  it('keeps a one-point series inspectable and an empty series empty', () => {
    expect(
      buildTimeSeriesGeometry([{ date: '2026-01-01', value: 82 }], {
        width: 110,
        height: 60,
        insetX: 5,
        insetY: 5,
        min: 82,
        max: 82,
      }).points,
    ).toEqual([{ date: '2026-01-01', value: 82, x: 55, y: 30 }]);
    expect(
      buildTimeSeriesGeometry([], {
        width: 110,
        height: 60,
        insetX: 5,
        insetY: 5,
        min: 0,
        max: 1,
      }),
    ).toEqual({ points: [], segments: [] });
  });

  it('selects the nearest real observation from dated positions', () => {
    const points = [
      { date: '2026-01-01', value: 80, x: 5, y: 5 },
      { date: '2026-01-02', value: 79, x: 15, y: 30 },
      { date: '2026-01-11', value: 78, x: 105, y: 55 },
    ];
    expect(nearestDatedPointIndex(points, 60)).toBe(1);
    expect(nearestDatedPointIndex(points, 61)).toBe(2);
  });

  it('aligns the same date across series with different coverage', () => {
    const bounds = {
      width: 110,
      height: 60,
      insetX: 5,
      insetY: 5,
      min: 70,
      max: 90,
      fromDate: '2026-01-01',
      toDate: '2026-01-11',
    };
    const longer = buildTimeSeriesGeometry([
      { date: '2026-01-01', value: 90 },
      { date: '2026-01-06', value: 80 },
      { date: '2026-01-11', value: 70 },
    ], bounds);
    const shorter = buildTimeSeriesGeometry([
      { date: '2026-01-06', value: 82 },
      { date: '2026-01-11', value: 72 },
    ], bounds);

    expect(longer.points[1]?.x).toBe(55);
    expect(shorter.points[0]?.x).toBe(55);
  });
});
