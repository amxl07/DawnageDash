import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export const REST_PRESETS = [60, 90, 120, 180];

/**
 * Rest timer state, driven by an absolute `endsAt` timestamp.
 *
 * NOT a decrementing interval. RN timers are throttled or suspended when the
 * app backgrounds — which is exactly when a rest timer is in use (screen off,
 * phone in a pocket). An interval-based countdown freezes or drifts; deriving
 * remaining time from Date.now() on every tick and on every foreground stays
 * correct. PerfectGymCoach's version has this bug; ours does not.
 *
 * Lifted out of the widget so the compact card and the full-screen view can
 * share one timer rather than each running their own.
 */
export function useRestTimer() {
  const [duration, setDuration] = useState(90);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  const [complete, setComplete] = useState(false);
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
        setComplete(true);
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

  const start = useCallback((secs: number) => {
    setDuration(secs);
    firedRef.current = false;
    setComplete(false);
    setPausedRemaining(null);
    setEndsAt(Date.now() + secs * 1000);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const running = endsAt !== null && pausedRemaining === null;

  const toggle = useCallback(() => {
    if (running && endsAt !== null) {
      setPausedRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
      setEndsAt(null);
    } else if (pausedRemaining !== null) {
      firedRef.current = false;
      setComplete(false);
      setEndsAt(Date.now() + pausedRemaining * 1000);
      setPausedRemaining(null);
    } else {
      start(duration);
    }
  }, [running, endsAt, pausedRemaining, duration, start]);

  const reset = useCallback(() => {
    setEndsAt(null);
    setPausedRemaining(null);
    firedRef.current = false;
    setComplete(false);
    setRemaining(duration);
  }, [duration]);

  const skip = useCallback(() => {
    setEndsAt(null);
    setPausedRemaining(null);
    firedRef.current = true;
    setComplete(false);
    setRemaining(0);
  }, []);

  const progress = duration > 0 ? 1 - remaining / duration : 0;

  return {
    duration,
    remaining,
    progress: Math.max(0, Math.min(1, progress)),
    running,
    complete,
    start,
    toggle,
    reset,
    skip,
  };
}

export type RestTimerState = ReturnType<typeof useRestTimer>;
