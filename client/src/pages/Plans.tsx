import { useState } from "react";
import { WorkoutPlan } from "@/components/WorkoutPlan";
import { MealPlan } from "@/components/MealPlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Plans() {
  const workoutPlan = [
    {
      day: 'Monday',
      focus: 'Chest & Triceps',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Tricep Dips', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      day: 'Tuesday',
      focus: 'Cardio & Core',
      exercises: [
        { name: 'Treadmill Run', sets: 1, reps: '30 min', rest: '-' },
        { name: 'Plank Hold', sets: 3, reps: '60s', rest: '30s' },
        { name: 'Russian Twists', sets: 3, reps: '20', rest: '30s' },
        { name: 'Leg Raises', sets: 3, reps: '15', rest: '30s' },
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Back & Biceps',
      exercises: [
        { name: 'Deadlifts', sets: 4, reps: '6-8', rest: '120s' },
        { name: 'Pull-ups', sets: 3, reps: '8-10', rest: '90s' },
        { name: 'Barbell Rows', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Face Pulls', sets: 3, reps: '15', rest: '60s' },
        { name: 'Bicep Curls', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      day: 'Thursday',
      focus: 'Rest Day',
      exercises: [
        { name: 'Light Stretching', sets: 1, reps: '15 min', rest: '-' },
        { name: 'Walking', sets: 1, reps: '30 min', rest: '-' },
      ],
    },
    {
      day: 'Friday',
      focus: 'Legs & Shoulders',
      exercises: [
        { name: 'Squats', sets: 4, reps: '8-10', rest: '120s' },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest: '90s' },
        { name: 'Romanian Deadlifts', sets: 3, reps: '10-12', rest: '90s' },
        { name: 'Overhead Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      day: 'Saturday',
      focus: 'Full Body Circuit',
      exercises: [
        { name: 'Burpees', sets: 3, reps: '15', rest: '45s' },
        { name: 'Kettlebell Swings', sets: 3, reps: '20', rest: '45s' },
        { name: 'Box Jumps', sets: 3, reps: '12', rest: '45s' },
        { name: 'Battle Ropes', sets: 3, reps: '30s', rest: '45s' },
      ],
    },
    {
      day: 'Sunday',
      focus: 'Active Recovery',
      exercises: [
        { name: 'Yoga Flow', sets: 1, reps: '30 min', rest: '-' },
        { name: 'Light Cycling', sets: 1, reps: '20 min', rest: '-' },
      ],
    },
  ];

  const mealPlan = {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-plans-title">Training & Nutrition Plans</h1>
        <p className="text-muted-foreground">Your personalized workout and meal plans designed for optimal results</p>
      </div>

      <Tabs defaultValue="workout" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="workout" data-testid="tab-workout">Workout Plan</TabsTrigger>
          <TabsTrigger value="meal" data-testid="tab-meal">Meal Plan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workout">
          <WorkoutPlan weeklyPlan={workoutPlan} />
        </TabsContent>
        
        <TabsContent value="meal">
          <MealPlan dailyPlan={mealPlan} totalMacros={totalMacros} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
