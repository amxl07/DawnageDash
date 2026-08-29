import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BodyMeasurement } from '@/types/db';

export type MeasurementPayload = {
  date: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  thighs: number | null;
  arms: number | null;
};

/** Newest-first, matching the web (index 0 = current, last = baseline). */
export function useMeasurements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: async (): Promise<BodyMeasurement[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BodyMeasurement[];
    },
    enabled: !!user?.id,
  });
}

/**
 * body_measurements has NO unique constraint, so the fetch-then-decide check
 * is the only thing preventing duplicate rows for one date.
 */
export function useMeasurementMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MeasurementPayload) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data: existing, error: fetchError } = await supabase
        .from('body_measurements')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', payload.date)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const row = { ...payload, user_id: user.id };
      if (existing) {
        const { error } = await supabase
          .from('body_measurements')
          .update(row)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('body_measurements').insert(row);
        if (error) throw error;
      }
      return { updated: Boolean(existing) };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bodyMeasurements', user?.id] });
    },
  });
}
