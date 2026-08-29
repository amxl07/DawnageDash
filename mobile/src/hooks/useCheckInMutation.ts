import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DailyCheckIn } from '@/types/db';

export type CheckInPayload = {
  date: string; // local yyyy-MM-dd
  morning_weight: number | null;
  sleep_hours: number | null;
  workout_status: string | null;
  workout_performance: number | null;
  nutrition_score: number | null;
  calorie_intake: number | null;
  water_liters: number | null;
  daily_steps: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  energy_level: number | null;
  hunger_level: number | null;
  stress_level: number | null;
  digestion: string | null;
  notes: string | null;
};

/**
 * Save a check-in.
 *
 * UNIQUE(user_id, date) is DB-enforced, so the row-exists check is mandatory —
 * a blind insert on an existing day is a hard error, not an upsert.
 */
export function useCheckInMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckInPayload) => {
      if (!user?.id) throw new Error('Not signed in');

      const { data: existing, error: fetchError } = await supabase
        .from('daily_check_ins')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', payload.date)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const row = { ...payload, user_id: user.id };

      if (existing) {
        const { error } = await supabase
          .from('daily_check_ins')
          .update(row)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_check_ins').insert(row);
        if (error) throw error;
      }

      // Fallback for the DB trigger trg_auto_set_start_date (CheckInForm.tsx:131-150).
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('package_start_date')
        .eq('id', user.id)
        .maybeSingle();
      if (!userErr && userRow && !userRow.package_start_date) {
        await supabase
          .from('users')
          .update({ package_start_date: payload.date })
          .eq('id', user.id);
      }

      return { updated: Boolean(existing) };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dailyCheckIns', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
    },
  });
}

/** Most recent check-in strictly before `date`, for prefill. */
export function findPreviousCheckIn(
  checkIns: DailyCheckIn[] | undefined,
  date: string,
): DailyCheckIn | null {
  if (!checkIns?.length) return null;
  const earlier = checkIns
    .filter((c) => c.date < date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return earlier[0] ?? null;
}
