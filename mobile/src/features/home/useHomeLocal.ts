import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { readCheckInOutbox } from '@/features/checkin/checkInOutbox';
import { findLatestCheckInDraft } from '@/hooks/useCheckInDraft';
import { findLatestWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { readWeeklyDraft } from '@/features/weekly/readWeeklyDraft';
import { readOutbox } from '@/lib/outbox';

/** Discovery stays outside the editors, so opening Home never starts autosave. */
export function useHomeLocal(today: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['homeLocalRecords', user?.id, today], enabled: Boolean(user?.id), staleTime: 0,
    queryFn: async () => {
      const [checkInDraft, workoutDraft, checkIns, workouts, weekly] = await Promise.all([
        findLatestCheckInDraft(user!.id), findLatestWorkoutDraft(user!.id),
        readCheckInOutbox(user!.id), readOutbox(user!.id),
        readWeeklyDraft(user!.id)
          .then((draft) => ({ draft, error: false }))
          .catch(() => ({ draft: null, error: true })),
      ]);
      return { checkInDraft, workoutDraft, checkIns, workouts, weeklyDraft: weekly.draft, weeklyDraftError: weekly.error };
    },
  });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refetch(); });
    return () => subscription.remove();
  }, [refetch]);
  return query;
}
