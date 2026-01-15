import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

            if (error) {
                console.error('Error fetching onboarding step:', error);
                return 0;
            }
            return data?.onboarding_step || 0;
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
            // Also invalidate user profile just in case
            queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
        },
    });

    return {
        step,
        isLoading,
        updateStep: updateStep.mutateAsync,
        isUpdating: updateStep.isPending
    };
}
