import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PHOTO_BUCKET, PHOTO_REFRESH_MS, photoUrlForSession, signPhoto } from '@shared/progress-photos';

export function usePrivatePhotoUrl(reference: string | null | undefined, ownerId: string) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const [, tick] = useState(0);
  const query = useQuery({
    queryKey: ['signedProgressPhoto', viewerId, ownerId, reference],
    queryFn: () => signPhoto(supabase.storage.from(PHOTO_BUCKET), reference!, import.meta.env.VITE_SUPABASE_URL, ownerId, viewerId!),
    enabled: Boolean(viewerId && ownerId && reference),
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchInterval: PHOTO_REFRESH_MS,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    meta: { persist: false },
  });
  useEffect(() => {
    if (!query.data) return;
    const timer = setTimeout(() => tick(value => value + 1), Math.max(0, query.data.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [query.data]);
  useEffect(() => {
    const refresh = () => {
      tick(value => value + 1);
      if (document.visibilityState === 'visible' && viewerId && reference) void query.refetch();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [query.refetch, reference, viewerId]);
  return { url: query.isError ? null : photoUrlForSession(query.data, viewerId), loading: query.isFetching, refresh: query.refetch };
}
