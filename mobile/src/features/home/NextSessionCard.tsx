import { ArrowUpRight, Dumbbell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { PlanDay } from '@/hooks/usePlans';
import { radius, spacing, useTheme } from '@/theme';

export function NextSessionCard({ day, onPress, allLogged = false, pending = false }: { day: PlanDay; onPress: () => void; allLogged?: boolean; pending?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={allLogged ? 'Review plan. All assigned sessions recorded this week.' + (pending ? ' Some records are waiting to sync.' : '') : 'View next session: ' + (day.focus || 'Training') + ', day ' + day.day_number + ', ' + day.exercises.length + ' exercises'}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.elevated : colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.elevated }]}><Dumbbell size={25} color={colors.foreground} strokeWidth={1.5} accessible={false} /></View>
      <View style={styles.copy}>
        {allLogged ? <>
          <Text variant="label">All assigned sessions recorded.</Text>
          {pending ? <Text variant="bodySm" tone="muted">Some records are waiting to sync.</Text> : null}
          <Text variant="bodySm" tone="primary">Review plan</Text>
        </> : <>
          <Text variant="overline" tone="muted">Next session</Text>
          <Text variant="label">{day.focus || 'Training session'}</Text>
          <Text variant="bodySm" tone="muted">Day {day.day_number} · {day.exercises.length} exercises</Text>
        </>}
      </View>
      <ArrowUpRight size={20} color={colors.mutedForeground} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 48, padding: spacing.base, borderRadius: radius.card, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
});
