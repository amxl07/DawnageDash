import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Surface } from '@/components/ui/surface';
import { useResponsiveLayout } from '@/components/ui/responsive-layout';
import type { DailySummary } from '@/domain/models';
import { getSummaryCalorieStatus } from '@/features/summary/summary-hooks';

export function HeroSummary({ summary }: { summary: DailySummary }) {
  const layout = useResponsiveLayout();
  const status = getSummaryCalorieStatus(summary);
  const progress = summary.calories.goal > 0 ? summary.calories.consumed / summary.calories.goal : 0;

  return (
    <Surface elevated style={{ gap: 18 }}>
      <View style={{ alignItems: layout === 'stacked' ? 'stretch' : 'center', flexDirection: layout === 'stacked' ? 'column' : 'row', gap: 20, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText tone="muted" variant="caption">CALORIES TODAY</AppText>
          <AppText variant="display">{Math.round(summary.calories.consumed)}</AppText>
          <AppText tone="muted">of {Math.round(status.goal)} kcal</AppText>
          <AppText tone={status.isOverGoal ? 'danger' : 'muted'} variant="caption">
            {status.isOverGoal ? `${Math.round(summary.calories.consumed - status.goal)} kcal over goal` : `${Math.round(status.remaining)} kcal remaining`}
          </AppText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <ProgressRing label="Calorie goal" progress={progress} />
        </View>
      </View>
    </Surface>
  );
}
