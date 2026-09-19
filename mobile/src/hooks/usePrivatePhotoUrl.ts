import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { PHOTO_BUCKET, PHOTO_REFRESH_MS, photoUrlForSession, signPhoto } from '../../../shared/progress-photos';

/** Short-lived, per-viewer display state. Never persist this query or use it as form data. */
export function usePrivatePhotoUrl(reference: string | null, ownerId?: string) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const owner = ownerId ?? viewerId;
  const [, tick] = useState(0);
  const query = useQuery({
    queryKey: ['signedProgressPhoto', viewerId, owner, reference],
    queryFn: () => signPhoto(supabase.storage.from(PHOTO_BUCKET), reference!, supabaseUrl, owner!, viewerId!),
    enabled: Boolean(viewerId && owner && reference),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: PHOTO_REFRESH_MS,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    meta: { persist: false },
  });
  const { refetch } = query;
  const refresh = useCallback(() => {
    tick((value) => value + 1);
    if (viewerId && reference && owner) void refetch();
  }, [owner, refetch, reference, viewerId]);
  useFocusEffect(refresh);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);
  useEffect(() => {
    if (!query.data) return;
    const timer = setTimeout(() => tick((value) => value + 1), Math.max(0, query.data.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [query.data]);
  return {
    url: query.isError ? null : photoUrlForSession(query.data, viewerId),
    loading: query.isFetching,
    unavailable: Boolean(reference) && (query.isError || (!query.isFetching && !photoUrlForSession(query.data, viewerId))),
    refresh,
  };
}
