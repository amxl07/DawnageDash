import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useRestTimerClock } from '@/components/logger/useRestTimer';
import { useAuth } from '@/contexts/AuthContext';
import { nativeSurfaceController } from './service';

/** Mounted above authenticated navigation so shortcuts initialize signed out too. */
export function NativeSurfaceBootstrap() {
  const { user } = useAuth();
  const account = user?.id ?? null;
  useLayoutEffect(() => { void nativeSurfaceController.setAccount(account); }, [account]);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previous !== 'active') void nativeSurfaceController.reconcile();
      previous = state;
    });
    return () => { subscription.remove(); void nativeSurfaceController.setAccount(null); };
  }, []);
  return null;
}

/** Outlives the logger: dock pause/resume/extend also reach ActivityKit. */
export function NativeWorkoutRestBridge({ userId }: { userId: string }) {
  const clock = useRestTimerClock();
  useEffect(() => { void nativeSurfaceController.updateRest(userId, clock); }, [userId, clock]);
  return null;
}

export function useWorkoutActivity(input: { userId: string; date: string; eligible: boolean; exerciseIndex: number; exercises: { sets: { completed: boolean }[] }[] }) {
  const { userId, date, eligible, exerciseIndex, exercises } = input;
  const focused = useIsFocused();
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const lease = useRef<number | null>(null);
  const exerciseCount = exercises.length;
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedSets = exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0);

  useEffect(() => {
    if (!focused || !eligible || paused) return;
    lease.current = nativeSurfaceController.claimWorkout(userId, date);
    // Blur only releases this editor's lease. The native activity remains owned
    // by its workout; returning to a retained screen claims a fresh lease.
    return () => { lease.current = null; };
  }, [userId, date, focused, eligible, paused, revision]);
  useEffect(() => {
    if (focused && eligible && !paused && lease.current !== null) void nativeSurfaceController.updateWorkout(lease.current, { exerciseIndex, exerciseCount, completedSets, totalSets });
  }, [focused, eligible, paused, revision, userId, date, exerciseIndex, exerciseCount, completedSets, totalSets]);
  const end = useCallback(() => {
    if (lease.current !== null) void nativeSurfaceController.endWorkout(lease.current);
    lease.current = null; setPaused(true);
  }, []);
  const resume = useCallback(() => { setPaused(false); }, []);
  const replace = useCallback(() => {
    if (lease.current !== null) void nativeSurfaceController.endWorkout(lease.current);
    lease.current = null; setPaused(false); setRevision((value) => value + 1);
  }, []);
  return { end, resume, replace };
}
