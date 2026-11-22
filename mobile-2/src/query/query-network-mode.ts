import type { AppSession } from '@/session/session-types';

export function getQueryNetworkMode(mode: AppSession['mode']): 'always' | 'online' {
  return mode === 'demo' ? 'always' : 'online';
}
