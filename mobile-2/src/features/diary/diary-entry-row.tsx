import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import type { FoodEntry } from '@/domain/models';

export function DiaryEntryRow({ entry }: { entry: FoodEntry }) {
  return (
    <Surface style={{ gap: 4, padding: 16 }}>
      <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        <AppText style={{ flex: 1, fontWeight: '700' }}>{entry.foodName}</AppText>
        <AppText style={{ fontWeight: '700' }}>{Math.round(entry.calories)} kcal</AppText>
      </View>
      <AppText tone="muted" variant="caption">
        {Math.round(entry.calories)} kcal · P {Math.round(entry.protein)}g · C {Math.round(entry.carbohydrates)}g · F {Math.round(entry.fat)}g
      </AppText>
      <AppText tone="muted" variant="caption">{entry.quantity} {entry.unit}</AppText>
    </Surface>
  );
}
