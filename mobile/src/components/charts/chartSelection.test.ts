import { claimsChartGesture, nearestPlotDate } from './chartSelection';

it('selects the closest real observation rather than a uniformly spaced index', () => {
  const points = [{ date: '2026-09-01', x: 10 }, { date: '2026-09-02', x: 20 }, { date: '2026-09-24', x: 260 }];
  expect(nearestPlotDate(points, 90)).toBe('2026-09-02');
  expect(nearestPlotDate(points, 230)).toBe('2026-09-24');
});
it('handles no data, one observation, and invalid touch coordinates', () => {
  expect(nearestPlotDate([], 40)).toBeNull();
  expect(nearestPlotDate([{ date: '2026-09-24', x: 140 }], 10)).toBe('2026-09-24');
  expect(nearestPlotDate([{ date: '2026-09-24', x: 140 }], NaN)).toBeNull();
});
it('leaves vertical and diagonal movement with the page', () => {
  expect(claimsChartGesture(20, 3)).toBe(true);
  expect(claimsChartGesture(3, 20)).toBe(false);
  expect(claimsChartGesture(20, 20)).toBe(false);
  expect(claimsChartGesture(4, 2)).toBe(false);
});
