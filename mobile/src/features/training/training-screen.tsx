import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { TrainingPlan } from './training-plan';
import { WorkoutHistory } from './workout-history';
import type { TrainingView } from './training-navigation';

type Props = {
  initialView: TrainingView;
  onViewChange?: (view: TrainingView) => void;
};

export function TrainingScreen({ initialView, onViewChange }: Props) {
  const [view, setView] = useState<TrainingView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const selectView = useCallback((next: TrainingView) => {
    setView(next);
    onViewChange?.(next);
  }, [onViewChange]);

  const header = (
    <View style={{ gap: spacing.md }}>
      <Text variant="h1">Training</Text>
      <SegmentedControl
        label="Training view"
        value={view}
        onChange={selectView}
        segments={[
          { value: 'plan', label: 'Plan' },
          { value: 'history', label: 'History' },
        ]}
      />
    </View>
  );

  return view === 'history'
    ? <WorkoutHistory header={header} />
    : <TrainingPlan header={header} />;
}
