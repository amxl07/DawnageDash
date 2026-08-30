import {
  workoutReducer,
  type WorkoutAction,
  type WorkoutState,
} from './workoutReducer';

export type WorkoutEditAction = Extract<
  WorkoutAction,
  {
    type:
      | 'LOAD_DEFAULT_PLAN'
      | 'SET_TITLE'
      | 'UPDATE_SET'
      | 'TOGGLE_SET'
      | 'ADD_SET'
      | 'REMOVE_SET'
      | 'ADD_EXERCISE'
      | 'REPLACE_EXERCISE';
  }
>;

export type WorkoutEditSnapshot = {
  generation: number;
  state: WorkoutState;
};

type SaveLock = { current: boolean };

export function acquireWorkoutSave(lock: SaveLock): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseWorkoutSave(lock: SaveLock): void {
  lock.current = false;
}

/** Mirrors a user edit into a ref before React schedules the reducer render. */
export function applyWorkoutEdit(
  current: WorkoutEditSnapshot,
  action: WorkoutEditAction,
): WorkoutEditSnapshot {
  const nextState = workoutReducer(current.state, action);
  return {
    generation: current.generation + 1,
    state: nextState.isDirty ? nextState : { ...nextState, isDirty: true },
  };
}

/** Adopts a confirmed row identity without disguising it as a user edit. */
export function attachPersistedWorkoutId(
  current: WorkoutEditSnapshot,
  logId: string,
): WorkoutEditSnapshot {
  return {
    generation: current.generation,
    state: workoutReducer(current.state, {
      type: 'ATTACH_PERSISTED_LOG_ID',
      payload: logId,
    }),
  };
}

type FinalizeOptions = {
  savedGeneration: number;
  getCurrentGeneration: () => number;
  clearDraft: () => Promise<boolean>;
  repersistLatestDraft: () => Promise<boolean>;
};

async function repersistStableDraft(
  getCurrentGeneration: () => number,
  repersistLatestDraft: () => Promise<boolean>,
): Promise<boolean> {
  let persistedGeneration: number;
  do {
    persistedGeneration = getCurrentGeneration();
    if (!(await repersistLatestDraft())) return false;
  } while (getCurrentGeneration() !== persistedGeneration);
  return true;
}

/** Runs a draft mutation before leaving and never exits on an unconfirmed mutation. */
export async function runDraftMutationBeforeExit(
  mutateDraft: () => Promise<boolean>,
  exit: () => void,
): Promise<boolean> {
  const confirmed = await mutateDraft();
  if (confirmed) exit();
  return confirmed;
}

/** Clears only an unchanged submitted snapshot and repairs an edit racing the clear. */
export async function finalizeWorkoutSave({
  savedGeneration,
  getCurrentGeneration,
  clearDraft,
  repersistLatestDraft,
}: FinalizeOptions): Promise<
  'finalized' | 'edited' | 'cleanup-failed' | 'draft-persistence-failed'
> {
  if (getCurrentGeneration() !== savedGeneration) {
    const persisted = await repersistStableDraft(getCurrentGeneration, repersistLatestDraft);
    return persisted ? 'edited' : 'draft-persistence-failed';
  }

  const cleared = await clearDraft();
  if (!cleared) {
    const persisted = await repersistStableDraft(getCurrentGeneration, repersistLatestDraft);
    return persisted ? 'cleanup-failed' : 'draft-persistence-failed';
  }

  if (getCurrentGeneration() !== savedGeneration) {
    const persisted = await repersistStableDraft(getCurrentGeneration, repersistLatestDraft);
    return persisted ? 'edited' : 'draft-persistence-failed';
  }

  return 'finalized';
}
