import { getTabAccessDecision } from '@/session/session-context';

describe('getTabAccessDecision', () => {
  it.each([
    ['keeps a deep link suspended while session restoration is pending', 'restoring', { email: 'demo@dawnage.local', mode: 'demo' }, 'restoring'],
    ['redirects an unauthenticated deep link to welcome after restoration', 'ready', null, 'redirect-welcome'],
    ['renders tabs for an authenticated session after restoration', 'ready', { email: 'member@example.com', mode: 'connected', serverUrl: 'https://fitness.example', token: 'token-123' }, 'render-tabs'],
  ] as const)('%s', (_description, restoreStatus, session, expected) => {
    expect(getTabAccessDecision({ restoreStatus, session })).toBe(expected);
  });
});
