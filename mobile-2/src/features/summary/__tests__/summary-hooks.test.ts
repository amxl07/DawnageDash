import type { DailySummary } from '@/domain/models';
import {
  dailySummaryQueryKey,
  getSummaryCalorieStatus,
} from '@/features/summary/summary-hooks';

describe('summary helpers', () => {
  it('reports an empty day as all calories remaining', () => {
    const summary: DailySummary = {
      calories: { consumed: 0, goal: 2200 },
      date: '2026-09-01',
      macroGoals: { carbohydrates: 275, fat: 70, protein: 160 },
      macros: { carbohydrates: 0, fat: 0, protein: 0 },
      meals: [],
    };

    expect(getSummaryCalorieStatus(summary)).toEqual({
      goal: 2200,
      isOverGoal: false,
      remaining: 2200,
    });
  });

  it('reports over-goal calories without a negative remaining value', () => {
    const summary: DailySummary = {
      calories: { consumed: 2460, goal: 2200 },
      date: '2026-09-01',
      macroGoals: { carbohydrates: 275, fat: 70, protein: 160 },
      macros: { carbohydrates: 0, fat: 0, protein: 0 },
      meals: [],
    };

    expect(getSummaryCalorieStatus(summary)).toEqual({
      goal: 2200,
      isOverGoal: true,
      remaining: 0,
    });
  });

  it('keeps query cache keys isolated by date', () => {
    expect(dailySummaryQueryKey('2026-09-01')).toEqual(['daily-summary', '2026-09-01']);
    expect(dailySummaryQueryKey('2026-09-02')).toEqual(['daily-summary', '2026-09-02']);
    expect(dailySummaryQueryKey('2026-09-01')).not.toEqual(dailySummaryQueryKey('2026-09-02'));
  });
});
