import { useState } from "react";
import { EditableWorkoutPlan } from "@/components/EditableWorkoutPlan";
import { EditableMealPlan } from "@/components/EditableMealPlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Dumbbell, UtensilsCrossed } from "lucide-react";

type FitnessLevel = 'Beginner' | 'Intermediate' | 'Professional';

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Plans() {
  const { user } = useAuth();
  const [workoutLevel, setWorkoutLevel] = useState<FitnessLevel>('Beginner');
  const [mealLevel, setMealLevel] = useState<FitnessLevel>('Beginner');
  const [selectedMealDay, setSelectedMealDay] = useState("Monday");

  const { data: workoutPlans, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ['workoutPlans', user?.id, workoutLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', workoutLevel);

      if (error) throw error;

      const plans = data.map(plan => ({
        id: plan.id,
        day: plan.day_of_week,
        focus: plan.focus || '',
        exercises: plan.exercises ? JSON.parse(plan.exercises) : [],
      }));

      return plans.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
    },
    enabled: !!user,
  });

  const { data: mealPlans, isLoading: isLoadingMeals } = useQuery({
    queryKey: ['mealPlans', user?.id, mealLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', mealLevel);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getDayMealPlan = (day: string) => {
    const dayMeals = mealPlans?.filter(m => m.day_of_week === day) || [];

    const getMeal = (type: string) => {
      const meal = dayMeals.find(m => m.meal_type === type);
      return {
        id: meal?.id || `new-${type}`,
        name: meal?.description || '',
        calories: meal?.calories || 0,
        protein: parseFloat(meal?.protein || '0'),
        carbs: parseFloat(meal?.carbs || '0'),
        fats: parseFloat(meal?.fats || '0'),
      };
    };

    const snacks = dayMeals
      .filter(m => m.meal_type === 'Snacks')
      .map(s => ({
        id: s.id,
        name: s.description || '',
        calories: s.calories || 0,
        protein: parseFloat(s.protein || '0'),
        carbs: parseFloat(s.carbs || '0'),
        fats: parseFloat(s.fats || '0'),
      }));

    return {
      breakfast: getMeal('Breakfast'),
      lunch: getMeal('Lunch'),
      dinner: getMeal('Dinner'),
      snacks: snacks,
    };
  };

  const currentMealPlan = getDayMealPlan(selectedMealDay);

  if (isLoadingWorkouts || isLoadingMeals) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultWorkoutPlan = dayOrder.map((day, index) => ({
    id: `default-${index}`,
    day: day,
    focus: '',
    exercises: []
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-plans-title">
          Training & Nutrition Plans
        </h1>
        <p className="text-muted-foreground">Personalized workout and meal plans for your fitness journey</p>
      </div>

      <Tabs defaultValue="workout" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="workout" data-testid="tab-workout" className="text-base">
            <Dumbbell className="w-4 h-4 mr-2" />
            Workout Plan
          </TabsTrigger>
          <TabsTrigger value="meal" data-testid="tab-meal" className="text-base">
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Meal Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workout" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Workout Level</h3>
                <p className="text-sm text-muted-foreground">Select your training intensity</p>
              </div>
              <Select value={workoutLevel} onValueChange={(value) => setWorkoutLevel(value as FitnessLevel)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <EditableWorkoutPlan
            initialPlan={workoutPlans && workoutPlans.length > 0 ? workoutPlans : defaultWorkoutPlan}
            level={workoutLevel}
          />
        </TabsContent>

        <TabsContent value="meal" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Nutrition Level</h3>
                <p className="text-sm text-muted-foreground">Select your calorie target</p>
              </div>
              <Select value={mealLevel} onValueChange={(value) => setMealLevel(value as FitnessLevel)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {dayOrder.map((day) => (
              <Button
                key={day}
                variant={selectedMealDay === day ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMealDay(day)}
                className="rounded-lg"
              >
                {day}
              </Button>
            ))}
          </div>

          <EditableMealPlan
            key={selectedMealDay}
            initialPlan={currentMealPlan}
            day={selectedMealDay}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
