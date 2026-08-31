import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme/theme';

export function NutrientBar({ current, goal, label, unit }: { current: number; goal: number; label: string; unit: string }) {
  const { colors, radii } = useTheme();
  const progress = goal > 0 ? Math.min(Math.max(current / goal, 0), 1) : 0;
  const identifier = label.toLocaleLowerCase().replace(/\s+/g, '-');
  return (
    <View accessibilityLabel={`${label}: ${current} ${unit} of ${goal} ${unit}`} accessibilityRole="progressbar" style={{ gap: 8 }}>
      <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ fontWeight: '700' }}>{label}</AppText>
        <AppText tone="muted" variant="caption">{current} {unit} / {goal} {unit}</AppText>
      </View>
      <View style={{ backgroundColor: colors.progressTrack, borderRadius: radii.pill, height: 8, overflow: 'hidden' }}>
        <View testID={`nutrient-bar-fill-${identifier}`} style={{ backgroundColor: colors.accent, borderRadius: radii.pill, height: '100%', width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}
