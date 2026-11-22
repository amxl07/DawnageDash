import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TrainingScreen } from '@/features/training/training-screen';
import { resolveTrainingView, type TrainingView } from '@/features/training/training-navigation';

export default function PlansScreen() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();
  const view = resolveTrainingView(params.view);
  const handleViewChange = useCallback((next: TrainingView) => {
    router.setParams({ view: next });
  }, [router]);

  return <TrainingScreen initialView={view} onViewChange={handleViewChange} />;
}
