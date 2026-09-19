import { Check, ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { WorkoutExercise, WorkoutSet } from '@/features/workout/workoutReducer';
import { radius, spacing, useTheme } from '@/theme';

export const CompactSetRow = memo(function CompactSetRow({ set, index, tracking, onEdit, onToggle }: { set: WorkoutSet; index: number; tracking: WorkoutExercise['tracking']; onEdit: () => void; onToggle: () => void }) {
  const { colors } = useTheme();
  const label = (set.kind === 'warmup' ? 'Warm-up ' : 'Set ') + (index + 1);
  const description = tracking === 'duration' ? (set.duration ? set.duration + ' seconds' : 'Not logged') : set.reps || set.weight ? (set.weight ? set.weight + ' kg × ' : '') + (set.reps || '—') + ' reps' : 'Not logged';
  return <View style={[styles.row, { borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Edit ' + label.toLowerCase() + ': ' + description + ', ' + (set.completed ? 'completed' : 'incomplete')} onPress={onEdit} style={styles.edit}>
      <Text variant="bodySm" tone="muted" style={{ minWidth: 50 }}>{label}</Text>
      <View style={{ flex: 1, gap: spacing.xs }}><Text variant="body" numeric>{description}</Text>{set.rpe ? <Text variant="bodySm" tone="muted">RPE {set.rpe}</Text> : null}</View>
      <ChevronRight size={16} color={colors.mutedForeground} accessible={false} />
    </Pressable>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={'Mark ' + label.toLowerCase() + (set.completed ? ' incomplete' : ' complete')} accessibilityState={{ checked: set.completed }} onPress={onToggle} style={styles.check}>
      <View style={[styles.mark, { borderColor: set.completed ? colors.success : colors.borderStrong, backgroundColor: set.completed ? colors.elevated : colors.background }]}>
        {set.completed ? <Check size={16} color={colors.success} strokeWidth={2.3} accessible={false} /> : null}
      </View>
    </Pressable>
  </View>;
});
const styles = StyleSheet.create({ row: { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }, edit: { flex: 1, minHeight: 68, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, check: { minWidth: 48, minHeight: 56, alignItems: 'center', justifyContent: 'center' }, mark: { width: 28, height: 28, borderWidth: 1, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' } });
