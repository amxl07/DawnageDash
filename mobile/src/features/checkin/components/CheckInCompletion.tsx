import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';

import { isBlocked } from '@/features/home/home-state';
import { useHomeDate } from '@/features/home/useHomeDate';
import { useHomeLocal } from '@/features/home/useHomeLocal';
import { useUserProfile, useWorkoutPlan } from '@/hooks/usePlans';
import { checkInCompletionDestination } from '../completion-next-step';
import { CheckInReceipt } from './CheckInReceipt';

type Props = Omit<ComponentProps<typeof CheckInReceipt>, 'nextAction'>;

export function CheckInCompletion(props: Props) {
  const today = useHomeDate();
  // Historical and queued receipts do not need another set of plan/local reads.
  return props.receipt.status === 'synced' && props.receipt.date === today
    ? <CurrentCompletion {...props} today={today} />
    : <CheckInReceipt {...props} />;
}

function CurrentCompletion({ today, ...props }: Props & { today: string }) {
  const router = useRouter();
  const profile = useUserProfile();
  const plan = useWorkoutPlan();
  const local = useHomeLocal(today);
  const destination = checkInCompletionDestination({
    date: props.receipt.date,
    today,
    status: props.receipt.status,
    assignedPlanReady: Boolean(profile.data?.active_workout_plan)
      && !profile.isError && !profile.isFetching && profile.fetchStatus !== 'paused'
      && plan.data?.source === 'user' && plan.data.days.length > 0
      && !plan.isError && !plan.isFetching && plan.fetchStatus !== 'paused',
    localReady: Boolean(local.data) && !local.isError && !local.isFetching && local.fetchStatus !== 'paused',
    hasRecovery: Boolean(local.data?.workoutDraft || local.data?.workouts.length
      || local.data?.checkInDraft || local.data?.checkIns.some(isBlocked)),
  });
  return <CheckInReceipt {...props} nextAction={destination === 'training' ? {
    label: 'View your training', detail: 'Your assigned plan is here when you are ready.',
    onPress: () => router.navigate({ pathname: '/(app)/(tabs)/plans', params: { view: 'plan' } }),
  } : undefined} />;
}
