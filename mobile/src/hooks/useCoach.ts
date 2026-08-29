import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type Coach = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * The client's assigned coach.
 *
 * RLS on `public.users` is one-directional: coaches can select their clients,
 * but no policy lets a client select their coach. Rather than widen that policy
 * — which would expose the coach's entire row, email and phone included — this
 * reads through a SECURITY DEFINER function that returns exactly three columns.
 *
 * See `plans/coach-identity-migration.sql`. Until that is applied the RPC does
 * not exist, so this resolves to null and every consumer simply renders nothing.
 * A missing coach must never surface as an error to the client.
 */
export function useCoach() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coach', user?.id],
    queryFn: async (): Promise<Coach | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_my_coach');
      if (error) {
        // Function not deployed yet, or the client has no coach assigned.
        // Neither is worth interrupting the screen for.
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return (row as Coach | undefined) ?? null;
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
