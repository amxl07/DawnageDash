import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { flushCheckInOutbox, saveCheckIn } from '@/features/checkin/checkInOutbox';
import type { CheckInPayload } from '@/features/checkin/persistence';
import type { DailyCheckIn } from '@/types/db';

export type { CheckInPayload } from '@/features/checkin/persistence';

/**
 * Save a check-in.
 *
 * UNIQUE(user_id, date) is DB-enforced, so the row-exists check is mandatory —
 * a blind insert on an existing day is a hard error, not an upsert.
 */
export function useCheckInMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateCheckIns = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dailyCheckIns', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) return;
      void flushCheckInOutbox(userId).then((synced) => {
        if (synced > 0) invalidateCheckIns();
      });
    });
    return unsubscribe;
  }, [invalidateCheckIns, user?.id]);

  return useMutation({
    mutationFn: async (payload: CheckInPayload) => {
      if (!user?.id) throw new Error('Not signed in');
      return saveCheckIn(user.id, payload);
    },
    onSuccess: invalidateCheckIns,
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
