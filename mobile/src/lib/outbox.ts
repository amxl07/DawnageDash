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

export async function readOutbox(): Promise<OutboxItem[]> {
  try {
    return await readOutboxStrict();
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

/** Returns how many items synced. Safe to call repeatedly. */
export function flushOutbox(): Promise<number> {
  return serializeMutation(async () => {
    const items = await readOutboxStrict();
    if (!items.length) return 0;

    const remaining: OutboxItem[] = [];
    let synced = 0;

    for (const item of items) {
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
