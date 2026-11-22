import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import type { Food } from '@/domain/models';
import { useTheme } from '@/theme/theme';

export function FoodSearchRow({ food, isSelected, onPress }: { food: Food; isSelected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityHint="Selects this food for logging" accessibilityLabel={`${food.name}, ${Math.round(food.nutrition.calories)} calories per ${food.servingSize} ${food.servingUnit}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
      <Surface style={{ borderColor: isSelected ? colors.accent : colors.border, gap: 4, minHeight: 64, padding: 16 }}>
        <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
          <AppText style={{ flex: 1, fontWeight: '700' }}>{food.name}</AppText>
          {isSelected ? <AppText style={{ color: colors.accent, fontWeight: '700' }} variant="caption">SELECTED</AppText> : null}
        </View>
        <AppText tone="muted" variant="caption">{food.brand ? `${food.brand} · ` : ''}{Math.round(food.nutrition.calories)} kcal per {food.servingSize}{food.servingUnit}</AppText>
      </Surface>
    </Pressable>
  );
}
