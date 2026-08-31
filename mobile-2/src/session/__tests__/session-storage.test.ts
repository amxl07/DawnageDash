import * as SecureStore from 'expo-secure-store';

import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
  SESSION_STORAGE_KEY,
} from '@/session/session-storage';

describe('session storage', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  });

  it('round-trips a connected session without persisting a password', async () => {
    const session = {
      email: 'member@example.com',
      mode: 'connected' as const,
      serverUrl: 'https://fitness.example',
      token: 'token-123',
    };

    await saveStoredSession(session);

    await expect(readStoredSession()).resolves.toEqual(session);
    await expect(SecureStore.getItemAsync(SESSION_STORAGE_KEY)).resolves.not.toContain(
      'password',
    );
  });

  it('removes the persisted session when signed out', async () => {
    await saveStoredSession({ email: 'demo@dawnage.local', mode: 'demo' });

    await clearStoredSession();

    await expect(SecureStore.getItemAsync(SESSION_STORAGE_KEY)).resolves.toBeNull();
  });

  it('deletes corrupt persisted session data during restoration', async () => {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, '{not JSON');

    await expect(readStoredSession()).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(SESSION_STORAGE_KEY)).resolves.toBeNull();
  });
});
