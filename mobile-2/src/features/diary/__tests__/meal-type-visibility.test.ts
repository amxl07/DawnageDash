import type { MealType } from '@/domain/models';
import {
  getDiaryMealTypes,
  getQuickLogMealTypes,
  resolveSelectedMealTypeId,
} from '@/features/diary/meal-type-visibility';

const mealTypes: MealType[] = [
  { id: 'breakfast', isVisible: true, name: 'Breakfast', showInQuickLog: true },
  { id: 'lunch', isVisible: true, name: 'Lunch', showInQuickLog: false },
  { id: 'hidden', isVisible: false, name: 'Hidden', showInQuickLog: true },
];

describe('meal type visibility', () => {
  it('keeps hidden meal types out of the diary', () => {
    expect(getDiaryMealTypes(mealTypes).map((meal) => meal.id)).toEqual([
      'breakfast',
      'lunch',
    ]);
  });

  it('keeps hidden and quick-log-disabled meal types out of Add', () => {
    expect(getQuickLogMealTypes(mealTypes).map((meal) => meal.id)).toEqual([
      'breakfast',
    ]);
  });

  it('defaults to the first available quick-log meal when selection is unavailable', () => {
    expect(resolveSelectedMealTypeId('', getQuickLogMealTypes(mealTypes))).toBe(
      'breakfast',
    );
    expect(resolveSelectedMealTypeId('lunch', getQuickLogMealTypes(mealTypes))).toBe(
      'breakfast',
    );
  });
});
