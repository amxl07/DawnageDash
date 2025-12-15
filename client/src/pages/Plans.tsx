import { useState, useMemo, useEffect } from "react";
import { EditableWorkoutPlan } from "@/components/EditableWorkoutPlan";
import { EditableMealPlan } from "@/components/EditableMealPlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Dumbbell, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Types for hierarchical structure
type Level = 'Beginner' | 'Intermediate' | 'Advanced';
type WorkoutType = 'GYM_WORKOUT' | 'HOME_WORKOUT' | 'ADVANCE_CALISTHENICS' | 'POWERBUILDING' | 'CALIS_COMPOUND_LIFTS';
type SubCategory = '0_EXPERIENCE' | '6_MONTH_EXPERIENCE' | 'JUST_BODYWEIGHT' | 'JUST_DBS' | 'JUST_RINGS' | 'DBS_RINGS' | 'PHASE_1' | 'PHASE_2' | null;
type DietType = 'Vegetarian' | 'Eggetarian' | 'Non-Vegetarian';
const CALORIE_OPTIONS = [1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800];
const DIET_OPTIONS: DietType[] = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian'];

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



export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Workout hierarchy state
  const [level, setLevel] = useState<Level>('Beginner');
  const [workoutType, setWorkoutType] = useState<WorkoutType | ''>('');
  const [subCategory, setSubCategory] = useState<SubCategory | ''>('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | ''>('');

  // Meal plan state
  // Meal plan state
  const [caloriesTarget, setCaloriesTarget] = useState<number>(1200);
  const [dietType, setDietType] = useState<DietType>('Vegetarian');


  // Fetch user profile to get active plan
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('active_workout_plan, active_meal_plan')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load active plan on mount
  useEffect(() => {
    if (userProfile) {
      // Workout Plan
      if (userProfile.active_workout_plan) {
        try {
          const plan = JSON.parse(userProfile.active_workout_plan);
          if (plan) {
            setLevel(plan.level);
            setWorkoutType(plan.workoutType);
            setSubCategory(plan.subCategory || '');
            setDaysPerWeek(plan.daysPerWeek);
          }
        } catch (e) {
          console.error("Failed to parse active workout plan", e);
        }
      }

      // Meal Plan
      if (userProfile.active_meal_plan) {
        try {
          const plan = JSON.parse(userProfile.active_meal_plan);
          if (plan) {
            if (plan.calories) setCaloriesTarget(plan.calories);
            if (plan.dietType) setDietType(plan.dietType);
          }
        } catch (e) {
          console.error("Failed to parse active meal plan", e);
        }
      }
    }
  }, [userProfile]);

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
    queryKey: ['mealPlans', user?.id, caloriesTarget, dietType],
    queryFn: async () => {
      // 1. Try to get user custom plans for this configuration
      let userQuery = supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user!.id)
        .eq('calories_target', caloriesTarget)
        .eq('diet_type', dietType);

      const { data: userPlans, error: userError } = await userQuery;
      if (userError) throw userError;

      if (userPlans && userPlans.length > 0) {
        return { source: 'custom', plans: userPlans };
      }

      // 2. Fallback to templates
      const { data: template, error: templateError } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('calories_target', caloriesTarget)
        .eq('diet_type', dietType)
        .single();

      // If no template found (e.g. for higher calorie targets not yet added), return empty
      if (templateError && templateError.code !== 'PGRST116') throw templateError;

      return { source: 'template', template };
    },
    enabled: !!user,
  });

  const getDayMealPlan = () => {
    // If it's a custom plan, we try to find the "Daily" plan, or fallback to any
    if (mealPlans?.source === 'custom' && mealPlans.plans) {
      // We look for 'Daily' or just take the first one found if we are migrating
      const dailyMeals = mealPlans.plans.filter((m: any) => m.day_of_week === 'Daily' || m.day_of_week === 'Monday') || [];

      const getMeal = (type: string) => {
        const meal = dailyMeals.find((m: any) => m.meal_type === type);
        return {
          id: meal?.id || `new-${type}`,
          name: meal?.description || '',
          calories: meal?.calories || 0,
          protein: parseFloat(meal?.protein || '0'),
          carbs: parseFloat(meal?.carbs || '0'),
          fats: parseFloat(meal?.fats || '0'),
        };
      };

      return {
        breakfast: getMeal('Breakfast'),
        lunch: getMeal('Lunch'),
        dinner: getMeal('Dinner'),
      };
    }

    // If it's a template, we parse the JSON content
    if (mealPlans?.source === 'template' && mealPlans.template) {
      try {
        const content = JSON.parse(mealPlans.template.content);
        // Map template structure to DayMealPlan
        // Template has fixed fields: breakfast, lunch, dinner
        return {
          breakfast: { ...content.breakfast, id: `tpl-bf` },
          lunch: { ...content.lunch, id: `tpl-ln` },
          dinner: { ...content.dinner, id: `tpl-dn` },
        };
      } catch (err) {
        console.error("Error parsing meal template", err);
      }
    }

    // Default empty
    return {
      breakfast: { id: 'def-bf', name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      lunch: { id: 'def-ln', name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      dinner: { id: 'def-dn', name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
    };
  };

  const currentMealPlan = getDayMealPlan();

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

  // Handle confirming the plan
  const handleConfirmPlan = async () => {
    if (!user || !isSelectionComplete) return;

    try {
      // 1. Update user's active plan preference
      const planConfig = { level, workoutType, subCategory, daysPerWeek };
      const { error: updateError } = await supabase
        .from('users')
        .update({ active_workout_plan: JSON.stringify(planConfig) })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 2. If it's a template, copy to workout_plans
      const isTemplate = workoutPlans?.[0]?.isTemplate;

      if (isTemplate && workoutPlans) {
        const rows = workoutPlans.map(day => ({
          user_id: user.id,
          level: level,
          workout_type: workoutType,
          sub_category: subCategory || null,
          days_per_week: daysPerWeek,
          day_number: day.dayNumber,
          focus: day.focus,
          exercises: JSON.stringify(day.exercises),
        }));

        // First delete any existing to avoid duplicates if they click multiple times or overwrite
        // Actually EditableWorkoutPlan does delete-insert, so we can do same or just insert if empty.
        // Let's use delete-then-insert to be safe and consistent with "Reset to template" logic.
        let deleteQuery = supabase
          .from('workout_plans')
          .delete()
          .eq('user_id', user.id)
          .eq('level', level)
          .eq('workout_type', workoutType)
          .eq('days_per_week', daysPerWeek);

        if (subCategory) {
          deleteQuery = deleteQuery.eq('sub_category', subCategory);
        } else {
          deleteQuery = deleteQuery.is('sub_category', null);
        }
        await deleteQuery;

        const { error: insertError } = await supabase
          .from('workout_plans')
          .insert(rows);

        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
        queryClient.invalidateQueries({ queryKey: ['userProfile'] }); // Refresh profile to confirm active logic
      }

      toast({
        title: "Plan Confirmed",
        description: "This workout plan has been assigned to your profile."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm plan",
        variant: "destructive"
      });
    }
  };

  // Check if current selection matches active plan
  const isCurrentActive = useMemo(() => {
    if (!userProfile?.active_workout_plan) return false;
    try {
      const active = JSON.parse(userProfile.active_workout_plan);
      return (
        active.level === level &&
        active.workoutType === workoutType &&
        (active.subCategory || '') === (subCategory || '') &&
        active.daysPerWeek === daysPerWeek
      );
    } catch {
      return false;
    }
  }, [userProfile, level, workoutType, subCategory, daysPerWeek]);

  const isCurrentActiveMeal = useMemo(() => {
    if (!userProfile?.active_meal_plan) return false;
    try {
      const active = JSON.parse(userProfile.active_meal_plan);
      return active.calories === caloriesTarget && active.dietType === dietType;
    } catch {
      return false;
    }
  }, [userProfile, caloriesTarget, dietType]);

  const handleConfirmMealPlan = async () => {
    if (!user || !mealPlans?.template) return; // Can only confirm if template exists or fallback logic

    try {
      // 1. Update active plan
      const planConfig = { calories: caloriesTarget, dietType };
      const { error: prefError } = await supabase
        .from('users')
        .update({ active_meal_plan: JSON.stringify(planConfig) })
        .eq('id', user.id);

      if (prefError) throw prefError;

      // 2. Populate meal_plans for all 7 days with this template
      // We first delete existing plans for this configuration or ALL plans?
      // Let's delete plans for this specific target/type to keep it clean, or update them.
      // Usually users want this to be their schedule.
      // Let's delete existing entries for this calories_target and diet_type.

      /* 
         DESIGN CHOICE: We now save as ONE 'Daily' plan.
         We delete existing for this user/target/type.
      */

      const content = JSON.parse(mealPlans.template.content);
      const rows: any[] = [];
      const day = 'Daily';

      // Breakfast
      rows.push({ ...content.breakfast, user_id: user.id, day_of_week: day, meal_type: 'Breakfast', description: content.breakfast.name, diet_type: dietType, calories_target: caloriesTarget });
      // Lunch
      rows.push({ ...content.lunch, user_id: user.id, day_of_week: day, meal_type: 'Lunch', description: content.lunch.name, diet_type: dietType, calories_target: caloriesTarget });
      // Dinner
      rows.push({ ...content.dinner, user_id: user.id, day_of_week: day, meal_type: 'Dinner', description: content.dinner.name, diet_type: dietType, calories_target: caloriesTarget });

      // Delete existing for this config
      const { error: delError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('calories_target', caloriesTarget)
        .eq('diet_type', dietType);

      if (delError) throw delError;

      // Clean up rows to match schema (remove extra fields from JSON spread)
      const cleanRows = rows.map(r => ({
        user_id: r.user_id,
        day_of_week: r.day_of_week,
        meal_type: r.meal_type,
        description: r.description,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        diet_type: r.diet_type,
        calories_target: r.calories_target
      }));

      const { error: insError } = await supabase.from('meal_plans').insert(cleanRows);
      if (insError) throw insError;

      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      toast({
        title: "Meal Plan Confirmed",
        description: "Your weekly meal plan has been updated."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm meal plan",
        variant: "destructive"
      });
    }
  };

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

          {/* Confirm Button Area */}
          {isSelectionComplete && !isLoadingWorkouts && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleConfirmPlan}
                disabled={isCurrentActive}
                variant={isCurrentActive ? "outline" : "default"}
                className={isCurrentActive ? "border-green-500 text-green-600 hover:text-green-700 bg-green-50" : ""}
              >
                {isCurrentActive ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Current Active Plan
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirm & Start This Plan
                  </>
                )}
              </Button>
            </div>
          )}

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
            <h3 className="text-lg font-semibold mb-4">Select Your Nutrition Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calories */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Target Calories</label>
                <Select value={String(caloriesTarget)} onValueChange={(v) => setCaloriesTarget(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALORIE_OPTIONS.map(cal => (
                      <SelectItem key={cal} value={String(cal)}>{cal} Calories</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Diet Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Dietary Preference</label>
                <Select value={dietType} onValueChange={(v) => setDietType(v as DietType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map(diet => (
                      <SelectItem key={diet} value={diet}>{diet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Confirm Button Area */}
          {!isLoadingMeals && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleConfirmMealPlan}
                disabled={isCurrentActiveMeal || mealPlans?.source !== 'template'} // Disable if active OR if it's already a custom plan (meaning they should edit instead) -- actually allow confirm to Reset
                variant={isCurrentActiveMeal ? "outline" : "default"}
                className={isCurrentActiveMeal ? "border-green-500 text-green-600 hover:text-green-700 bg-green-50" : ""}
              >
                {isCurrentActiveMeal ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Current Active Plan
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {mealPlans?.source === 'custom' ? "Reset to Template" : "Confirm & Start This Plan"}
                  </>
                )}
              </Button>
            </div>
          )}



          {isLoadingMeals ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <EditableMealPlan
              key="daily-meal-plan"
              initialPlan={currentMealPlan}
              day="Daily"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
