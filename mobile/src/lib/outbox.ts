import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

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
async function readOutboxStorage(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
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
  return readOutboxStorage();
}

export function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt'>): Promise<void> {
  return serializeMutation(async () => {
    const items = await readOutboxStorage();
    // One queued entry per (user, date) — a later save supersedes an earlier one.
    const filtered = items.filter((i) => !(i.user_id === item.user_id && i.date === item.date));
    filtered.push({ ...item, id: `${item.user_id}:${item.date}`, queuedAt: Date.now() });
    await writeOutbox(filtered);
  });
}

/** Returns how many items synced. Safe to call repeatedly. */
export function flushOutbox(): Promise<number> {
  return serializeMutation(async () => {
    const items = await readOutboxStorage();
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
        if (item.existingLogId) {
          const { data, error } = await supabase
            .from('workout_logs')
            .update(payload)
            .eq('id', item.existingLogId)
            .select('id')
            .maybeSingle();
          if (error || data?.id !== item.existingLogId) {
            throw error ?? new Error('Workout update affected no row');
          }
        } else {
          const { error } = await supabase.from('workout_logs').insert(payload);
          if (error) throw error;
        }
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }

    await writeOutbox(remaining);
    return synced;
  });
}
