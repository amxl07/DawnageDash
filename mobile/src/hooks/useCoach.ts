import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type Coach = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type CoachLookup =
  | { kind: 'assigned'; coach: Coach }
  | { kind: 'unassigned' }
  | { kind: 'unavailable' };

export function toCoachLookup(data: unknown, error?: unknown): CoachLookup {
  if (error) return { kind: 'unavailable' };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { kind: 'unassigned' };

  return { kind: 'assigned', coach: row as Coach };
}

/**
 * The client's assigned coach.
 *
 * RLS on `public.users` is one-directional: coaches can select their clients,
 * but no policy lets a client select their coach. Rather than widen that policy
 * — which would expose the coach's entire row, email and phone included — this
 * reads through a SECURITY DEFINER function that returns exactly three columns.
 *
 * See `plans/coach-identity-migration.sql`. The explicit lookup state lets
 * consumers distinguish no assignment from an RPC that is not available yet.
 */
export function useCoach() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coach', user?.id],
    queryFn: async (): Promise<CoachLookup> => {
      if (!user?.id) return { kind: 'unassigned' };
      const { data, error } = await supabase.rpc('get_my_coach');
      return toCoachLookup(data, error);
    },
    enabled: !!user?.id,
    // The coach rarely changes; don't re-fetch on every screen focus.
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}

/** "Amal Manoj" → "AM". Falls back to a dash so the avatar is never empty. */
export function coachInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '—';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '—';
}
