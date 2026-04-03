import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Level } from "@/lib/workout-constants";

// ============================================================================
// Types
// ============================================================================

export interface WorkoutHierarchyKey {
  level: Level;
  workoutType: string;
  subCategory: string | null;
  daysPerWeek: number;
  coachId: string | null;
  templateName: string;
}

export interface WorkoutTemplateGroup {
  level: string;
  workoutType: string;
  subCategory: string | null;
  daysPerWeek: number;
  templateName: string;
  coachId: string | null;
  dayCount: number;
}

export interface MealTemplateItem {
  id: string;
  name: string;
  caloriesTarget: number;
  dietType: string;
  coachId: string | null;
  content: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  videoLink?: string;
  notes?: string;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  focus: string;
  exercises: Exercise[];
}

// ============================================================================
// Permission Hook
// ============================================================================

export function useTemplatePermissions() {
  const { user } = useAuth();
  const role = user?.user_metadata?.role;

  const { data: userProfile } = useQuery({
    queryKey: ['templatePermissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('can_edit_global_templates')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    isAdmin: role === 'admin',
    isCoach: role === 'coach',
    canEditGlobal: role === 'admin' || userProfile?.can_edit_global_templates === true,
    canCreateOwn: role === 'coach' || role === 'admin',
  };
}

// ============================================================================
// Helper: add template_name filter to a query
// ============================================================================

function addTemplateNameFilter<T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T }>(
  query: T,
  templateName: string | null | undefined,
): T {
  if (templateName) {
    return query.eq('template_name', templateName);
  }
  return query.is('template_name', null);
}

// ============================================================================
// Workout Template Hooks
// ============================================================================

export function useWorkoutTemplateList(scope: 'global' | 'mine', coachId?: string) {
  const { user } = useAuth();
  const effectiveCoachId = coachId || user?.id;

  return useQuery<WorkoutTemplateGroup[]>({
    queryKey: ['workoutTemplateList', scope, effectiveCoachId],
    queryFn: async () => {
      let query = supabase
        .from('workout_templates')
        .select('level, workout_type, sub_category, days_per_week, template_name, coach_id');

      if (scope === 'global') {
        query = query.is('coach_id', null);
      } else {
        query = query.eq('coach_id', effectiveCoachId!);
      }

      const { data, error } = await query.order('level').order('workout_type').order('days_per_week');
      if (error) throw error;

      // Group by unique hierarchy key (including template_name)
      const groups = new Map<string, WorkoutTemplateGroup>();
      for (const row of data || []) {
        const key = `${row.level}|${row.workout_type}|${row.sub_category || ''}|${row.days_per_week}|${row.coach_id || ''}|${row.template_name || ''}`;
        if (!groups.has(key)) {
          groups.set(key, {
            level: row.level,
            workoutType: row.workout_type,
            subCategory: row.sub_category,
            daysPerWeek: row.days_per_week,
            templateName: row.template_name || '',
            coachId: row.coach_id,
            dayCount: 0,
          });
        }
        groups.get(key)!.dayCount++;
      }

      return Array.from(groups.values());
    },
    enabled: scope === 'global' || !!effectiveCoachId,
  });
}

export function useWorkoutTemplateDetail(key: WorkoutHierarchyKey | null) {
  return useQuery<DayPlan[]>({
    queryKey: ['workoutTemplateDetail', key],
    queryFn: async () => {
      if (!key) return [];

      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('level', key.level)
        .eq('workout_type', key.workoutType)
        .eq('days_per_week', key.daysPerWeek);

      if (key.subCategory) {
        query = query.eq('sub_category', key.subCategory);
      } else {
        query = query.is('sub_category', null);
      }

      if (key.coachId) {
        query = query.eq('coach_id', key.coachId);
      } else {
        query = query.is('coach_id', null);
      }

      query = addTemplateNameFilter(query, key.templateName);

      const { data, error } = await query.order('day_number', { ascending: true });
      if (error) throw error;

      // Deduplicate by day_number (keep latest)
      const seen = new Map<number, any>();
      for (const row of data || []) {
        const existing = seen.get(row.day_number);
        if (!existing || row.id > existing.id) {
          seen.set(row.day_number, row);
        }
      }

      return Array.from(seen.values())
        .sort((a, b) => a.day_number - b.day_number)
        .map(plan => {
          const exercises = plan.exercises ? JSON.parse(plan.exercises) : [];
          return {
            id: plan.id,
            dayNumber: plan.day_number,
            focus: plan.focus || '',
            exercises: exercises.map((ex: any, idx: number) => ({
              ...ex,
              id: ex.id || `tpl-ex-${plan.id}-${idx}`,
            })),
          };
        });
    },
    enabled: !!key,
  });
}

export function useSaveWorkoutTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, days }: { key: WorkoutHierarchyKey; days: DayPlan[] }) => {
      // Delete existing rows for this hierarchy + coach_id + template_name
      let deleteQuery = supabase
        .from('workout_templates')
        .delete()
        .eq('level', key.level)
        .eq('workout_type', key.workoutType)
        .eq('days_per_week', key.daysPerWeek);

      if (key.subCategory) {
        deleteQuery = deleteQuery.eq('sub_category', key.subCategory);
      } else {
        deleteQuery = deleteQuery.is('sub_category', null);
      }

      if (key.coachId) {
        deleteQuery = deleteQuery.eq('coach_id', key.coachId);
      } else {
        deleteQuery = deleteQuery.is('coach_id', null);
      }

      deleteQuery = addTemplateNameFilter(deleteQuery, key.templateName);

      const { error: delError } = await deleteQuery;
      if (delError) throw delError;

      // Insert new rows
      const rows = days.map(day => ({
        coach_id: key.coachId || null,
        template_name: key.templateName || null,
        level: key.level,
        workout_type: key.workoutType,
        sub_category: key.subCategory || null,
        days_per_week: key.daysPerWeek,
        day_number: day.dayNumber,
        focus: day.focus,
        exercises: JSON.stringify(day.exercises.map(({ id, ...rest }) => rest)),
      }));

      const { error: insError } = await supabase.from('workout_templates').insert(rows);
      if (insError) throw insError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateList'] });
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateDetail'] });
    },
  });
}

export function useDeleteWorkoutTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: WorkoutHierarchyKey) => {
      let query = supabase
        .from('workout_templates')
        .delete()
        .eq('level', key.level)
        .eq('workout_type', key.workoutType)
        .eq('days_per_week', key.daysPerWeek);

      if (key.subCategory) {
        query = query.eq('sub_category', key.subCategory);
      } else {
        query = query.is('sub_category', null);
      }

      if (key.coachId) {
        query = query.eq('coach_id', key.coachId);
      } else {
        query = query.is('coach_id', null);
      }

      query = addTemplateNameFilter(query, key.templateName);

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateList'] });
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateDetail'] });
    },
  });
}

// ============================================================================
// Meal Template Hooks
// ============================================================================

export function useMealTemplateList(scope: 'global' | 'mine', coachId?: string) {
  const { user } = useAuth();
  const effectiveCoachId = coachId || user?.id;

  return useQuery<MealTemplateItem[]>({
    queryKey: ['mealTemplateList', scope, effectiveCoachId],
    queryFn: async () => {
      let query = supabase
        .from('meal_templates')
        .select('*');

      if (scope === 'global') {
        query = query.is('coach_id', null);
      } else {
        query = query.eq('coach_id', effectiveCoachId!);
      }

      const { data, error } = await query.order('calories_target').order('diet_type');
      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        caloriesTarget: row.calories_target,
        dietType: row.diet_type,
        coachId: row.coach_id,
        content: row.content,
      }));
    },
    enabled: scope === 'global' || !!effectiveCoachId,
  });
}

export function useSaveMealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, caloriesTarget, dietType, coachId, content }: {
      id?: string;
      name: string;
      caloriesTarget: number;
      dietType: string;
      coachId: string | null;
      content: string;
    }) => {
      if (id) {
        const { error } = await supabase
          .from('meal_templates')
          .update({ name, calories_target: caloriesTarget, diet_type: dietType, content })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meal_templates')
          .insert({ name, calories_target: caloriesTarget, diet_type: dietType, coach_id: coachId, content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplateList'] });
    },
  });
}

export function useDeleteMealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplateList'] });
    },
  });
}

// ============================================================================
// Push to Global
// ============================================================================

export function usePushWorkoutToGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: WorkoutHierarchyKey) => {
      if (!key.coachId) throw new Error('Can only push coach templates to global');

      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('level', key.level)
        .eq('workout_type', key.workoutType)
        .eq('days_per_week', key.daysPerWeek)
        .eq('coach_id', key.coachId);

      if (key.subCategory) {
        query = query.eq('sub_category', key.subCategory);
      } else {
        query = query.is('sub_category', null);
      }

      query = addTemplateNameFilter(query, key.templateName);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!data || data.length === 0) throw new Error('No template data found');

      const globalRows = data.map(({ id, coach_id, created_at, updated_at, ...rest }) => ({
        ...rest,
        coach_id: null,
      }));

      // Delete existing global template for same hierarchy + name first
      let delQuery = supabase
        .from('workout_templates')
        .delete()
        .eq('level', key.level)
        .eq('workout_type', key.workoutType)
        .eq('days_per_week', key.daysPerWeek)
        .is('coach_id', null);

      if (key.subCategory) {
        delQuery = delQuery.eq('sub_category', key.subCategory);
      } else {
        delQuery = delQuery.is('sub_category', null);
      }

      delQuery = addTemplateNameFilter(delQuery, key.templateName);

      await delQuery;

      const { error: insError } = await supabase.from('workout_templates').insert(globalRows);
      if (insError) throw insError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateList'] });
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateDetail'] });
    },
  });
}

export function usePushMealToGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error: fetchError } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Template not found');
      if (!data.coach_id) throw new Error('This is already a global template');

      const { id, coach_id, created_at, updated_at, ...rest } = data;
      const { error: insError } = await supabase
        .from('meal_templates')
        .insert({ ...rest, coach_id: null });
      if (insError) throw insError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplateList'] });
    },
  });
}

// ============================================================================
// Clone Global Template to My Templates
// ============================================================================

export function useCloneWorkoutToMine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceKey, newName, targetCoachId }: {
      sourceKey: WorkoutHierarchyKey;
      newName: string;
      targetCoachId: string;
    }) => {
      // Fetch the source (global) template rows
      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('level', sourceKey.level)
        .eq('workout_type', sourceKey.workoutType)
        .eq('days_per_week', sourceKey.daysPerWeek);

      if (sourceKey.subCategory) {
        query = query.eq('sub_category', sourceKey.subCategory);
      } else {
        query = query.is('sub_category', null);
      }

      if (sourceKey.coachId) {
        query = query.eq('coach_id', sourceKey.coachId);
      } else {
        query = query.is('coach_id', null);
      }

      query = addTemplateNameFilter(query, sourceKey.templateName);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!data || data.length === 0) throw new Error('No template data found to clone');

      // Insert as personal template with new name
      const clonedRows = data.map(({ id, coach_id, created_at, updated_at, template_name, ...rest }) => ({
        ...rest,
        coach_id: targetCoachId,
        template_name: newName,
      }));

      const { error: insError } = await supabase.from('workout_templates').insert(clonedRows);
      if (insError) throw insError;

      return {
        level: sourceKey.level,
        workoutType: sourceKey.workoutType,
        subCategory: sourceKey.subCategory,
        daysPerWeek: sourceKey.daysPerWeek,
        coachId: targetCoachId,
        templateName: newName,
      } as WorkoutHierarchyKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateList'] });
      queryClient.invalidateQueries({ queryKey: ['workoutTemplateDetail'] });
    },
  });
}

export function useCloneMealToMine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, newName, targetCoachId }: {
      sourceId: string;
      newName: string;
      targetCoachId: string;
    }) => {
      const { data, error: fetchError } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Template not found');

      const { id, coach_id, created_at, updated_at, ...rest } = data;
      const { data: inserted, error: insError } = await supabase
        .from('meal_templates')
        .insert({ ...rest, coach_id: targetCoachId, name: newName })
        .select()
        .single();
      if (insError) throw insError;

      return {
        id: inserted.id,
        name: inserted.name,
        caloriesTarget: inserted.calories_target,
        dietType: inserted.diet_type,
        coachId: inserted.coach_id,
        content: inserted.content,
      } as MealTemplateItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplateList'] });
    },
  });
}

// ============================================================================
// Distinct Values for Dynamic Dropdowns
// ============================================================================

export function useDistinctWorkoutTypes(level: string, scope: 'global' | 'mine', coachId?: string) {
  return useQuery<string[]>({
    queryKey: ['distinctWorkoutTypes', level, scope, coachId],
    queryFn: async () => {
      let query = supabase
        .from('workout_templates')
        .select('workout_type')
        .eq('level', level);

      if (scope === 'global') {
        query = query.is('coach_id', null);
      } else if (coachId) {
        // For personal scope, include both personal and global types
        query = query.or(`coach_id.eq.${coachId},coach_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const unique = new Set((data || []).map(r => r.workout_type));
      return Array.from(unique).sort();
    },
    enabled: !!level,
  });
}

export function useDistinctSubCategories(level: string, workoutType: string, scope: 'global' | 'mine', coachId?: string) {
  return useQuery<string[]>({
    queryKey: ['distinctSubCategories', level, workoutType, scope, coachId],
    queryFn: async () => {
      let query = supabase
        .from('workout_templates')
        .select('sub_category')
        .eq('level', level)
        .eq('workout_type', workoutType)
        .not('sub_category', 'is', null);

      if (scope === 'global') {
        query = query.is('coach_id', null);
      } else if (coachId) {
        query = query.or(`coach_id.eq.${coachId},coach_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const unique = new Set((data || []).map(r => r.sub_category).filter(Boolean));
      return Array.from(unique).sort() as string[];
    },
    enabled: !!level && !!workoutType,
  });
}

// ============================================================================
// Assign Template to Clients
// ============================================================================

export function useAssignWorkoutToClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, days, clientIds }: {
      key: WorkoutHierarchyKey;
      days: DayPlan[];
      clientIds: string[];
    }) => {
      for (const clientId of clientIds) {
        // Delete ALL existing workout_plans for this client (replace entire plan)
        const { error: delError } = await supabase
          .from('workout_plans')
          .delete()
          .eq('user_id', clientId);
        if (delError) throw delError;

        // Insert template days as workout_plans
        const rows = days.map(day => ({
          user_id: clientId,
          level: key.level,
          workout_type: key.workoutType,
          sub_category: key.subCategory || null,
          days_per_week: key.daysPerWeek,
          day_number: day.dayNumber,
          focus: day.focus,
          exercises: JSON.stringify(day.exercises.map(({ id, ...rest }) => rest)),
        }));

        const { error: insError } = await supabase.from('workout_plans').insert(rows);
        if (insError) throw insError;

        // Update user's active_workout_plan metadata
        const { error: updError } = await supabase
          .from('users')
          .update({
            active_workout_plan: JSON.stringify({
              level: key.level,
              workoutType: key.workoutType,
              subCategory: key.subCategory,
              daysPerWeek: key.daysPerWeek,
            }),
          })
          .eq('id', clientId);
        if (updError) throw updError;
      }
    },
    onSuccess: () => {
      // Invalidate all queries that Plans.tsx and client pages use
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['coachClients'] });
    },
  });
}

export function useAssignMealToClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ template, clientIds }: {
      template: MealTemplateItem;
      clientIds: string[];
    }) => {
      const content = JSON.parse(template.content);
      const mealTypes = ['Breakfast', 'Mid-Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'] as const;
      const mealKeys = ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'] as const;

      for (const clientId of clientIds) {
        // Delete ALL existing meal_plans for this client (replace entire meal plan)
        const { error: delError } = await supabase
          .from('meal_plans')
          .delete()
          .eq('user_id', clientId);
        if (delError) throw delError;

        // Insert meal rows from template content
        const rows = mealKeys.map((key, i) => ({
          user_id: clientId,
          diet_type: template.dietType,
          calories_target: template.caloriesTarget,
          day_of_week: 'Daily',
          meal_type: mealTypes[i],
          description: content[key]?.name || '',
          calories: content[key]?.calories || 0,
          protein: content[key]?.protein || 0,
          carbs: content[key]?.carbs || 0,
          fats: content[key]?.fats || 0,
        }));

        const { error: insError } = await supabase.from('meal_plans').insert(rows);
        if (insError) throw insError;

        // Update user's active_meal_plan metadata
        const { error: updError } = await supabase
          .from('users')
          .update({
            active_meal_plan: JSON.stringify({
              calories: template.caloriesTarget,
              dietType: template.dietType,
            }),
          })
          .eq('id', clientId);
        if (updError) throw updError;
      }
    },
    onSuccess: () => {
      // Invalidate all queries that Plans.tsx and client pages use
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['coachClients'] });
    },
  });
}
