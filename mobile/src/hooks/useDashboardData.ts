import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DailyCheckIn } from '@/types/db';

/** Canonical daily records, in ascending reporting-date order. */
export function useDailyCheckIns() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['dailyCheckIns', userId],
    queryFn: async (): Promise<DailyCheckIn[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyCheckIn[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

}

// Compatibility for existing imports: every measurement observer uses the same
// newest-first query contract. New consumers import useMeasurements directly.
export { useMeasurements as useBodyMeasurementHistory } from './useMeasurements';
