import * as SecureStore from 'expo-secure-store';
import { act, render, waitFor } from '@testing-library/react-native';

import {
  SessionProvider,
  type SessionContextValue,
  useSession,
} from '@/session/session-context';
import {
  clearStoredSession,
  saveStoredServerUrl,
  SERVER_URL_STORAGE_KEY,
  SESSION_STORAGE_KEY,
} from '@/session/session-storage';
import { MfaRequiredError } from '@/session/session-types';
import { queryClient } from '@/query/query-client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function SessionProbe({ onValue }: { onValue: (value: SessionContextValue) => void }) {
  onValue(useSession());
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe('SessionProvider actions', () => {
  let latestSession: SessionContextValue;
  let fetchMock: jest.Mock;
  let originalFetch: typeof fetch;
  let restoreGetItemMock: (() => void) | undefined;

  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    await clearStoredSession();
    await SecureStore.deleteItemAsync(SERVER_URL_STORAGE_KEY);
    latestSession = undefined as never;
    fetchMock = jest.fn();
    originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    restoreGetItemMock?.();
    restoreGetItemMock = undefined;
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = undefined;
  });

  async function mountSession() {
    await act(async () => {
      render(
        <SessionProvider>
          <SessionProbe onValue={(value) => { latestSession = value; }} />
        </SessionProvider>,
      );
    });
  }

  async function renderSession() {
    await mountSession();
    await waitFor(() => expect(latestSession.restoreStatus).toBe('ready'));
  }

  it('validates the server settings endpoint before persisting its normalized URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ registrationEnabled: true }));
    await renderSession();

    await act(async () => {
      await latestSession.saveServer(' https://fitness.example/ ');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://fitness.example/api/auth/settings',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(latestSession.savedServerUrl).toBe('https://fitness.example');
    await expect(SecureStore.getItemAsync(SERVER_URL_STORAGE_KEY)).resolves.toBe(
      'https://fitness.example',
    );

    await expect(latestSession.saveServer('ftp://fitness.example')).rejects.toThrow(
      'Enter a complete server URL.',
    );
    expect(latestSession.savedServerUrl).toBe('https://fitness.example');
  });

  it('creates a connected session from a token and falls back to the sign-in email', async () => {
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'token-123', user: {} }));
    await renderSession();

    await act(async () => {
      await latestSession.signIn('member@example.com', 'not-persisted');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://fitness.example/api/auth/sign-in/email',
      expect.objectContaining({
        body: JSON.stringify({ email: 'member@example.com', password: 'not-persisted' }),
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Origin: 'https://fitness.example',
        }),
        method: 'POST',
      }),
    );
    expect(latestSession.session).toEqual({
      email: 'member@example.com',
      mode: 'connected',
      serverUrl: 'https://fitness.example',
      token: 'token-123',
    });
    await expect(SecureStore.getItemAsync('com.dawnage.mobile2.session')).resolves.not.toContain(
      'not-persisted',
    );
  });

  it('reports MFA as a recognizable error without clearing the saved server', async () => {
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockResolvedValueOnce(jsonResponse({ twoFactorRedirect: true }));
    await renderSession();

    await expect(
      latestSession.signIn('member@example.com', 'not-persisted'),
    ).rejects.toBeInstanceOf(MfaRequiredError);
    expect(latestSession.savedServerUrl).toBe('https://fitness.example');
    await expect(SecureStore.getItemAsync(SERVER_URL_STORAGE_KEY)).resolves.toBe(
      'https://fitness.example',
    );
  });

  it('gates actions until delayed restoration finishes, then uses the newly saved server', async () => {
    const restoredSession = deferred<string | null>();
    const restoredServerUrl = deferred<string | null>();
    restoreGetItemMock = jest
      .spyOn(SecureStore, 'getItemAsync')
      .mockImplementation((key) => {
        if (key === SESSION_STORAGE_KEY) {
          return restoredSession.promise;
        }

        if (key === SERVER_URL_STORAGE_KEY) {
          return restoredServerUrl.promise;
        }

        return Promise.resolve(null);
      })
      .mockRestore;
    await mountSession();

    await act(async () => {
      await expect(latestSession.saveServer('https://new.example')).rejects.toThrow(
        'Session is still restoring',
      );
      await expect(latestSession.enterDemo()).rejects.toThrow('Session is still restoring');
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      restoredSession.resolve(null);
      restoredServerUrl.resolve('https://old.example');
    });
    await waitFor(() => expect(latestSession.restoreStatus).toBe('ready'));
    expect(latestSession.savedServerUrl).toBe('https://old.example');

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ registrationEnabled: true }))
      .mockResolvedValueOnce(jsonResponse({ token: 'token-123', user: {} }));

    await act(async () => {
      await latestSession.saveServer('https://new.example');
    });

    await act(async () => {
      await latestSession.signIn('member@example.com', 'not-persisted');
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://new.example/api/auth/sign-in/email',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('clears cached private queries when signing out', async () => {
    await renderSession();
    await act(async () => {
      await latestSession.enterDemo();
    });
    queryClient.setQueryData(['daily-summary', '2026-09-01'], { private: true });

    await act(async () => {
      await latestSession.signOut();
    });

    expect(queryClient.getQueryData(['daily-summary', '2026-09-01'])).toBeUndefined();
  });
});
