import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { WorkoutExercise } from '@/features/workout/workoutReducer';

export type DraftExercise = WorkoutExercise;

export type DraftData = {
  workoutTitle: string;
  exercises: DraftExercise[];
  selectedPlanId: string;
  existingLogId: string | null;
  savedAt: number;
};

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

const key = (userId: string, date: string) => `workout-draft:${userId}:${date}`;

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  resolve: (saved: boolean) => void;
};

/** Read today's persisted draft without mounting the logger or starting autosave effects. */
export async function readWorkoutDraft(
  userId: string,
  dateKey: string,
): Promise<DraftData | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId, dateKey));
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftData;
    if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
      await AsyncStorage.removeItem(key(userId, dateKey));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/** Port of useWorkoutDraft onto AsyncStorage (sessionStorage has no RN analogue). */
export function useWorkoutDraft(userId: string | undefined, dateKey: string) {
  const identity = useMemo(() => ({ userId, dateKey }), [dateKey, userId]);
  const activeIdentityRef = useRef(identity);
  const pendingRef = useRef<PendingSave | null>(null);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const operationVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve(false);
    pendingRef.current = null;
  }, []);

  const enqueueStorage = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = operationQueueRef.current.then(operation, operation);
    operationQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const saveDraftNow = useCallback(
    (data: Omit<DraftData, 'savedAt'>): Promise<boolean> => {
      if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
        return Promise.resolve(false);
      }

      cancelPending();
      const operationVersion = ++operationVersionRef.current;
      const draft: DraftData = { ...data, savedAt: Date.now() };
      setDraftStatus('saving');

      return enqueueStorage(async () => {
        const isCurrent = () =>
          mountedRef.current &&
          activeIdentityRef.current === identity &&
          operationVersionRef.current === operationVersion;

        if (!isCurrent()) return false;
        try {
          await AsyncStorage.setItem(key(userId, dateKey), JSON.stringify(draft));
          if (!isCurrent()) return false;
          setDraftStatus('saved');
          return true;
        } catch {
          if (!isCurrent()) return false;
          setDraftStatus('error');
          return false;
        }
      });
    },
    [cancelPending, dateKey, enqueueStorage, identity, userId],
  );

  const saveDraft = useCallback(
    (data: Omit<DraftData, 'savedAt'>): Promise<boolean> => {
      if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
        return Promise.resolve(false);
      }

      cancelPending();
      setDraftStatus('saving');

      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          pendingRef.current = null;
          void saveDraftNow(data).then(resolve);
        }, 500);
        pendingRef.current = { timer, resolve };
      });
    },
    [cancelPending, identity, saveDraftNow, userId],
  );

  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    if (!userId) return null;
    return readWorkoutDraft(userId, dateKey);
  }, [userId, dateKey]);

  const clearDraft = useCallback((): Promise<boolean> => {
    if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
      return Promise.resolve(false);
    }

    cancelPending();
    const operationVersion = ++operationVersionRef.current;

    return enqueueStorage(async () => {
      try {
        await AsyncStorage.removeItem(key(userId, dateKey));
        const isCurrent =
          mountedRef.current &&
          activeIdentityRef.current === identity &&
          operationVersionRef.current === operationVersion;
        if (isCurrent) setDraftStatus('idle');
        return isCurrent;
      } catch {
        const isCurrent =
          mountedRef.current &&
          activeIdentityRef.current === identity &&
          operationVersionRef.current === operationVersion;
        if (isCurrent) setDraftStatus('error');
        return false;
      }
    });
  }, [cancelPending, dateKey, enqueueStorage, identity, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationVersionRef.current += 1;
      cancelPending();
    };
  }, [cancelPending]);

  useLayoutEffect(() => {
    activeIdentityRef.current = identity;
    operationVersionRef.current += 1;
    cancelPending();
    setDraftStatus('idle');
  }, [cancelPending, identity]);

  return { saveDraft, saveDraftNow, loadDraft, clearDraft, draftStatus };
}
