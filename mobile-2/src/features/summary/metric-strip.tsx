import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import type { DailySummary } from '@/domain/models';

export function MetricStrip({ summary }: { summary: DailySummary }) {
  const metrics = [
    ['Protein', summary.macros.protein, 'g'],
    ['Carbs', summary.macros.carbohydrates, 'g'],
    ['Fat', summary.macros.fat, 'g'],
  ] as const;
  return (
    <Surface style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {metrics.map(([label, value, unit]) => (
          <View key={label} style={{ alignItems: 'center', flex: 1, gap: 2 }}>
            <AppText style={{ fontWeight: '700' }}>{Math.round(value)}{unit}</AppText>
            <AppText tone="muted" variant="caption">{label}</AppText>
          </View>
        ))}
      </View>
    </Surface>
  );
}
