import * as Haptics from 'expo-haptics';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export const REST_PRESETS = [60, 90, 120, 180];

export function remainingAt(endsAt: number, now: number): number {
  return Math.max(0, Math.round((endsAt - now) / 1000));
}

export type RestTimerState = {
  duration: number;
  remaining: number;
  progress: number;
  running: boolean;
  complete: boolean;
  start: (seconds: number) => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
};

const RestTimerContext = createContext<RestTimerState | null>(null);

/**
 * Owns one rest-timer run above navigation so screen and consumer remounts do
 * not create a second clock. The display interval only requests refreshes;
 * elapsed time always comes from the absolute end timestamp.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [duration, setDuration] = useState(90);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  const [complete, setComplete] = useState(false);
  const firedRef = useRef(false);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setRemaining(0);
    setComplete(true);
    setEndsAt(null);
    setPausedRemaining(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility('Rest over.');
  }, []);

  const syncFromClock = useCallback(() => {
    if (endsAt === null || pausedRemaining !== null) return;
    const next = remainingAt(endsAt, Date.now());
    setRemaining(next);
    if (next === 0) finish();
  }, [endsAt, finish, pausedRemaining]);

  useEffect(() => {
    if (endsAt === null || pausedRemaining !== null) return;
    syncFromClock();
    const id = setInterval(syncFromClock, 250);
    return () => clearInterval(id);
  }, [endsAt, pausedRemaining, syncFromClock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncFromClock();
    });
    return () => subscription.remove();
  }, [syncFromClock]);

  const start = useCallback((seconds: number) => {
    firedRef.current = false;
    setDuration(seconds);
    setRemaining(seconds);
    setComplete(false);
    setPausedRemaining(null);
    setEndsAt(Date.now() + seconds * 1000);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const running = endsAt !== null && pausedRemaining === null;

  const toggle = useCallback(() => {
    if (running && endsAt !== null) {
      const next = remainingAt(endsAt, Date.now());
      if (next === 0) {
        finish();
        return;
      }
      setRemaining(next);
      setPausedRemaining(next);
      setEndsAt(null);
      return;
    }

    if (pausedRemaining !== null) {
      setComplete(false);
      setEndsAt(Date.now() + pausedRemaining * 1000);
      setPausedRemaining(null);
      return;
    }

    start(duration);
  }, [duration, endsAt, finish, pausedRemaining, running, start]);

  const reset = useCallback(() => {
    firedRef.current = false;
    setEndsAt(null);
    setPausedRemaining(null);
    setRemaining(duration);
    setComplete(false);
  }, [duration]);

  const skip = useCallback(() => {
    firedRef.current = true;
    setEndsAt(null);
    setPausedRemaining(null);
    setRemaining(0);
    setComplete(false);
  }, []);

  const value = useMemo<RestTimerState>(() => {
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
  }, [complete, duration, remaining, reset, running, skip, start, toggle]);

  return createElement(RestTimerContext.Provider, { value }, children);
}

export function useRestTimer(): RestTimerState {
  const timer = useContext(RestTimerContext);
  if (!timer) throw new Error('useRestTimer must be used inside <RestTimerProvider>');
  return timer;
}
