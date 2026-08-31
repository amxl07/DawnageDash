import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useFitnessRepository } from '@/data/repository-context';
import type { AddFoodEntryInput } from '@/domain/models';
import { useConnectionState } from '@/query/query-provider';
import { useSession } from '@/session/session-context';

export const foodSearchQueryKey = (term: string) => ['food-search', term] as const;

export function useFoodSearch(term: string) {
  const repository = useFitnessRepository();
  const normalizedTerm = term.trim();
  const [debouncedTerm, setDebouncedTerm] = useState(normalizedTerm);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTerm(normalizedTerm), 300);
    return () => clearTimeout(timeout);
  }, [normalizedTerm]);

  return useQuery({
    enabled: debouncedTerm.length >= 2,
    queryFn: () => repository.searchFoods(debouncedTerm),
    queryKey: foodSearchQueryKey(debouncedTerm),
  });
}

export function useAddFoodEntry() {
  const repository = useFitnessRepository();
  const queryClient = useQueryClient();
  const { isOnline } = useConnectionState();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: AddFoodEntryInput) => {
      if (session?.mode === 'connected' && !isOnline) {
        throw new Error('Reconnect to add food to your connected diary.');
      }

      return repository.addFoodEntry(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['food-search'] });
    },
  });
}
