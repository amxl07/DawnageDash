import type { NetInfoState } from '@react-native-community/netinfo';

import {
  isNetworkOnline,
  registerNetworkOnlineListener,
} from '@/query/query-provider';

function networkState(overrides: Partial<NetInfoState>): NetInfoState {
  return {
    details: null,
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    ...overrides,
  } as NetInfoState;
}

describe('network query integration', () => {
  it('treats a connected network with unknown reachability as online', () => {
    expect(isNetworkOnline(networkState({ isInternetReachable: null }))).toBe(true);
  });

  it('treats disconnected and unreachable networks as offline', () => {
    expect(isNetworkOnline(networkState({ isConnected: false }))).toBe(false);
    expect(isNetworkOnline(networkState({ isInternetReachable: false }))).toBe(false);
  });

  it('forwards NetInfo updates to the Query online setter and returns its cleanup', () => {
    let listener: ((state: NetInfoState) => void) | undefined;
    let isOnline: boolean | undefined;
    let cleanedUp = false;

    const unsubscribe = registerNetworkOnlineListener(
      (nextOnline) => {
        isOnline = nextOnline;
      },
      (nextListener) => {
        listener = nextListener;
        return () => {
          cleanedUp = true;
        };
      },
    );

    listener?.(networkState({ isInternetReachable: false }));
    expect(isOnline).toBe(false);

    listener?.(networkState({ isInternetReachable: true }));
    expect(isOnline).toBe(true);

    unsubscribe();
    expect(cleanedUp).toBe(true);
  });
});
