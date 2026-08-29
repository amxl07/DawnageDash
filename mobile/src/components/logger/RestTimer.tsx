import * as Haptics from 'expo-haptics';
import { Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

const PRESETS = [60, 90, 120, 180];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

/**
 * Rest timer driven by an absolute `endsAt` timestamp, NOT a decrementing
 * interval.
 *
 * RN timers are throttled or suspended when the app backgrounds — which is
 * exactly when a rest timer is in use (screen off, phone in pocket). An
 * interval-based countdown freezes or drifts; deriving remaining time from
 * Date.now() on every tick and on every foreground stays correct.
 */
export function RestTimer() {
  const { colors } = useTheme();
  const [duration, setDuration] = useState(90);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  const firedRef = useRef(false);

  const compute = useCallback(() => {
    if (pausedRemaining !== null) return pausedRemaining;
    if (endsAt === null) return duration;
    return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  }, [endsAt, pausedRemaining, duration]);

  useEffect(() => {
    setRemaining(compute());
    if (endsAt === null || pausedRemaining !== null) return;

    const id = setInterval(() => {
      const next = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !firedRef.current) {
        firedRef.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility('Rest over.');
        setEndsAt(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, pausedRemaining, compute]);

  // Recompute immediately on foreground rather than trusting the interval.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setRemaining(compute());
    });
    return () => sub.remove();
  }, [compute]);

  const start = (secs: number) => {
    setDuration(secs);
    firedRef.current = false;
    setPausedRemaining(null);
    setEndsAt(Date.now() + secs * 1000);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const running = endsAt !== null && pausedRemaining === null;

  const toggle = () => {
    if (running) {
      setPausedRemaining(Math.max(0, Math.round((endsAt! - Date.now()) / 1000)));
      setEndsAt(null);
    } else if (pausedRemaining !== null) {
      firedRef.current = false;
      setEndsAt(Date.now() + pausedRemaining * 1000);
      setPausedRemaining(null);
    } else {
      start(duration);
    }
  };

  const reset = () => {
    setEndsAt(null);
    setPausedRemaining(null);
    firedRef.current = false;
    setRemaining(duration);
  };

  const progress = duration > 0 ? 1 - remaining / duration : 0;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Timer size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          Rest timer
        </Text>
        {/* Time is text, not only an arc. */}
        <Text
          variant="h2"
          numeric
          tone={remaining === 0 && endsAt === null && pausedRemaining === null ? 'muted' : 'default'}
          accessibilityLabel={`${mmss(remaining)} remaining`}
        >
          {mmss(remaining)}
        </Text>
      </View>

      <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.elevated }}>
        <View
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => start(p)}
            accessibilityRole="button"
            accessibilityLabel={`Start ${p / 60} minute rest`}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: duration === p ? colors.primary : colors.borderStrong,
            }}
          >
            <Text variant="bodySm" tone={duration === p ? 'primary' : 'muted'} numeric>
              {mmss(p)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'center' }}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Pause rest timer' : 'Start rest timer'}
          style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
        >
          {running ? (
            <Pause size={iconSize.lg} color={colors.primary} strokeWidth={2} />
          ) : (
            <Play size={iconSize.lg} color={colors.primary} strokeWidth={2} />
          )}
        </Pressable>
        <Pressable
          onPress={reset}
          accessibilityRole="button"
          accessibilityLabel="Reset rest timer"
          style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
        >
          <RotateCcw size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => {
            setEndsAt(null);
            setPausedRemaining(null);
            setRemaining(0);
          }}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
          style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
        >
          <SkipForward size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </View>
    </Card>
  );
}
