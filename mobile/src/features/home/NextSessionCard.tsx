import { ArrowUpRight, Dumbbell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { PlanDay } from '@/hooks/usePlans';
import { spacing, useTheme } from '@/theme';

export function NextSessionCard({ day, onPress, allLogged = false, pending = false }: { day: PlanDay; onPress: () => void; allLogged?: boolean; pending?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={allLogged ? 'Review your plan. Every assigned session has a saved record this week.' + (pending ? ' Some records are waiting for delivery.' : '') : 'View next session: ' + (day.focus || 'Training') + ', day ' + day.day_number + ', ' + day.exercises.length + ' exercises'}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.elevated : colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Dumbbell size={25} color={colors.primary} strokeWidth={1.5} accessible={false} /></View>
      <View style={styles.copy}>
        <Text variant="overline" tone={allLogged ? 'muted' : 'primary'}>{allLogged ? pending ? 'Saved on this device' : 'This week is logged' : 'Next session'}</Text>
        <Text variant="h2">{allLogged ? 'Your week, recorded.' : day.focus || 'Training session'}</Text>
        <Text variant="bodySm" tone="muted">{allLogged ? pending ? 'Every assigned session has a saved record. Some records are waiting for delivery.' : 'Every assigned session has a log. Review your plan whenever you need it.' : 'Day ' + day.day_number + ' · ' + day.exercises.length + ' exercises'}</Text>
        {!allLogged ? <Text variant="label" tone="primary" style={{ marginTop: spacing.sm }}>Start session</Text> : null}
      </View>
      <ArrowUpRight size={20} color={colors.mutedForeground} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
});
