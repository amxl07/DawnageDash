import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { WeeklyCheckIn } from '@/lib/weekly-feedback';

/** Shared account-scoped history for the weekly editor and Home. */
export function useWeeklyFeedbackHistory() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['weeklyCheckIns', userId],
    queryFn: async (): Promise<WeeklyCheckIn[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.from('weekly_check_ins').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeeklyCheckIn[];
    },
    enabled: Boolean(userId),
  });
}
