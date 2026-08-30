import AsyncStorage from '@react-native-async-storage/async-storage';

import { persistWorkoutLog } from './workoutPersistence';

const KEY = 'workout-outbox';
let mutationQueue: Promise<void> = Promise.resolve();

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

/**
 * Submit-time failure queue for workout logs ONLY (per plan — deliberately not
 * generalised). Drafts already survive process death; this covers the case
 * where the user hits Save with no connection.
 */
async function readOutboxStrict(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function readOutbox(userId: string): Promise<OutboxItem[]> {
  try {
    const items = await readOutboxStrict();
    return items.filter((item) => item.user_id === userId);
  } catch {
    return [];
  }
}

export function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt'>): Promise<void> {
  return serializeMutation(async () => {
    const items = await readOutboxStrict();
    // One queued entry per (user, date) — a later save supersedes an earlier one.
    const filtered = items.filter((i) => !(i.user_id === item.user_id && i.date === item.date));
    filtered.push({ ...item, id: `${item.user_id}:${item.date}`, queuedAt: Date.now() });
    await writeOutbox(filtered);
  });
}

/** Atomically supersedes an older queued save and persists the newest payload. */
export function saveWorkoutLog(item: WorkoutSaveInput): Promise<WorkoutSaveResult> {
  return serializeMutation(async () => {
    const items = await readOutboxStrict();
    const filtered = items.filter((i) => !(i.user_id === item.user_id && i.date === item.date));

    // Remove stale work durably before its replacement can reach the server.
    await writeOutbox(filtered);

    try {
      const logId = await persistWorkoutLog(
        {
          user_id: item.user_id,
          date: item.date,
          title: item.title,
          content: item.content,
        },
        item.existingLogId,
      );
      return { status: 'synced', logId };
    } catch {
      filtered.push({ ...item, id: `${item.user_id}:${item.date}`, queuedAt: Date.now() });
      await writeOutbox(filtered);
      return { status: 'offline', logId: null };
    }
  });
}

/** Returns how many items synced. Safe to call repeatedly. */
export function flushOutbox(userId: string): Promise<number> {
  return serializeMutation(async () => {
    const items = await readOutboxStrict();
    if (!items.some((item) => item.user_id === userId)) return 0;

    const remaining: OutboxItem[] = [];
    let synced = 0;

    for (const item of items) {
      if (item.user_id !== userId) {
        remaining.push(item);
        continue;
      }
      try {
        const payload = {
          user_id: item.user_id,
          date: item.date,
          title: item.title,
          content: item.content,
        };
        await persistWorkoutLog(payload, item.existingLogId);
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }

    await writeOutbox(remaining);
    return synced;
  });
}
