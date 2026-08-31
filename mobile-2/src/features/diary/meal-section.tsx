import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DiaryEntryRow } from '@/features/diary/diary-entry-row';
import type { DailyMeal } from '@/domain/models';
import { useTheme } from '@/theme/theme';

export function MealSection({ meal, onAddFood }: { meal: DailyMeal; onAddFood?: () => void }) {
  const { colors, radii } = useTheme();
  const hasEntries = meal.entries.length > 0;

  return (
    <View style={{ gap: 10 }}>
      <AppText accessibilityRole="header" variant="title">{meal.name}</AppText>
      {hasEntries ? meal.entries.map((entry) => <DiaryEntryRow entry={entry} key={entry.id} />) : (
        <View style={{ alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radii.card, borderStyle: 'dashed', borderWidth: 1, gap: 8, padding: 18 }}>
          <AppText tone="muted">Nothing logged yet.</AppText>
          {onAddFood ? (
            <Pressable
              accessibilityLabel={`Add food to ${meal.name}`}
              accessibilityRole="button"
              onPress={onAddFood}
              style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', minHeight: 44, opacity: pressed ? 0.72 : 1, paddingHorizontal: 12 })}
            >
              <AppText style={{ color: colors.accent, fontWeight: '700' }}>Add food</AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
