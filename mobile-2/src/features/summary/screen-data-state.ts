export function getOfflineColdStartState({ hasData, isOnline, mode }: { hasData: boolean; isOnline: boolean; mode: 'connected' | 'demo' }): 'data' | 'unavailable' {
  return mode === 'connected' && !isOnline && !hasData ? 'unavailable' : 'data';
}
