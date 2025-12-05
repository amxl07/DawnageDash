import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Utensils, Coffee, Sun, Moon, Edit2, Save, X, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Snack {
  id: string;
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
  snacks: Snack[];
}

interface EditableMealPlanProps {
  initialPlan: DayMealPlan;
  day?: string;
  onSave?: (plan: DayMealPlan) => void;
}

export function EditableMealPlan({ initialPlan, day = "Monday", onSave }: EditableMealPlanProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<DayMealPlan>(initialPlan);

  const calculateTotals = () => {
    const meals = [mealPlan.breakfast, mealPlan.lunch, mealPlan.dinner];
    const allItems = [...meals, ...mealPlan.snacks];

    return {
      calories: allItems.reduce((sum, item) => sum + item.calories, 0),
      protein: allItems.reduce((sum, item) => sum + item.protein, 0),
      carbs: allItems.reduce((sum, item) => sum + item.carbs, 0),
      fats: allItems.reduce((sum, item) => sum + item.fats, 0),
    };
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Delete existing meals for this day
      const { error: deleteError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('day_of_week', day);

      if (deleteError) throw deleteError;

      // 2. Prepare new rows
      const rows = [];

      // Breakfast
      rows.push({
        user_id: user.id,
        day_of_week: day,
        meal_type: 'Breakfast',
        description: mealPlan.breakfast.name,
        calories: mealPlan.breakfast.calories,
        protein: mealPlan.breakfast.protein,
        carbs: mealPlan.breakfast.carbs,
        fats: mealPlan.breakfast.fats,
      });

      // Lunch
      rows.push({
        user_id: user.id,
        day_of_week: day,
        meal_type: 'Lunch',
        description: mealPlan.lunch.name,
        calories: mealPlan.lunch.calories,
        protein: mealPlan.lunch.protein,
        carbs: mealPlan.lunch.carbs,
        fats: mealPlan.lunch.fats,
      });

      // Dinner
      rows.push({
        user_id: user.id,
        day_of_week: day,
        meal_type: 'Dinner',
        description: mealPlan.dinner.name,
        calories: mealPlan.dinner.calories,
        protein: mealPlan.dinner.protein,
        carbs: mealPlan.dinner.carbs,
        fats: mealPlan.dinner.fats,
      });

      // Snacks
      mealPlan.snacks.forEach(snack => {
        rows.push({
          user_id: user.id,
          day_of_week: day,
          meal_type: 'Snacks',
          description: snack.name,
          calories: snack.calories,
          protein: snack.protein,
          carbs: snack.carbs,
          fats: snack.fats,
        });
      });

      // 3. Insert new rows
      const { error: insertError } = await supabase
        .from('meal_plans')
        .insert(rows);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Meal plan saved successfully!",
      });

      onSave?.(mealPlan);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save meal plan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMealPlan(initialPlan);
    setIsEditing(false);
  };

  const updateMeal = (mealType: 'breakfast' | 'lunch' | 'dinner', field: keyof Meal, value: string | number) => {
    setMealPlan(plan => ({
      ...plan,
      [mealType]: {
        ...plan[mealType],
        [field]: value,
      },
    }));
  };

  const updateSnack = (snackId: string, field: keyof Snack, value: string | number) => {
    setMealPlan(plan => ({
      ...plan,
      snacks: plan.snacks.map(snack =>
        snack.id === snackId ? { ...snack, [field]: value } : snack
      ),
    }));
  };

  const addSnack = () => {
    setMealPlan(plan => ({
      ...plan,
      snacks: [
        ...plan.snacks,
        { id: `snack-${Date.now()}`, name: 'New Snack', calories: 100, protein: 5, carbs: 10, fats: 3 },
      ],
    }));
  };

  const removeSnack = (snackId: string) => {
    setMealPlan(plan => ({
      ...plan,
      snacks: plan.snacks.filter(snack => snack.id !== snackId),
    }));
  };

  const renderMeal = (
    meal: Meal,
    icon: React.ReactNode,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    label: string
  ) => (
    <div className="p-4 rounded-xl bg-muted/50 space-y-3" data-testid={`meal-${mealType}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{label}</h4>
          {isEditing ? (
            <Input
              value={meal.name}
              onChange={(e) => updateMeal(mealType, 'name', e.target.value)}
              className="rounded-lg mt-1"
              placeholder="Meal description"
              data-testid={`input-${mealType}-name`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{meal.name}</p>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Calories</label>
            <Input
              type="number"
              value={meal.calories}
              onChange={(e) => updateMeal(mealType, 'calories', parseInt(e.target.value))}
              className="rounded-lg"
              data-testid={`input-${mealType}-calories`}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Protein (g)</label>
            <Input
              type="number"
              value={meal.protein}
              onChange={(e) => updateMeal(mealType, 'protein', parseInt(e.target.value))}
              className="rounded-lg"
              data-testid={`input-${mealType}-protein`}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Carbs (g)</label>
            <Input
              type="number"
              value={meal.carbs}
              onChange={(e) => updateMeal(mealType, 'carbs', parseInt(e.target.value))}
              className="rounded-lg"
              data-testid={`input-${mealType}-carbs`}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fats (g)</label>
            <Input
              type="number"
              value={meal.fats}
              onChange={(e) => updateMeal(mealType, 'fats', parseInt(e.target.value))}
              className="rounded-lg"
              data-testid={`input-${mealType}-fats`}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="rounded-full font-poppins">{meal.calories} cal</Badge>
          <span className="text-muted-foreground">P: {meal.protein}g</span>
          <span className="text-muted-foreground">C: {meal.carbs}g</span>
          <span className="text-muted-foreground">F: {meal.fats}g</span>
        </div>
      )}
    </div>
  );

  const totalMacros = calculateTotals();

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-meal-plan">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Daily Meal Plan</h3>
          <p className="text-sm text-muted-foreground">Your personalized nutrition guide</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="rounded-xl"
                data-testid="button-cancel-edit-meal"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-xl" data-testid="button-save-meal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="rounded-xl"
              data-testid="button-edit-meal"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Plan
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Editing Mode Active - Modify macros and meal descriptions
          </p>
        </div>
      )}

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
        {renderMeal(mealPlan.breakfast, <Coffee className="w-5 h-5 text-primary" />, "breakfast", "Breakfast")}
        {renderMeal(mealPlan.lunch, <Sun className="w-5 h-5 text-primary" />, "lunch", "Lunch")}
        {renderMeal(mealPlan.dinner, <Moon className="w-5 h-5 text-primary" />, "dinner", "Dinner")}

        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Snacks</h4>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addSnack}
                className="rounded-lg"
                data-testid="button-add-snack"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Snack
              </Button>
            )}
          </div>

          {mealPlan.snacks.map((snack) => (
            <div key={snack.id} className="p-3 rounded-lg bg-muted/30">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={snack.name}
                      onChange={(e) => updateSnack(snack.id, 'name', e.target.value)}
                      className="rounded-lg flex-1"
                      placeholder="Snack name"
                      data-testid={`input-snack-name-${snack.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSnack(snack.id)}
                      className="rounded-lg text-destructive hover:text-destructive"
                      data-testid={`button-remove-snack-${snack.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      value={snack.calories}
                      onChange={(e) => updateSnack(snack.id, 'calories', parseInt(e.target.value))}
                      className="rounded-lg"
                      placeholder="Calories"
                      data-testid={`input-snack-calories-${snack.id}`}
                    />
                    <Input
                      type="number"
                      value={snack.protein}
                      onChange={(e) => updateSnack(snack.id, 'protein', parseInt(e.target.value))}
                      className="rounded-lg"
                      placeholder="Protein"
                      data-testid={`input-snack-protein-${snack.id}`}
                    />
                    <Input
                      type="number"
                      value={snack.carbs}
                      onChange={(e) => updateSnack(snack.id, 'carbs', parseInt(e.target.value))}
                      className="rounded-lg"
                      placeholder="Carbs"
                      data-testid={`input-snack-carbs-${snack.id}`}
                    />
                    <Input
                      type="number"
                      value={snack.fats}
                      onChange={(e) => updateSnack(snack.id, 'fats', parseInt(e.target.value))}
                      className="rounded-lg"
                      placeholder="Fats"
                      data-testid={`input-snack-fats-${snack.id}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{snack.name}</span>
                  </div>
                  <Badge variant="outline" className="rounded-full text-xs">{snack.calories} cal</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
