import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { isDateKeyStrict } from '@/lib/dates';

import type { WorkoutExercise } from '@/features/workout/workoutReducer';

export type DraftExercise = WorkoutExercise;

export type DraftData = {
  workoutTitle: string;
  exercises: DraftExercise[];
  selectedPlanId: string;
  existingLogId: string | null;
  savedAt: number;
  /** Local source protection; never part of the workout wire format. */
  sourceKind?: 'structured' | 'text' | 'unknown';
  legacyText?: string;
};

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const workoutDraftKey = (userId: string, date: string, logId?: string | null) =>
  `workout-draft:${userId}:${date}${logId ? `:log:${encodeURIComponent(logId)}` : ''}`;
const key = workoutDraftKey;

type PendingSave = { timer: ReturnType<typeof setTimeout>; resolve: (saved: boolean) => void };

function parseDraft(raw: string): DraftData {
  const value = JSON.parse(raw) as DraftData;
  if (!value || typeof value.workoutTitle !== 'string' || !Array.isArray(value.exercises) ||
      typeof value.selectedPlanId !== 'string' || !Number.isFinite(value.savedAt) ||
      !(value.existingLogId === null || typeof value.existingLogId === 'string') ||
      (value.sourceKind !== undefined && !['structured', 'text', 'unknown'].includes(value.sourceKind)) ||
      (value.legacyText !== undefined && typeof value.legacyText !== 'string') ||
      (value.sourceKind === 'text' && value.legacyText === undefined) ||
      value.exercises.some((ex) => !ex || typeof ex.name !== 'string' || !Array.isArray(ex.sets) ||
        ex.sets.some((set) => !set || ['weight', 'reps', 'rpe'].some((field) => typeof set[field as 'weight'] !== 'string')))) {
    throw new Error('Workout draft is unreadable');
  }
  return value;
}

/** Storage failure is distinct from absence. Migrate only a matching legacy identity. */
export async function readWorkoutDraft(userId: string, dateKey: string, logId?: string | null): Promise<DraftData | null> {
  const scopedKey = key(userId, dateKey, logId);
  let raw = await AsyncStorage.getItem(scopedKey);
  let legacy = false;
  if (!raw && logId) { raw = await AsyncStorage.getItem(key(userId, dateKey)); legacy = Boolean(raw); }
  if (!raw) return null;
  const draft = parseDraft(raw);
  if (logId !== undefined && draft.existingLogId !== logId) return null;
  if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
    await AsyncStorage.removeItem(legacy ? key(userId, dateKey) : scopedKey);
    return null;
  }
  if (legacy) {
    await AsyncStorage.setItem(scopedKey, raw);
    await AsyncStorage.removeItem(key(userId, dateKey));
  }
  return draft;
}

/** Account-only discovery preserves an editor's reporting date across midnight. */
export async function findLatestWorkoutDraft(userId: string): Promise<{ date: string; logId: string | null; savedAt: number } | null> {
  const prefix = `workout-draft:${userId}:`;
  const keys = (await AsyncStorage.getAllKeys()).filter((entry) => entry.startsWith(prefix));
  let latest: { date: string; logId: string | null; savedAt: number } | null = null;
  for (const storageKey of keys) {
    const suffix = storageKey.slice(prefix.length);
    const date = suffix.slice(0, 10);
    if (!isDateKeyStrict(date)) throw new Error('Workout draft date is unreadable');
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) continue;
    const draft = parseDraft(raw);
    if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) continue;
    if (suffix.length > 10 && suffix !== `${date}:log:${encodeURIComponent(draft.existingLogId ?? '')}`) {
      throw new Error('Workout draft identity is unreadable');
    }
    if (!latest || draft.savedAt > latest.savedAt) latest = { date, logId: draft.existingLogId, savedAt: draft.savedAt };
  }
  return latest;
}

/** Port of useWorkoutDraft onto AsyncStorage (sessionStorage has no RN analogue). */
export function useWorkoutDraft(userId: string | undefined, dateKey: string, logId?: string | null) {
  const identity = useMemo(() => ({ userId, dateKey, logId }), [dateKey, userId, logId]);
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
          const targetKey = key(userId, dateKey, logId === undefined ? undefined : data.existingLogId);
          await AsyncStorage.setItem(targetKey, JSON.stringify(draft));
          if (targetKey !== key(userId, dateKey, logId)) {
            const oldRaw = await AsyncStorage.getItem(key(userId, dateKey, logId));
            const oldId = oldRaw ? parseDraft(oldRaw).existingLogId : null;
            if (oldId === (logId ?? null) || oldId === data.existingLogId) await AsyncStorage.removeItem(key(userId, dateKey, logId));
          }
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
    [cancelPending, dateKey, enqueueStorage, identity, userId, logId],
  );

  const saveDraft = useCallback(
    (data: Omit<DraftData, 'savedAt'>): Promise<boolean> => {
      if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
        return Promise.resolve(false);
      }

      cancelPending();
      // The newest edit becomes authoritative when it is scheduled, not when
      // its timer fires. This prevents an older in-flight write from reporting
      // itself as the current saved draft during the debounce window.
      operationVersionRef.current += 1;
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

  const associateDraft = useCallback((targetLogId: string, data: Omit<DraftData, 'savedAt'>, guard: () => boolean): Promise<boolean> => {
    if (!userId || !targetLogId || logId || data.existingLogId !== targetLogId || !mountedRef.current || activeIdentityRef.current !== identity) {
      return Promise.resolve(false);
    }
    cancelPending();
    const operationVersion = ++operationVersionRef.current;
    setDraftStatus('saving');
    return enqueueStorage(async () => {
      const isCurrent = () => mountedRef.current && activeIdentityRef.current === identity && operationVersionRef.current === operationVersion && guard();
      const sourceKey = key(userId, dateKey, null);
      const destinationKey = key(userId, dateKey, targetLogId);
      let wroteDestination = false;
      let destinationRaw = '';
      try {
        if (!isCurrent()) return false;
        const sourceRaw = await AsyncStorage.getItem(sourceKey);
        const existingDestination = await AsyncStorage.getItem(destinationKey);
        if (!sourceRaw || parseDraft(sourceRaw).existingLogId !== null) return false;
        const moved: DraftData = { ...data, existingLogId: targetLogId, savedAt: Date.now() };
        destinationRaw = JSON.stringify(moved);
        if (existingDestination) {
          const existing = parseDraft(existingDestination);
          const { savedAt: _existingSavedAt, ...existingContent } = existing;
          const { savedAt: _movedSavedAt, ...movedContent } = moved;
          if (JSON.stringify(existingContent) !== JSON.stringify(movedContent)) return false;
          destinationRaw = existingDestination;
        } else {
          await AsyncStorage.setItem(destinationKey, destinationRaw);
          wroteDestination = true;
        }
        if (!isCurrent() || await AsyncStorage.getItem(sourceKey) !== sourceRaw) {
          if (wroteDestination && await AsyncStorage.getItem(destinationKey) === destinationRaw) await AsyncStorage.removeItem(destinationKey);
          return false;
        }
        await AsyncStorage.removeItem(sourceKey);
        if (!isCurrent()) {
          await AsyncStorage.setItem(sourceKey, sourceRaw);
          if (await AsyncStorage.getItem(destinationKey) === destinationRaw) await AsyncStorage.removeItem(destinationKey);
          return false;
        }
        setDraftStatus('saved');
        return true;
      } catch {
        if (isCurrent()) setDraftStatus('error');
        return false;
      }
    });
  }, [cancelPending, dateKey, enqueueStorage, identity, logId, userId]);

  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    if (!userId) return null;
    return readWorkoutDraft(userId, dateKey, logId);
  }, [userId, dateKey, logId]);

  const clearDraft = useCallback((attachedLogId?: string | null): Promise<boolean> => {
    if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
      return Promise.resolve(false);
    }

    cancelPending();
    const operationVersion = ++operationVersionRef.current;

    return enqueueStorage(async () => {
      try {
        const oldRaw = attachedLogId && !logId ? await AsyncStorage.getItem(key(userId, dateKey, logId)) : null;
        const oldId = oldRaw ? parseDraft(oldRaw).existingLogId : null;
        if (!oldId || oldId === logId || oldId === attachedLogId) await AsyncStorage.removeItem(key(userId, dateKey, logId));
        if (attachedLogId && attachedLogId !== logId) await AsyncStorage.removeItem(key(userId, dateKey, attachedLogId));
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
  }, [cancelPending, dateKey, enqueueStorage, identity, userId, logId]);

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

  return { saveDraft, saveDraftNow, associateDraft, loadDraft, clearDraft, draftStatus };
}
