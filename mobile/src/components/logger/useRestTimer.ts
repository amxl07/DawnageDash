import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const storageKey = (userId: string) => `rest-timer:${userId}`;

type PersistedRestTimer = {
  version: 1;
  duration: number;
  endsAt: number | null;
  pausedRemainingMs: number | null;
};

function parsePersistedTimer(raw: string | null): PersistedRestTimer | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PersistedRestTimer>;
    if (
      value.version !== 1 ||
      typeof value.duration !== 'number' ||
      !Number.isFinite(value.duration) ||
      value.duration <= 0 ||
      (value.endsAt !== null &&
        (typeof value.endsAt !== 'number' || !Number.isFinite(value.endsAt))) ||
      (value.pausedRemainingMs !== null &&
        (typeof value.pausedRemainingMs !== 'number' ||
          !Number.isFinite(value.pausedRemainingMs) ||
          value.pausedRemainingMs <= 0)) ||
      (value.endsAt == null && value.pausedRemainingMs == null) ||
      (value.endsAt != null && value.pausedRemainingMs != null)
    ) {
      return null;
    }

    return value as PersistedRestTimer;
  } catch {
    return null;
  }
}

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
export function RestTimerProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [duration, setDuration] = useState(90);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  const [complete, setComplete] = useState(false);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const interactionVersionRef = useRef(0);
  const hydrationVersionRef = useRef(0);
  const storageQueueRef = useRef<Promise<void>>(Promise.resolve());

  const queueStorage = useCallback(
    (operation: () => Promise<void>) => {
      storageQueueRef.current = storageQueueRef.current
        .catch(() => undefined)
        .then(operation)
        .catch(() => undefined);
    },
    [],
  );

  const persist = useCallback(
    (value: PersistedRestTimer | null) => {
      queueStorage(() =>
        value
          ? AsyncStorage.setItem(storageKey(userId), JSON.stringify(value))
          : AsyncStorage.removeItem(storageKey(userId)),
      );
    },
    [queueStorage, userId],
  );

  const advanceGeneration = useCallback(() => {
    const next = generationRef.current + 1;
    generationRef.current = next;
    setGeneration(next);
    return next;
  }, []);

  useEffect(() => {
    const hydrationVersion = ++hydrationVersionRef.current;
    const interactionVersion = interactionVersionRef.current;
    let active = true;

    void AsyncStorage.getItem(storageKey(userId)).then((raw) => {
      if (
        !active ||
        hydrationVersionRef.current !== hydrationVersion ||
        interactionVersionRef.current !== interactionVersion
      ) {
        return;
      }

      const persisted = parsePersistedTimer(raw);
      if (!persisted) {
        if (raw) persist(null);
        return;
      }

      advanceGeneration();
      firedRef.current = false;
      setDuration(persisted.duration);
      setComplete(false);

      if (persisted.endsAt !== null) {
        if (persisted.endsAt <= Date.now()) {
          endsAtRef.current = null;
          firedRef.current = true;
          setEndsAt(null);
          setPausedRemainingMs(null);
          setRemaining(0);
          setComplete(true);
          persist(null);
          return;
        }

        endsAtRef.current = persisted.endsAt;
        setEndsAt(persisted.endsAt);
        setPausedRemainingMs(null);
        setRemaining(remainingAt(persisted.endsAt, Date.now()));
        return;
      }

      endsAtRef.current = null;
      setEndsAt(null);
      setPausedRemainingMs(persisted.pausedRemainingMs);
      setRemaining(Math.max(1, Math.round((persisted.pausedRemainingMs ?? 0) / 1000)));
    }).catch(() => undefined);

    return () => {
      active = false;
      hydrationVersionRef.current += 1;
    };
  }, [advanceGeneration, persist, userId]);

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
      interactionVersionRef.current += 1;
      advanceGeneration();
      setRemaining(0);
      setComplete(true);
      setEndsAt(null);
      setPausedRemainingMs(null);
      persist(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('Rest over.');
    },
    [advanceGeneration, persist],
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
    interactionVersionRef.current += 1;
    advanceGeneration();
    endsAtRef.current = nextEndsAt;
    firedRef.current = false;
    setDuration(seconds);
    setRemaining(seconds);
    setComplete(false);
    setPausedRemainingMs(null);
    setEndsAt(nextEndsAt);
    persist({ version: 1, duration: seconds, endsAt: nextEndsAt, pausedRemainingMs: null });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [advanceGeneration, persist]);

  const running = endsAt !== null && pausedRemainingMs === null;

  const toggle = useCallback(() => {
    if (running && endsAt !== null) {
      const now = Date.now();
      if (now >= endsAt) {
        finish(generationRef.current, endsAt, now);
        return;
      }
      const nextRemainingMs = endsAt - now;
      interactionVersionRef.current += 1;
      advanceGeneration();
      endsAtRef.current = null;
      setRemaining(remainingAt(endsAt, now));
      setPausedRemainingMs(nextRemainingMs);
      setEndsAt(null);
      persist({ version: 1, duration, endsAt: null, pausedRemainingMs: nextRemainingMs });
      return;
    }

    if (pausedRemainingMs !== null) {
      const nextEndsAt = Date.now() + pausedRemainingMs;
      interactionVersionRef.current += 1;
      advanceGeneration();
      endsAtRef.current = nextEndsAt;
      setComplete(false);
      setEndsAt(nextEndsAt);
      setPausedRemainingMs(null);
      persist({ version: 1, duration, endsAt: nextEndsAt, pausedRemainingMs: null });
      return;
    }

    start(duration);
  }, [advanceGeneration, duration, endsAt, finish, pausedRemainingMs, persist, running, start]);

  const reset = useCallback(() => {
    interactionVersionRef.current += 1;
    advanceGeneration();
    endsAtRef.current = null;
    firedRef.current = false;
    setEndsAt(null);
    setPausedRemainingMs(null);
    setRemaining(duration);
    setComplete(false);
    persist(null);
  }, [advanceGeneration, duration, persist]);

  const skip = useCallback(() => {
    interactionVersionRef.current += 1;
    advanceGeneration();
    endsAtRef.current = null;
    firedRef.current = true;
    setEndsAt(null);
    setPausedRemainingMs(null);
    setRemaining(0);
    setComplete(false);
    persist(null);
  }, [advanceGeneration, persist]);

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
