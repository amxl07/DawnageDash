import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

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

/**
 * Submit-time failure queue for workout logs ONLY (per plan — deliberately not
 * generalised). Drafts already survive process death; this covers the case
 * where the user hits Save with no connection.
 */
export async function readOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
}

export async function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt'>): Promise<void> {
  const items = await readOutbox();
  // One queued entry per (user, date) — a later save supersedes an earlier one.
  const filtered = items.filter((i) => !(i.user_id === item.user_id && i.date === item.date));
  filtered.push({ ...item, id: `${item.user_id}:${item.date}`, queuedAt: Date.now() });
  await writeOutbox(filtered);
}

/** Returns how many items synced. Safe to call repeatedly. */
export async function flushOutbox(): Promise<number> {
  const items = await readOutbox();
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
        const { error } = await supabase
          .from('workout_logs')
          .update(payload)
          .eq('id', item.existingLogId);
        if (error) throw error;
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
}
