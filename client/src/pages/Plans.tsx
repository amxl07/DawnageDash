import { useState, useMemo } from "react";
import { EditableWorkoutPlan } from "@/components/EditableWorkoutPlan";
import { EditableMealPlan } from "@/components/EditableMealPlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Dumbbell, UtensilsCrossed } from "lucide-react";

// Types for hierarchical structure
type Level = 'Beginner' | 'Intermediate' | 'Advanced';
type WorkoutType = 'GYM_WORKOUT' | 'HOME_WORKOUT' | 'ADVANCE_CALISTHENICS' | 'POWERBUILDING' | 'CALIS_COMPOUND_LIFTS';
type SubCategory = '0_EXPERIENCE' | '6_MONTH_EXPERIENCE' | 'JUST_BODYWEIGHT' | 'JUST_DBS' | 'JUST_RINGS' | 'DBS_RINGS' | 'PHASE_1' | 'PHASE_2' | null;
type FitnessLevel = 'Beginner' | 'Intermediate' | 'Professional';

// Hierarchy configuration type
type WorkoutConfig = { subCategories: SubCategory[] | null; daysOptions: number[] };

// Hierarchy configuration
const WORKOUT_HIERARCHY: Record<Level, Partial<Record<WorkoutType, WorkoutConfig>>> = {
  Beginner: {
    GYM_WORKOUT: {
      subCategories: ['0_EXPERIENCE', '6_MONTH_EXPERIENCE'],
      daysOptions: [], // Days depend on sub-category
    },
    HOME_WORKOUT: {
      subCategories: ['JUST_BODYWEIGHT', 'JUST_DBS', 'JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [3, 4],
    },
  },
  Intermediate: {
    GYM_WORKOUT: {
      subCategories: null,
      daysOptions: [3, 4, 5],
    },
    HOME_WORKOUT: {
      subCategories: ['JUST_BODYWEIGHT', 'JUST_DBS', 'JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [4, 5],
    },
  },
  Advanced: {
    ADVANCE_CALISTHENICS: {
      subCategories: ['JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [4, 5],
    },
    POWERBUILDING: {
      subCategories: null,
      daysOptions: [3, 4, 5, 6],
    },
    CALIS_COMPOUND_LIFTS: {
      subCategories: ['PHASE_1', 'PHASE_2'],
      daysOptions: [5, 6],
    },
  },
};

// Beginner GYM sub-category specific days
const BEGINNER_GYM_DAYS: Record<string, number[]> = {
  '0_EXPERIENCE': [3, 4],
  '6_MONTH_EXPERIENCE': [4, 5],
};

// Display names for nice UI
const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  GYM_WORKOUT: 'Gym Workout',
  HOME_WORKOUT: 'Home Workout',
  ADVANCE_CALISTHENICS: 'Advanced Calisthenics',
  POWERBUILDING: 'Powerbuilding',
  CALIS_COMPOUND_LIFTS: 'Calisthenics + Compound Lifts',
};

const SUB_CATEGORY_LABELS: Record<string, string> = {
  '0_EXPERIENCE': '0 Experience',
  '6_MONTH_EXPERIENCE': '6-Month Experience',
  'JUST_BODYWEIGHT': 'Just Bodyweight',
  'JUST_DBS': 'Just Dumbbells',
  'JUST_RINGS': 'Just Rings',
  'DBS_RINGS': 'Dumbbells + Rings',
  'PHASE_1': 'Phase 1',
  'PHASE_2': 'Phase 2',
};

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Plans() {
  const { user } = useAuth();

  // Workout hierarchy state
  const [level, setLevel] = useState<Level>('Beginner');
  const [workoutType, setWorkoutType] = useState<WorkoutType | ''>('');
  const [subCategory, setSubCategory] = useState<SubCategory | ''>('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | ''>('');

  // Meal plan state
  const [mealLevel, setMealLevel] = useState<FitnessLevel>('Beginner');
  const [selectedMealDay, setSelectedMealDay] = useState("Monday");

  // Get available workout types for selected level
  const availableWorkoutTypes = useMemo(() => {
    return Object.keys(WORKOUT_HIERARCHY[level] || {}) as WorkoutType[];
  }, [level]);

  // Get available sub-categories for selected workout type
  const availableSubCategories = useMemo(() => {
    if (!workoutType) return [];
    const config = WORKOUT_HIERARCHY[level]?.[workoutType];
    return config?.subCategories || [];
  }, [level, workoutType]);

  // Get available days options
  const availableDaysOptions = useMemo(() => {
    if (!workoutType) return [];
    const config = WORKOUT_HIERARCHY[level]?.[workoutType];

    // Special case for Beginner GYM_WORKOUT
    if (level === 'Beginner' && workoutType === 'GYM_WORKOUT' && subCategory) {
      return BEGINNER_GYM_DAYS[subCategory] || [];
    }

    return config?.daysOptions || [];
  }, [level, workoutType, subCategory]);

  // Check if sub-category is needed
  const needsSubCategory = useMemo(() => {
    if (!workoutType) return false;
    const config = WORKOUT_HIERARCHY[level]?.[workoutType];
    return config?.subCategories !== null && (config?.subCategories?.length ?? 0) > 0;
  }, [level, workoutType]);

  // Reset dependent selections when parent changes
  const handleLevelChange = (newLevel: Level) => {
    setLevel(newLevel);
    setWorkoutType('');
    setSubCategory('');
    setDaysPerWeek('');
  };

  const handleWorkoutTypeChange = (newType: WorkoutType) => {
    setWorkoutType(newType);
    setSubCategory('');
    setDaysPerWeek('');
  };

  const handleSubCategoryChange = (newSubCat: SubCategory) => {
    setSubCategory(newSubCat);
    setDaysPerWeek('');
  };

  // Check if all selections are complete
  const isSelectionComplete = useMemo(() => {
    if (!workoutType || !daysPerWeek) return false;
    if (needsSubCategory && !subCategory) return false;
    return true;
  }, [workoutType, daysPerWeek, needsSubCategory, subCategory]);

  // Query workout plans based on selections
  // First tries user's custom plans, then falls back to global templates
  const { data: workoutPlans, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ['workoutPlans', user?.id, level, workoutType, subCategory, daysPerWeek],
    queryFn: async () => {
      // First: Try to get user's custom workout plans
      let userQuery = supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user!.id)
        .eq('level', level)
        .eq('workout_type', workoutType)
        .eq('days_per_week', daysPerWeek);

      if (subCategory) {
        userQuery = userQuery.eq('sub_category', subCategory);
      } else {
        userQuery = userQuery.is('sub_category', null);
      }

      const { data: userPlans, error: userError } = await userQuery.order('day_number', { ascending: true });
      if (userError) throw userError;

      // If user has custom plans, return those
      if (userPlans && userPlans.length > 0) {
        return userPlans.map(plan => ({
          id: plan.id,
          dayNumber: plan.day_number,
          focus: plan.focus || '',
          exercises: plan.exercises ? JSON.parse(plan.exercises) : [],
          isTemplate: false,
        }));
      }

      // Second: Fall back to global templates
      let templateQuery = supabase
        .from('workout_templates')
        .select('*')
        .eq('level', level)
        .eq('workout_type', workoutType)
        .eq('days_per_week', daysPerWeek);

      if (subCategory) {
        templateQuery = templateQuery.eq('sub_category', subCategory);
      } else {
        templateQuery = templateQuery.is('sub_category', null);
      }

      const { data: templates, error: templateError } = await templateQuery.order('day_number', { ascending: true });
      if (templateError) throw templateError;

      return (templates || []).map(plan => ({
        id: plan.id,
        dayNumber: plan.day_number,
        focus: plan.focus || '',
        exercises: plan.exercises ? JSON.parse(plan.exercises) : [],
        isTemplate: true, // Flag to indicate this is from templates
      }));
    },
    enabled: !!user && isSelectionComplete,
  });

  const { data: mealPlans, isLoading: isLoadingMeals } = useQuery({
    queryKey: ['mealPlans', user?.id, mealLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user!.id)
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

  // Generate default workout plan based on days per week
  const defaultWorkoutPlan = useMemo(() => {
    if (!daysPerWeek) return [];
    return Array.from({ length: daysPerWeek as number }, (_, index) => ({
      id: `default-${index + 1}`,
      dayNumber: index + 1,
      focus: '',
      exercises: []
    }));
  }, [daysPerWeek]);

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
          {/* Hierarchical Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Your Workout Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Level */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Level</label>
                <Select value={level} onValueChange={(v) => handleLevelChange(v as Level)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Workout Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Workout Type</label>
                <Select
                  value={workoutType}
                  onValueChange={(v) => handleWorkoutTypeChange(v as WorkoutType)}
                  disabled={availableWorkoutTypes.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkoutTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {WORKOUT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Category (conditional) */}
              {needsSubCategory && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                  <Select
                    value={subCategory || ''}
                    onValueChange={(v) => handleSubCategoryChange(v as SubCategory)}
                    disabled={!workoutType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubCategories.map(cat => (
                        <SelectItem key={cat!} value={cat!}>
                          {SUB_CATEGORY_LABELS[cat!]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Days Per Week */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Days Per Week</label>
                <Select
                  value={daysPerWeek ? String(daysPerWeek) : ''}
                  onValueChange={(v) => setDaysPerWeek(Number(v))}
                  disabled={availableDaysOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select days..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDaysOptions.map(days => (
                      <SelectItem key={days} value={String(days)}>
                        {days}-day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Workout Plan Display */}
          {isSelectionComplete ? (
            isLoadingWorkouts ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <EditableWorkoutPlan
                initialPlan={workoutPlans && workoutPlans.length > 0 ? workoutPlans : defaultWorkoutPlan}
                level={level}
                workoutType={workoutType as WorkoutType}
                subCategory={subCategory || null}
                daysPerWeek={daysPerWeek as number}
              />
            )
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Please complete all selections above to view your workout plan
              </p>
            </Card>
          )}
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

          {isLoadingMeals ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <EditableMealPlan
              key={selectedMealDay}
              initialPlan={currentMealPlan}
              day={selectedMealDay}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
