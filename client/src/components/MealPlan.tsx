import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Coffee, Sun, Moon } from "lucide-react";

interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DayMealPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks?: Meal[];
}

interface MealPlanProps {
  dailyPlan: DayMealPlan;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export function MealPlan({ dailyPlan, totalMacros }: MealPlanProps) {
  const renderMeal = (meal: Meal, icon: React.ReactNode, mealType: string) => (
    <div className="p-4 rounded-xl bg-muted/50 space-y-3" data-testid={`meal-${mealType.toLowerCase()}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold">{mealType}</h4>
          <p className="text-sm text-muted-foreground">{meal.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline" className="rounded-full font-poppins">{meal.calories} cal</Badge>
        <span className="text-muted-foreground">P: {meal.protein}g</span>
        <span className="text-muted-foreground">C: {meal.carbs}g</span>
        <span className="text-muted-foreground">F: {meal.fats}g</span>
      </div>
    </div>
  );

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-meal-plan">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Daily Meal Plan</h3>
        <p className="text-sm text-muted-foreground">Your personalized nutrition guide</p>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Daily Totals</h4>
          <Badge className="rounded-full font-poppins">{totalMacros.calories} cal</Badge>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Protein:</span>
            <span className="font-semibold font-poppins">{totalMacros.protein}g</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Carbs:</span>
            <span className="font-semibold font-poppins">{totalMacros.carbs}g</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Fats:</span>
            <span className="font-semibold font-poppins">{totalMacros.fats}g</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {renderMeal(dailyPlan.breakfast, <Coffee className="w-5 h-5 text-primary" />, "Breakfast")}
        {renderMeal(dailyPlan.lunch, <Sun className="w-5 h-5 text-primary" />, "Lunch")}
        {renderMeal(dailyPlan.dinner, <Moon className="w-5 h-5 text-primary" />, "Dinner")}
        
        {dailyPlan.snacks && dailyPlan.snacks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Snacks</h4>
            {dailyPlan.snacks.map((snack, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{snack.name}</span>
                </div>
                <Badge variant="outline" className="rounded-full text-xs">{snack.calories} cal</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
