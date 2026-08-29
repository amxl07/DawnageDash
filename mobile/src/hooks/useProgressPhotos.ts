import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type PhotoRow = {
  id: string;
  user_id: string;
  date: string;
  front_url: string | null;
  back_url: string | null;
  side_left_url: string | null;
  side_right_url: string | null;
  created_at?: string | null;
};

export type PhotoPayload = {
  date: string;
  front_url: string | null;
  back_url: string | null;
  side_left_url: string | null;
  side_right_url: string | null;
};

/** Newest-first. Oldest row is "Week 0 (Baseline)". */
export function useProgressPhotos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['weeklyProgressPhotos', user?.id],
    queryFn: async (): Promise<PhotoRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('weekly_progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhotoRow[];
    },
    enabled: !!user?.id,
  });
}

export function usePhotoMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PhotoPayload) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data: existing, error: fetchError } = await supabase
        .from('weekly_progress_photos')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', payload.date)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const row = { ...payload, user_id: user.id };
      if (existing) {
        const { error } = await supabase
          .from('weekly_progress_photos')
          .update(row)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('weekly_progress_photos').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyProgressPhotos', user?.id] });
    },
  });
}
