import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { PlanDay } from './usePlans';

/**
 * When was this plan last touched by the coach, and has it changed since the
 * client last looked?
 *
 * Dawnage is the only app in the surveyed set with a real coach on the other
 * end, and until now a plan update was completely silent — a client could not
 * tell a working coach from an absent one. This makes the coach's work visible.
 *
 * Read-only against `workout_plans.updated_at`, which is verified present.
 * "Last seen" is device-local by design: it is a UI affordance, not shared state.
 */
export function usePlanProvenance(days: PlanDay[] | undefined) {
  const { user } = useAuth();
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const key = user?.id ? `plans-last-seen:${user.id}` : null;

  // Newest timestamp across every day of the plan.
  const updatedAt =
    days && days.length
      ? days.reduce<string | null>((max, d) => {
          if (!d.updated_at) return max;
          return !max || d.updated_at > max ? d.updated_at : max;
        }, null)
      : null;

  useEffect(() => {
    if (!key) return;
    let active = true;
    void AsyncStorage.getItem(key)
      .then((v) => {
        if (!active) return;
        setLastSeen(v);
        setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [key]);

  /** Call once the client has actually looked at the plan. */
  const markSeen = useCallback(() => {
    if (!key || !updatedAt) return;
    setLastSeen(updatedAt);
    void AsyncStorage.setItem(key, updatedAt).catch(() => {});
  }, [key, updatedAt]);

  // Only "changed" once we know what was seen before — otherwise a first run
  // would badge every plan as new.
  const hasChanged = Boolean(ready && updatedAt && lastSeen && updatedAt > lastSeen);

  return { updatedAt, hasChanged, markSeen, ready };
}

/** "3 days ago" / "today" — relative, from an ISO timestamp. */
export function relativeDays(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
