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
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  const [complete, setComplete] = useState(false);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const advanceGeneration = useCallback(() => {
    const next = generationRef.current + 1;
    generationRef.current = next;
    setGeneration(next);
    return next;
  }, []);

  const finish = useCallback(
    (expectedGeneration: number, expectedEndsAt: number, now = Date.now()) => {
      if (
        generationRef.current !== expectedGeneration ||
        endsAtRef.current !== expectedEndsAt ||
        now < expectedEndsAt ||
        firedRef.current
      ) {
        return;
      }
      firedRef.current = true;
      endsAtRef.current = null;
      advanceGeneration();
      setRemaining(0);
      setComplete(true);
      setEndsAt(null);
      setPausedRemainingMs(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('Rest over.');
    },
    [advanceGeneration],
  );

  const syncFromClock = useCallback(
    (expectedGeneration: number, expectedEndsAt: number) => {
      if (
        generationRef.current !== expectedGeneration ||
        endsAtRef.current !== expectedEndsAt
      ) {
        return;
      }
      const now = Date.now();
      setRemaining(remainingAt(expectedEndsAt, now));
      if (now >= expectedEndsAt) finish(expectedGeneration, expectedEndsAt, now);
    },
    [finish],
  );

  useEffect(() => {
    if (endsAt === null || pausedRemainingMs !== null) return;
    const tick = () => syncFromClock(generation, endsAt);
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt, generation, pausedRemainingMs, syncFromClock]);

  useEffect(() => {
    if (endsAt === null || pausedRemainingMs !== null) return;
    const expectedGeneration = generation;
    const expectedEndsAt = endsAt;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncFromClock(expectedGeneration, expectedEndsAt);
    });
    return () => subscription.remove();
  }, [endsAt, generation, pausedRemainingMs, syncFromClock]);

  const start = useCallback((seconds: number) => {
    const nextEndsAt = Date.now() + seconds * 1000;
    advanceGeneration();
    endsAtRef.current = nextEndsAt;
    firedRef.current = false;
    setDuration(seconds);
    setRemaining(seconds);
    setComplete(false);
    setPausedRemainingMs(null);
    setEndsAt(nextEndsAt);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [advanceGeneration]);

  const running = endsAt !== null && pausedRemainingMs === null;

  const toggle = useCallback(() => {
    if (running && endsAt !== null) {
      const now = Date.now();
      if (now >= endsAt) {
        finish(generationRef.current, endsAt, now);
        return;
      }
      const nextRemainingMs = endsAt - now;
      advanceGeneration();
      endsAtRef.current = null;
      setRemaining(remainingAt(endsAt, now));
      setPausedRemainingMs(nextRemainingMs);
      setEndsAt(null);
      return;
    }

    if (pausedRemainingMs !== null) {
      const nextEndsAt = Date.now() + pausedRemainingMs;
      advanceGeneration();
      endsAtRef.current = nextEndsAt;
      setComplete(false);
      setEndsAt(nextEndsAt);
      setPausedRemainingMs(null);
      return;
    }

    start(duration);
  }, [advanceGeneration, duration, endsAt, finish, pausedRemainingMs, running, start]);

  const reset = useCallback(() => {
    advanceGeneration();
    endsAtRef.current = null;
    firedRef.current = false;
    setEndsAt(null);
    setPausedRemainingMs(null);
    setRemaining(duration);
    setComplete(false);
  }, [advanceGeneration, duration]);

  const skip = useCallback(() => {
    advanceGeneration();
    endsAtRef.current = null;
    firedRef.current = true;
    setEndsAt(null);
    setPausedRemainingMs(null);
    setRemaining(0);
    setComplete(false);
  }, [advanceGeneration]);

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
