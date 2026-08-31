import type { MealType } from '@/domain/models';

export function getDiaryMealTypes(mealTypes: MealType[]): MealType[] {
  return mealTypes.filter((mealType) => mealType.isVisible);
}

export function getQuickLogMealTypes(mealTypes: MealType[]): MealType[] {
  return mealTypes.filter(
    (mealType) => mealType.isVisible && mealType.showInQuickLog,
  );
}

export function resolveSelectedMealTypeId(
  selectedMealTypeId: string,
  mealTypes: MealType[],
): string {
  return mealTypes.some((mealType) => mealType.id === selectedMealTypeId)
    ? selectedMealTypeId
    : (mealTypes[0]?.id ?? '');
}
