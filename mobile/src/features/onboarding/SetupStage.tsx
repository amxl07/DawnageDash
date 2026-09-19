import { ArrowUpRight, CalendarCheck, Check, Dumbbell, Flame, Trophy } from 'lucide-react-native';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { GOAL_LABELS, type PrimaryGoal, type SetupStageIndex, type SetupValues } from './setup-model';

const goals = [
  { value: 'fat_loss', detail: 'Build habits that support sustainable change.', icon: Flame },
  { value: 'muscle_gain', detail: 'Get stronger with purposeful training.', icon: Dumbbell },
  { value: 'performance', detail: 'Train for what you want to do better.', icon: Trophy },
  { value: 'consistency', detail: 'Find a routine that fits your life.', icon: CalendarCheck },
] as const;

export function SetupStage({ stage, values, disabled, onGoal, onTimezone, onEditGoal, timezoneTriggerRef }: {
  stage: SetupStageIndex; values: SetupValues; disabled: boolean;
  onGoal: (goal: PrimaryGoal) => void; onTimezone: () => void; onEditGoal: () => void;
  timezoneTriggerRef?: RefObject<View | null>;
}) {
  const { colors } = useTheme();
  if (stage === 0) return <View style={{ gap: spacing.md }}>
    {goals.map(({ value, detail, icon: Icon }) => {
      const selected = values.primaryGoal === value;
      return <Pressable key={value} testID={'setup-goal-' + value} accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled}
        accessibilityLabel={GOAL_LABELS[value] + '. ' + detail} onPress={() => onGoal(value)}
        style={({ pressed }) => [styles.goal, {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: pressed ? colors.pressed : selected ? colors.primarySoft : colors.card,
        }]}> 
        <View style={[styles.goalIcon, { backgroundColor: colors.background }]}><Icon size={22} color={selected ? colors.primary : colors.mutedForeground} strokeWidth={1.7} accessible={false} /></View>
        <View style={styles.copy}><Text variant="h2">{GOAL_LABELS[value]}</Text><Text variant="bodySm" tone="muted">{detail}</Text></View>
        <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.borderStrong, backgroundColor: selected ? colors.primaryFill : undefined }]} accessible={false}>
          {selected ? <Check size={13} color={colors.onPrimary} strokeWidth={2.5} /> : null}
        </View>
      </Pressable>;
    })}
    <Text variant="bodySm" tone="muted" style={{ marginTop: spacing.sm }}>A starting point, with room to evolve.</Text>
  </View>;

  if (stage === 1) return <View style={{ gap: 28 }}>
    {[
      ['01', 'A moment for your day', 'Check in with your training, nutrition and recovery. Honest answers give your coach useful context.'],
      ['02', 'A plan to come back to', 'Find your sessions in one place. Log each set as you train, then pick up where you left off.'],
      ['03', 'A longer view', 'Review your week with your coach. Small observations make the next conversation more useful.'],
    ].map(([number, title, detail]) => <View key={number} style={[styles.rhythm, { borderColor: colors.border }]}>
      <Text variant="bodySm" tone="primary" numeric style={{ width: 28, paddingTop: 3 }}>{number}</Text>
      <View style={styles.copy}><Text variant="h2">{title}</Text><Text variant="bodySm" tone="muted">{detail}</Text></View>
    </View>)}
    <Text variant="bodySm" tone="muted">No perfect days required. Just a clearer picture of you.</Text>
  </View>;

  return <View style={{ gap: 24 }}>
    <Card style={{ padding: 24, gap: 24, borderRadius: 24 }}>
      <ReviewRow label="Your focus" value={values.primaryGoal ? GOAL_LABELS[values.primaryGoal] : 'Choose a goal'} onPress={onEditGoal} disabled={disabled} />
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <ReviewRow label="Profile timezone" value={values.timezone.replace(/_/g, ' ')} onPress={onTimezone} disabled={disabled} triggerRef={timezoneTriggerRef} />
    </Card>
    <View style={{ gap: spacing.sm }}>
      <Text variant="h2">Make yourself at home.</Text>
      <Text variant="bodySm" tone="muted">Your daily record and training plan are ready to explore. You can complete your detailed coaching assessment from your profile at any time.</Text>
      <Text variant="bodySm" tone="muted">Reminders are optional. When enabled, they follow the local time on this device.</Text>
    </View>
  </View>;
}

function ReviewRow({ label, value, onPress, disabled, triggerRef }: { label: string; value: string; onPress: () => void; disabled: boolean; triggerRef?: RefObject<View | null> }) {
  const { colors } = useTheme();
  return <Pressable ref={triggerRef} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={'Change ' + label.toLowerCase() + ': ' + value} style={({ pressed }) => [styles.review, { backgroundColor: pressed ? colors.pressed : 'transparent' }]}>
    <View style={styles.copy}><Text variant="bodySm" tone="muted">{label}</Text><Text variant="h2">{value}</Text></View>
    <ArrowUpRight size={20} color={colors.primary} accessible={false} />
  </Pressable>;
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, minHeight: 100, borderRadius: 22, borderWidth: 1 },
  goalIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  radio: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rhythm: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, paddingTop: 24 },
  review: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.base },
});
