import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/** Port of client/src/hooks/useOnboarding.ts. Gate is `onboarding_step < 3`. */
export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: step = 0, isLoading } = useQuery({
    queryKey: ['onboardingStep', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_step')
        .eq('id', user.id)
        .single();
      if (error) return 0;
      return (data?.onboarding_step as number | null) ?? 0;
    },
    enabled: !!user?.id,
  });

  const updateStep = useMutation({
    mutationFn: async (newStep: number) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('users')
        .update({ onboarding_step: newStep })
        .eq('id', user.id);
      if (error) throw error;
      return newStep;
    },
    onSuccess: (newStep) => {
      queryClient.setQueryData(['onboardingStep', user?.id], newStep);
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
    },
  });

  return {
    step,
    isLoading,
    updateStep: updateStep.mutateAsync,
    isUpdating: updateStep.isPending,
  };
}
