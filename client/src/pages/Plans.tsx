import { EditableWorkoutPlan } from "@/components/EditableWorkoutPlan";
import { EditableMealPlan } from "@/components/EditableMealPlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Plans() {
  // TODO: Remove mock data - fetch from Supabase
  const workoutPlan = [
    {
      id: 'day-1',
      day: 'Monday',
      focus: 'Chest & Triceps',
      exercises: [
        { id: 'ex-1', name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { id: 'ex-2', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
        { id: 'ex-3', name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '60s' },
        { id: 'ex-4', name: 'Tricep Dips', sets: 3, reps: '10-12', rest: '60s' },
        { id: 'ex-5', name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      id: 'day-2',
      day: 'Tuesday',
      focus: 'Cardio & Core',
      exercises: [
        { id: 'ex-6', name: 'Treadmill Run', sets: 1, reps: '30 min', rest: '-' },
        { id: 'ex-7', name: 'Plank Hold', sets: 3, reps: '60s', rest: '30s' },
        { id: 'ex-8', name: 'Russian Twists', sets: 3, reps: '20', rest: '30s' },
        { id: 'ex-9', name: 'Leg Raises', sets: 3, reps: '15', rest: '30s' },
      ],
    },
    {
      id: 'day-3',
      day: 'Wednesday',
      focus: 'Back & Biceps',
      exercises: [
        { id: 'ex-10', name: 'Deadlifts', sets: 4, reps: '6-8', rest: '120s' },
        { id: 'ex-11', name: 'Pull-ups', sets: 3, reps: '8-10', rest: '90s' },
        { id: 'ex-12', name: 'Barbell Rows', sets: 3, reps: '10-12', rest: '60s' },
        { id: 'ex-13', name: 'Face Pulls', sets: 3, reps: '15', rest: '60s' },
        { id: 'ex-14', name: 'Bicep Curls', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      id: 'day-4',
      day: 'Thursday',
      focus: 'Rest Day',
      exercises: [
        { id: 'ex-15', name: 'Light Stretching', sets: 1, reps: '15 min', rest: '-' },
        { id: 'ex-16', name: 'Walking', sets: 1, reps: '30 min', rest: '-' },
      ],
    },
    {
      id: 'day-5',
      day: 'Friday',
      focus: 'Legs & Shoulders',
      exercises: [
        { id: 'ex-17', name: 'Squats', sets: 4, reps: '8-10', rest: '120s' },
        { id: 'ex-18', name: 'Leg Press', sets: 3, reps: '12-15', rest: '90s' },
        { id: 'ex-19', name: 'Romanian Deadlifts', sets: 3, reps: '10-12', rest: '90s' },
        { id: 'ex-20', name: 'Overhead Press', sets: 4, reps: '8-10', rest: '90s' },
        { id: 'ex-21', name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      id: 'day-6',
      day: 'Saturday',
      focus: 'Full Body Circuit',
      exercises: [
        { id: 'ex-22', name: 'Burpees', sets: 3, reps: '15', rest: '45s' },
        { id: 'ex-23', name: 'Kettlebell Swings', sets: 3, reps: '20', rest: '45s' },
        { id: 'ex-24', name: 'Box Jumps', sets: 3, reps: '12', rest: '45s' },
        { id: 'ex-25', name: 'Battle Ropes', sets: 3, reps: '30s', rest: '45s' },
      ],
    },
    {
      id: 'day-7',
      day: 'Sunday',
      focus: 'Active Recovery',
      exercises: [
        { id: 'ex-26', name: 'Yoga Flow', sets: 1, reps: '30 min', rest: '-' },
        { id: 'ex-27', name: 'Light Cycling', sets: 1, reps: '20 min', rest: '-' },
      ],
    },
  ];

  // TODO: Remove mock data - fetch from Supabase
  const mealPlan = {
    breakfast: {
      id: 'meal-1',
      name: 'Oatmeal with Berries & Protein Shake',
      calories: 450,
      protein: 35,
      carbs: 55,
      fats: 12,
    },
    lunch: {
      id: 'meal-2',
      name: 'Grilled Chicken Breast with Brown Rice & Veggies',
      calories: 650,
      protein: 50,
      carbs: 70,
      fats: 15,
    },
    dinner: {
      id: 'meal-3',
      name: 'Salmon with Sweet Potato & Asparagus',
      calories: 550,
      protein: 45,
      carbs: 45,
      fats: 20,
    },
    snacks: [
      { id: 'snack-1', name: 'Greek Yogurt with Almonds', calories: 200, protein: 15, carbs: 15, fats: 8 },
      { id: 'snack-2', name: 'Apple with Peanut Butter', calories: 180, protein: 6, carbs: 22, fats: 8 },
    ],
  };

  const handleWorkoutSave = (plan: any) => {
    // TODO: Remove mock functionality - save to Supabase
    console.log('Workout plan would be saved to Supabase:', plan);
  };

  const handleMealSave = (plan: typeof mealPlan) => {
    // TODO: Remove mock functionality - save to Supabase
    console.log('Meal plan would be saved to Supabase:', plan);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-plans-title">Training & Nutrition Plans</h1>
        <p className="text-muted-foreground">Your personalized workout and meal plans - fully customizable and synced to database</p>
      </div>

      <Tabs defaultValue="workout" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="workout" data-testid="tab-workout">Workout Plan</TabsTrigger>
          <TabsTrigger value="meal" data-testid="tab-meal">Meal Plan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workout">
          <EditableWorkoutPlan initialPlan={workoutPlan} onSave={handleWorkoutSave} />
        </TabsContent>
        
        <TabsContent value="meal">
          <EditableMealPlan initialPlan={mealPlan} onSave={handleMealSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
