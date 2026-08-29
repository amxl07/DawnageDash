import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type PlanPointer = {
  level: string;
  workoutType: string;
  subCategory: string | null;
  daysPerWeek: number;
};
export type MealPointer = { calories: number; dietType: string };

export type PlanExercise = {
  id?: string;
  name: string;
  sets: number; // TARGET count here — unlike logs, where sets is an array
  reps: string;
  videoLink?: string;
  notes?: string;
};

export type PlanDay = {
  id: string;
  day_number: number;
  focus: string | null;
  exercises: PlanExercise[];
  notes: string | null;
  /** Verified present on workout_plans — see 01-data-contracts.md. */
  updated_at: string | null;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  active_workout_plan: string | null;
  active_meal_plan: string | null;
  training_note: string | null;
  nutrition_note: string | null;
  cardio_note: string | null;
  steps_note: string | null;
  supplements_data: string | null;
  package_start_date: string | null;
  package_duration: number | null;
  phone_number: string | null;
  country: string | null;
  email: string | null;
  profile_data: Record<string, unknown> | null;
};

const parseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Legacy key casing varies across rows. */
function normalizeExercises(raw: string | null): PlanExercise[] {
  const parsed = parseJson<Record<string, unknown>[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((ex, i) => ({
    id: typeof ex.id === 'string' ? ex.id : String(i),
    name: String(ex.Exercise ?? ex.exercise ?? ex.name ?? `Exercise ${i + 1}`),
    sets: Number(ex.sets ?? ex.Sets ?? 3) || 3,
    reps: String(ex.reps ?? ex.Reps ?? ''),
    videoLink: (ex.videoLink ?? ex.VideoLink) ? String(ex.videoLink ?? ex.VideoLink) : undefined,
    notes: ex.notes ? String(ex.notes) : undefined,
  }));
}

export function useUserProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });
}

/**
 * Client-side plan resolution (contract §"Client-side plan resolution").
 * 1. users.active_workout_plan pointer
 * 2. the user's own workout_plans rows, deduped by day_number keeping highest id
 * 3. fall back to GLOBAL workout_templates (coach_id IS NULL)
 *
 * `templateOnly: false` (default) allows the template fallback; the logger's
 * day picker passes true to use ONLY the user's own rows.
 */
export function useWorkoutPlan(opts: { userRowsOnly?: boolean } = {}) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const pointer = parseJson<PlanPointer>(profile?.active_workout_plan ?? null);

  return useQuery({
    queryKey: ['workoutPlanDays', user?.id, profile?.active_workout_plan, opts.userRowsOnly],
    queryFn: async (): Promise<{ days: PlanDay[]; source: 'user' | 'template' | 'none' }> => {
      if (!user?.id || !pointer) return { days: [], source: 'none' };

      let query = supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', pointer.level)
        .eq('workout_type', pointer.workoutType)
        .eq('days_per_week', pointer.daysPerWeek);
      query = pointer.subCategory
        ? query.eq('sub_category', pointer.subCategory)
        : query.is('sub_category', null);

      const { data: userRows, error } = await query.order('day_number', { ascending: true });
      if (error) throw error;

      const dedupe = (rows: Record<string, unknown>[]): PlanDay[] => {
        const byDay = new Map<number, Record<string, unknown>>();
        for (const r of rows) {
          const day = Number(r.day_number);
          const prev = byDay.get(day);
          // Keep the highest id when a day_number repeats.
          if (!prev || String(r.id) > String(prev.id)) byDay.set(day, r);
        }
        return [...byDay.values()]
          .sort((a, b) => Number(a.day_number) - Number(b.day_number))
          .map((r) => ({
            id: String(r.id),
            day_number: Number(r.day_number),
            focus: (r.focus as string) ?? null,
            exercises: normalizeExercises((r.exercises as string) ?? null),
            notes: (r.notes as string) ?? null,
            updated_at: (r.updated_at as string) ?? (r.created_at as string) ?? null,
          }));
      };

      if (userRows?.length) return { days: dedupe(userRows), source: 'user' };
      if (opts.userRowsOnly) return { days: [], source: 'none' };

      let tq = supabase
        .from('workout_templates')
        .select('*')
        .is('coach_id', null)
        .eq('level', pointer.level)
        .eq('workout_type', pointer.workoutType)
        .eq('days_per_week', pointer.daysPerWeek);
      tq = pointer.subCategory
        ? tq.eq('sub_category', pointer.subCategory)
        : tq.is('sub_category', null);

      const { data: templateRows, error: tErr } = await tq.order('day_number', { ascending: true });
      if (tErr) throw tErr;
      if (templateRows?.length) return { days: dedupe(templateRows), source: 'template' };
      return { days: [], source: 'none' };
    },
    enabled: !!user?.id && !!pointer,
  });
}

export type Meal = {
  meal_type: string;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
};

const MEAL_ORDER = ['Breakfast', 'Mid Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];

export function useMealPlan() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const pointer = parseJson<MealPointer>(profile?.active_meal_plan ?? null);

  return useQuery({
    queryKey: ['mealPlan', user?.id, profile?.active_meal_plan],
    queryFn: async (): Promise<{ meals: Meal[]; pointer: MealPointer | null }> => {
      if (!user?.id || !pointer) return { meals: [], pointer: null };

      const { data: rows } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('calories_target', pointer.calories)
        .eq('diet_type', pointer.dietType);

      const pick = (list: Record<string, unknown>[] | null | undefined) => {
        if (!list?.length) return null;
        // Prefer 'Daily' rows, else legacy 'Monday'.
        const daily = list.filter((r) => r.day_of_week === 'Daily');
        const source = daily.length ? daily : list.filter((r) => r.day_of_week === 'Monday');
        if (!source.length) return null;
        const byType = new Map<string, Record<string, unknown>>();
        for (const r of source) byType.set(String(r.meal_type), r);
        return MEAL_ORDER.filter((t) => byType.has(t)).map((t) => {
          const r = byType.get(t)!;
          return {
            meal_type: t,
            description: (r.description as string) ?? null,
            calories: r.calories === null ? null : Number(r.calories),
            protein: r.protein === null ? null : Number(r.protein),
            carbs: r.carbs === null ? null : Number(r.carbs),
            fats: r.fats === null ? null : Number(r.fats),
          };
        });
      };

      const fromUser = pick(rows);
      if (fromUser?.length) return { meals: fromUser, pointer };

      const { data: template } = await supabase
        .from('meal_templates')
        .select('*')
        .is('coach_id', null)
        .eq('calories_target', pointer.calories)
        .eq('diet_type', pointer.dietType)
        .maybeSingle();

      if (!template) return { meals: [], pointer };
      const content = parseJson<Record<string, Record<string, unknown>>>(
        (template.content as string) ?? null,
      );
      if (!content) return { meals: [], pointer };

      const KEYS: [string, string][] = [
        ['breakfast', 'Breakfast'],
        ['mid_morning_snack', 'Mid Morning Snack'],
        ['lunch', 'Lunch'],
        ['evening_snack', 'Evening Snack'],
        ['dinner', 'Dinner'],
      ];
      const meals = KEYS.filter(([k]) => content[k]).map(([k, label]) => {
        const m = content[k];
        return {
          meal_type: label,
          description: m.name ? String(m.name) : null,
          calories: m.calories === undefined ? null : Number(m.calories),
          protein: m.protein === undefined ? null : Number(m.protein),
          carbs: m.carbs === undefined ? null : Number(m.carbs),
          fats: m.fats === undefined ? null : Number(m.fats),
        };
      });
      return { meals, pointer };
    },
    enabled: !!user?.id && !!pointer,
  });
}

export type Supplement = { id: string; name: string; serving: string; timing: string };

export function parseSupplements(raw: string | null): Supplement[] {
  const parsed = parseJson<Supplement[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export function parsePointer(raw: string | null): PlanPointer | null {
  return parseJson<PlanPointer>(raw);
}
export function parseMealPointer(raw: string | null): MealPointer | null {
  return parseJson<MealPointer>(raw);
}
