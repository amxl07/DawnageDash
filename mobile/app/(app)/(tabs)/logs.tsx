import { Redirect, useLocalSearchParams } from 'expo-router';

import { legacyLogsDestination } from '@/features/training/training-navigation';

export { LocalWorkoutCard, LogCard } from '@/features/training/workout-history';

export default function LogsAlias() {
  const params = useLocalSearchParams();
  return <Redirect href={legacyLogsDestination(params)} />;
}
