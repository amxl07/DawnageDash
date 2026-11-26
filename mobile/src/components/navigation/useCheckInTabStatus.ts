import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useHomeDate } from '@/features/home/useHomeDate';

export function useCheckInTabStatus() {
  const { data, isSuccess } = useDailyCheckIns();
  const today = useHomeDate();
  const synced = Boolean(data?.some((entry) => entry.date === today));
  return {
    needsCheckIn: Boolean(isSuccess && !synced),
    label: isSuccess ? `Check in for today, ${synced ? 'record synced' : 'no synced record yet'}` : 'Check in for today',
  };
}
