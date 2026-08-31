import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createConnectedFitnessRepository } from '@/data/connected-fitness-repository';
import { createDemoFitnessRepository } from '@/data/demo-fitness-repository';
import type { FitnessRepository } from '@/data/fitness-repository';
import { useSession } from '@/session/session-context';

const FitnessRepositoryContext = createContext<FitnessRepository | null>(null);

export function FitnessRepositoryProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const repository = useMemo<FitnessRepository | null>(() => {
    if (!session) {
      return null;
    }

    if (session.mode === 'demo') {
      return createDemoFitnessRepository();
    }

    return createConnectedFitnessRepository(session);
  }, [session]);

  return (
    <FitnessRepositoryContext.Provider value={repository}>
      {children}
    </FitnessRepositoryContext.Provider>
  );
}

export function useFitnessRepository(): FitnessRepository {
  const repository = useContext(FitnessRepositoryContext);
  if (!repository) {
    throw new Error('useFitnessRepository requires an active session.');
  }

  return repository;
}
