import { MealPlan } from '../MealPlan';

export default function MealPlanExample() {
  const mockPlan = {
    breakfast: {
      name: 'Oatmeal with Berries & Protein Shake',
      calories: 450,
      protein: 35,
      carbs: 55,
      fats: 12,
    },
    lunch: {
      name: 'Grilled Chicken Breast with Brown Rice & Veggies',
      calories: 650,
      protein: 50,
      carbs: 70,
      fats: 15,
    },
    dinner: {
      name: 'Salmon with Sweet Potato & Asparagus',
      calories: 550,
      protein: 45,
      carbs: 45,
      fats: 20,
    },
    snacks: [
      { name: 'Greek Yogurt with Almonds', calories: 200, protein: 15, carbs: 15, fats: 8 },
      { name: 'Apple with Peanut Butter', calories: 180, protein: 6, carbs: 22, fats: 8 },
    ],
  };

  const totalMacros = {
    calories: 2030,
    protein: 151,
    carbs: 207,
    fats: 63,
  };

  return (
    <div className="p-8 bg-background">
      <MealPlan dailyPlan={mockPlan} totalMacros={totalMacros} />
    </div>
  );
}
