import { createAsyncOutbox } from './asyncOutbox';
import { persistWorkoutLog } from './workoutPersistence';

const KEY = 'workout-outbox';

export type OutboxItem = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  content: string;
  existingLogId: string | null;
  queuedAt: number;
};

type WorkoutSaveInput = Omit<OutboxItem, 'id' | 'queuedAt'>;

export type WorkoutSaveResult =
  | { status: 'synced'; logId: string }
  | { status: 'offline'; logId: null };

const workoutOutbox = createAsyncOutbox<WorkoutSaveInput, OutboxItem>({
  storageKey: KEY,
  belongsTo: (item, userId) => item.user_id === userId,
  sameTarget: (item, input) => item.user_id === input.user_id && item.date === input.date,
  toItem: (item) => ({
    ...item,
    id: `${item.user_id}:${item.date}`,
    queuedAt: Date.now(),
  }),
});

export async function readOutbox(userId: string): Promise<OutboxItem[]> {
  return workoutOutbox.read(userId);
}

export function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt'>): Promise<void> {
  return workoutOutbox.enqueue(item);
}

/** Atomically supersedes an older queued save and persists the newest payload. */
export function saveWorkoutLog(item: WorkoutSaveInput): Promise<WorkoutSaveResult> {
  return workoutOutbox
    .save(item, (input) =>
      persistWorkoutLog(
        {
          user_id: input.user_id,
          date: input.date,
          title: input.title,
          content: input.content,
        },
        input.existingLogId,
      ),
    )
    .then((result) =>
      result.status === 'synced'
        ? { status: 'synced', logId: result.value }
        : { status: 'offline', logId: null },
    );
}

/** Returns how many items synced. Safe to call repeatedly. */
export function flushOutbox(userId: string): Promise<number> {
  return workoutOutbox.flush(userId, (item) =>
    persistWorkoutLog(
      {
        user_id: item.user_id,
        date: item.date,
        title: item.title,
        content: item.content,
      },
      item.existingLogId,
    ),
  );
}
