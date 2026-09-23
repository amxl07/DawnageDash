import * as WebBrowser from 'expo-web-browser';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { Text } from '@/components/ui/Text';
import type { PlanDay, PlanExercise } from '@/hooks/usePlans';
import type { PlanDayStatus } from '@/hooks/usePlanProgress';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  day: PlanDay;
  status: PlanDayStatus | 'unknown';
  onStart?: () => void;
  onShowDetails: (exercise: PlanExercise) => void;
  testID?: string;
};

const STATUS_LABEL: Record<PlanDayStatus | 'unknown', string> = {
  unknown: 'Status unavailable',
  today: 'Today',
  active: 'Active',
  complete: 'Complete',
  upcoming: 'Upcoming',
};

const actionLabel = (status: PlanDayStatus | 'unknown', dayNumber: number): string => {
  if (status === 'active') return `Continue Day ${dayNumber}`;
  if (status === 'complete') return `Repeat Day ${dayNumber}`;
  return `Start Day ${dayNumber}`;
};

export function PlanDayCard({ day, status, onStart, onShowDetails, testID }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const statusLabel = onStart ? STATUS_LABEL[status] : 'Preview';
  const exerciseCount = `${day.exercises.length} ${
    day.exercises.length === 1 ? 'exercise' : 'exercises'
  }`;
  const summary = day.focus ? `${day.focus} · ${exerciseCount}` : exerciseCount;
  const disclosureLabel = `Day ${day.day_number}${
    day.focus ? `, ${day.focus}` : ''
  }, ${exerciseCount}, status: ${statusLabel}`;
  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        testID={testID}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={disclosureLabel}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.pressed : 'transparent',
        })}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="h2">Day {day.day_number}</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor:
                  status === 'today' || status === 'active'
                    ? colors.primary
                    : colors.borderStrong,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <Text
                variant="label"
                tone={
                  status === 'complete'
                    ? 'success'
                    : status === 'today' || status === 'active'
                      ? 'primary'
                      : 'muted'
                }
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text variant="bodySm" tone="muted">
            {summary}
          </Text>
        </View>
        <DisclosureChevron expanded={open} size={iconSize.md} color={colors.mutedForeground} />
      </Pressable>

      <MotionReveal
        testID="plan-day-expanded-content"
        revision={open ? 'open' : 'closed'}
        style={{ gap: spacing.md }}
      >
        {open ? (
          <View style={{ gap: spacing.md }}>
          {day.notes ? (
            <Text variant="bodySm" tone="muted">
              {day.notes}
            </Text>
          ) : null}

          {day.exercises.map((exercise, index) => (
            <View
              key={exercise.id ?? index}
              style={{
                gap: spacing.xs,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ flex: 1 }}>{exercise.name}</Text>
                {exercise.videoLink ? (
                  <Pressable
                    onPress={() => void WebBrowser.openBrowserAsync(exercise.videoLink!)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Watch demo for ${exercise.name}`}
                    style={({ pressed }) => ({
                      minWidth: 48,
                      minHeight: 48,
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      borderRadius: radius.sm,
                      backgroundColor: pressed ? colors.pressed : 'transparent',
                    })}
                  >
                    <Play size={iconSize.md} color={colors.primary} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
              <Text variant="bodySm" tone="muted" numeric>
                {`${exercise.sets} × ${exercise.reps || '—'}`}
              </Text>
              {exercise.notes ? (
                <Text variant="bodySm" tone="muted">
                  {exercise.notes}
                </Text>
              ) : null}
              <Pressable
                onPress={() => onShowDetails(exercise)}
                accessibilityRole="button"
                accessibilityLabel={`Show details for ${exercise.name}`}
                style={({ pressed }) => ({
                  minWidth: 48,
                  minHeight: 48,
                  alignSelf: 'flex-start',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.sm,
                  backgroundColor: pressed ? colors.pressed : 'transparent',
                })}
              >
                <Text variant="bodySm" tone="primary">Details</Text>
              </Pressable>
            </View>
          ))}

          {onStart ? <Button
            label={actionLabel(status, day.day_number)}
            variant="secondary"
            onPress={onStart}
            style={{ minHeight: 48 }}
          /> : null}
          </View>
        ) : null}
      </MotionReveal>
    </Card>
  );
}
