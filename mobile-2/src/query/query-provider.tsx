import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { FitnessRepositoryProvider } from '@/data/repository-context';
import { queryClient } from '@/query/query-client';
import { SessionProvider } from '@/session/session-context';

export function isNetworkOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

type NetworkSubscriber = (listener: (state: NetInfoState) => void) => () => void;

export function registerNetworkOnlineListener(
  setOnline: (isOnline: boolean) => void,
  subscribe: NetworkSubscriber = NetInfo.addEventListener,
): () => void {
  return subscribe((state) => {
    setOnline(isNetworkOnline(state));
  });
}

onlineManager.setEventListener((setOnline) =>
  registerNetworkOnlineListener(setOnline),
);

export function useConnectionState(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(isNetworkOnline(state));
    });

    void NetInfo.fetch().then((state) => {
      if (isMounted) {
        setIsOnline(isNetworkOnline(state));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isOnline };
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <FitnessRepositoryProvider>{children}</FitnessRepositoryProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
