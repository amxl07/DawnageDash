import { Maximize2, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { CircularTimer } from './CircularTimer';
import { REST_PRESETS, useRestTimer, type RestTimerState } from './useRestTimer';

const mmss = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

function Controls({ timer, size = iconSize.lg }: { timer: RestTimerState; size?: number }) {
  const { colors } = useTheme();
  const btn = {
    minWidth: HIT_SLOP_MIN,
    minHeight: HIT_SLOP_MIN,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' }}>
      <Pressable
        onPress={timer.toggle}
        accessibilityRole="button"
        accessibilityLabel={timer.running ? 'Pause rest timer' : 'Start rest timer'}
        style={btn}
      >
        {timer.running ? (
          <Pause size={size} color={colors.primary} strokeWidth={2} />
        ) : (
          <Play size={size} color={colors.primary} strokeWidth={2} />
        )}
      </Pressable>
      <Pressable
        onPress={timer.reset}
        accessibilityRole="button"
        accessibilityLabel="Reset rest timer"
        style={btn}
      >
        <RotateCcw size={size} color={colors.mutedForeground} strokeWidth={2} />
      </Pressable>
      <Pressable
        onPress={timer.skip}
        accessibilityRole="button"
        accessibilityLabel="Skip rest"
        style={btn}
      >
        <SkipForward size={size} color={colors.mutedForeground} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function Presets({ timer }: { timer: RestTimerState }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {REST_PRESETS.map((p) => (
        <Pressable
          key={p}
          onPress={() => timer.start(p)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${p / 60} minute rest`}
          accessibilityState={{ selected: timer.duration === p }}
          style={{
            flex: 1,
            minHeight: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: timer.duration === p ? colors.primary : colors.borderStrong,
          }}
        >
          <Text variant="bodySm" tone={timer.duration === p ? 'primary' : 'muted'} numeric>
            {mmss(p)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Rest timer.
 *
 * PerfectGymCoach gives rest a dedicated full-screen RestScreen, on the
 * principle that rest is a state of the workout rather than a widget in a
 * corner. That works for their guided one-exercise-at-a-time flow; ours is a
 * free-form swipeable logger where an automatic takeover would block logging
 * the next set. So the takeover is opt-in: the compact card lives in the
 * scroll, and Focus raises the same timer full-screen.
 */
export function RestTimer({ contextLabel }: { contextLabel?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const timer = useRestTimer();
  const [focused, setFocused] = useState(false);

  return (
    <>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="label" tone="muted" style={{ flex: 1 }}>
            Rest timer
          </Text>
          <Pressable
            onPress={() => setFocused(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Show rest timer full screen"
            style={{ minHeight: HIT_SLOP_MIN, justifyContent: 'center' }}
          >
            <Maximize2 size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center' }}>
          <CircularTimer
            progress={timer.progress}
            remainingSeconds={timer.remaining}
            complete={timer.complete}
            size={132}
            strokeWidth={8}
          />
        </View>

        <Presets timer={timer} />
        <Controls timer={timer} />
      </Card>

      <Modal
        visible={focused}
        animationType="fade"
        onRequestClose={() => setFocused(false)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <View style={{ flexDirection: 'row', padding: spacing.base }}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => setFocused(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close full screen rest timer"
              style={{
                minWidth: HIT_SLOP_MIN,
                minHeight: HIT_SLOP_MIN,
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <X size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
            </Pressable>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xl,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Text variant="label" tone="muted">
              {timer.complete ? 'Rest complete' : 'Resting'}
            </Text>

            <CircularTimer
              progress={timer.progress}
              remainingSeconds={timer.remaining}
              complete={timer.complete}
              size={260}
              strokeWidth={12}
            />

            {contextLabel ? (
              <Text variant="h2" style={{ textAlign: 'center' }}>
                Up next · {contextLabel}
              </Text>
            ) : null}

            <View style={{ alignSelf: 'stretch', gap: spacing.lg }}>
              <Presets timer={timer} />
              <Controls timer={timer} size={iconSize.xl} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
