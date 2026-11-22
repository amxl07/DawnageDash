import {
  serializeWorkoutRecord,
  workoutContextMatches,
  type WorkoutRecord,
  type WorkoutRecordContext,
  type WorkoutRecordExercise,
} from './workout-record';

export type ActiveWorkoutIdentity = Omit<WorkoutRecordContext, 'original'>;

type SaveInput = {
  active: ActiveWorkoutIdentity;
  context: WorkoutRecordContext;
  sourceContent: unknown;
  document: WorkoutRecord;
  exercises: WorkoutRecordExercise[];
  workoutTitle: string;
  revision: number;
};

type SaveValues = { title: string; content: string };

export type WorkoutSaveSnapshot = {
  active: ActiveWorkoutIdentity;
  context: WorkoutRecordContext;
  revision: number;
};

export type PreparedWorkoutLogSave = (
  | {
      mode: 'update';
      values: SaveValues;
      where: { id: string; userId: string; dateKey: string; originalContent: unknown };
    }
  | {
      mode: 'insert';
      values: SaveValues & { user_id: string; date: string };
    }) & { snapshot: WorkoutSaveSnapshot };

export function workoutSaveSnapshotMatches(
  snapshot: WorkoutSaveSnapshot,
  current: { active: ActiveWorkoutIdentity; context: WorkoutRecordContext | null; revision: number },
): boolean {
  if (snapshot.revision !== current.revision || !current.context) return false;
  if (snapshot.active.userId !== current.active.userId || snapshot.active.dateKey !== current.active.dateKey ||
      snapshot.active.logId !== current.active.logId) return false;
  const activeContext: WorkoutRecordContext = { ...current.active, original: current.context.original };
  return workoutContextMatches(current.context, snapshot.context) && workoutContextMatches(current.context, activeContext);
}

/** Build a persistence command only after the live owner and original source still match. */
export function prepareWorkoutLogSave(input: SaveInput): PreparedWorkoutLogSave {
  const original = input.active.logId ? input.sourceContent : input.context.original;
  const expected: WorkoutRecordContext = { ...input.active, original };
  if (!workoutContextMatches(input.context, expected)) {
    throw new Error('The active account, date, record, or source changed. Reload before saving.');
  }
  const values: SaveValues = {
    title: input.workoutTitle,
    content: serializeWorkoutRecord(input.document, input.exercises),
  };
  const snapshot: WorkoutSaveSnapshot = {
    active: { ...input.active },
    context: { ...input.context },
    revision: input.revision,
  };
  if (input.active.logId) {
    return {
      mode: 'update',
      values,
      snapshot,
      where: {
        id: input.active.logId,
        userId: input.active.userId,
        dateKey: input.active.dateKey,
        originalContent: input.sourceContent,
      },
    };
  }
  return {
    mode: 'insert',
    snapshot,
    values: { ...values, user_id: input.active.userId, date: input.active.dateKey },
  };
}
