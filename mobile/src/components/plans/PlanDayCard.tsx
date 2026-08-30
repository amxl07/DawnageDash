import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { PlanDay } from '@/hooks/usePlans';
import type { PlanDayStatus } from '@/hooks/usePlanProgress';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useMotion, useTheme } from '@/theme';

type Props = {
  day: PlanDay;
  status: PlanDayStatus;
  onStart: () => void;
  testID?: string;
};

const STATUS_LABEL: Record<PlanDayStatus, string> = {
  today: 'Today',
  active: 'Active',
  complete: 'Complete',
  upcoming: 'Upcoming',
};

const actionLabel = (status: PlanDayStatus, dayNumber: number): string => {
  if (status === 'active') return `Continue Day ${dayNumber}`;
  if (status === 'complete') return `Repeat Day ${dayNumber}`;
  return `Start Day ${dayNumber}`;
};

export function PlanDayCard({ day, status, onStart, testID }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const statusLabel = STATUS_LABEL[status];
  const exerciseCount = `${day.exercises.length} ${
    day.exercises.length === 1 ? 'exercise' : 'exercises'
  }`;
  const summary = day.focus ? `${day.focus} · ${exerciseCount}` : exerciseCount;
  const disclosureLabel = `Day ${day.day_number}${
    day.focus ? `, ${day.focus}` : ''
  }, ${exerciseCount}, status: ${statusLabel}`;
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggleExpanded = () => {
    const next = !open;
    setOpen(next);
    rotation.value = motion.enabled
      ? withTiming(next ? 180 : 0, {
          duration: 160,
          easing: Easing.bezier(...motion.easing.standard),
        })
      : next
        ? 180
        : 0;
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        testID={testID}
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={disclosureLabel}
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: HIT_SLOP_MIN }}
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
        <Animated.View style={chevronStyle}>
          <ChevronDown
            size={iconSize.md}
            color={colors.mutedForeground}
            strokeWidth={2}
            accessible={false}
          />
        </Animated.View>
      </Pressable>

      {open ? (
        <Animated.View
          testID="plan-day-expanded-content"
          entering={
            motion.enabled ? FadeIn.duration(Math.min(200, motion.duration.enter)) : undefined
          }
          style={{ gap: spacing.md }}
        >
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
                    style={{
                      minWidth: HIT_SLOP_MIN,
                      minHeight: HIT_SLOP_MIN,
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
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
            </View>
          ))}

          <Button
            label={actionLabel(status, day.day_number)}
            variant="secondary"
            onPress={onStart}
            style={{ minHeight: HIT_SLOP_MIN }}
          />
        </Animated.View>
      ) : null}
    </Card>
  );
}
