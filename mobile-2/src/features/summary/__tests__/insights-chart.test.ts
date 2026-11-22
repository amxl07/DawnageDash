import {
  getCalorieBarHeight,
  getCalorieChartMaximum,
  getDatedCalorieAccessibilityLabel,
} from '@/features/summary/insights-chart';

describe('insights chart helpers', () => {
  it('scales against the largest goal or consumed value', () => {
    expect(getCalorieChartMaximum([
      { consumed: 2400, goal: 2000 },
      { consumed: 900, goal: 2200 },
    ])).toBe(2400);
  });

  it('clamps bar heights inside the chart bounds', () => {
    expect(getCalorieBarHeight(-20, 2000, 126)).toBe(8);
    expect(getCalorieBarHeight(4000, 2000, 126)).toBe(126);
  });

  it('describes each day with its date, calories, and goal', () => {
    expect(
      getDatedCalorieAccessibilityLabel('2026-09-01', 2400, 2000, 'en-US'),
    ).toBe('Tuesday, September 1, 2026: 2400 calories; goal 2000 calories');
  });
});
