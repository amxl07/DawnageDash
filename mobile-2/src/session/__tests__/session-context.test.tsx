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

  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    await clearStoredSession();
    await SecureStore.deleteItemAsync(SERVER_URL_STORAGE_KEY);
    queryClient.clear();
    latestSession = undefined as never;
    fetchMock = jest.fn();
    originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
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

  it('rejects a malformed sign-in response before creating a session', async () => {
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'token-123', user: 'not-an-object' }));
    await renderSession();

    await act(async () => {
      await expect(
        latestSession.signIn('member@example.com', 'not-persisted'),
      ).rejects.toThrow('Sign in returned an invalid response');
    });
    expect(latestSession.session).toBeNull();
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
    (SecureStore.getItemAsync as jest.Mock)
      .mockImplementationOnce(() => restoredSession.promise)
      .mockImplementationOnce(() => restoredServerUrl.promise);
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

  it('clears private queries when replacing an identity with demo mode', async () => {
    await renderSession();
    queryClient.setQueryData(['daily-summary', '2026-09-01'], { owner: 'previous' });
    queryClient.setQueryData(['meal-types'], [{ id: 'private-meal' }]);

    await act(async () => {
      await latestSession.enterDemo();
    });

    expect(queryClient.getQueryData(['daily-summary', '2026-09-01'])).toBeUndefined();
    expect(queryClient.getQueryData(['meal-types'])).toBeUndefined();
  });

  it('clears demo queries before installing a connected identity', async () => {
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'connected-token', user: {} }));
    await renderSession();
    queryClient.setQueryData(['food-search', 'oats'], { owner: 'demo' });

    await act(async () => {
      await latestSession.signIn('member@example.com', 'not-persisted');
    });

    expect(queryClient.getQueryData(['food-search', 'oats'])).toBeUndefined();
    expect(latestSession.session).toMatchObject({
      mode: 'connected',
      token: 'connected-token',
    });
  });

  it('ignores a late sign-in completion after the user chooses demo mode', async () => {
    const signInResponse = deferred<Response>();
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockReturnValueOnce(signInResponse.promise);
    await renderSession();

    let signInPromise!: Promise<void>;
    await act(async () => {
      signInPromise = latestSession.signIn('member@example.com', 'not-persisted');
      await Promise.resolve();
    });

    await act(async () => {
      await latestSession.enterDemo();
    });

    await act(async () => {
      signInResponse.resolve(jsonResponse({ token: 'late-token', user: {} }));
      await signInPromise;
    });

    expect(latestSession.session).toEqual({
      email: 'demo@dawnage.local',
      mode: 'demo',
    });
    await expect(SecureStore.getItemAsync(SESSION_STORAGE_KEY)).resolves.toBe(
      JSON.stringify({ email: 'demo@dawnage.local', mode: 'demo' }),
    );
  });

  it('keeps the newest server when overlapping validations finish out of order', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    await renderSession();

    let firstSave!: Promise<void>;
    let secondSave!: Promise<void>;
    await act(async () => {
      firstSave = latestSession.saveServer('https://old.example');
      secondSave = latestSession.saveServer('https://new.example');
      await Promise.resolve();
    });

    await act(async () => {
      secondResponse.resolve(jsonResponse({ registrationEnabled: true }));
      await secondSave;
    });
    await act(async () => {
      firstResponse.resolve(jsonResponse({ registrationEnabled: true }));
      await firstSave;
    });

    expect(latestSession.savedServerUrl).toBe('https://new.example');
    await expect(SecureStore.getItemAsync(SERVER_URL_STORAGE_KEY)).resolves.toBe(
      'https://new.example',
    );
  });

  it('persists the newest identity when an older secure-store write finishes late', async () => {
    await saveStoredServerUrl('https://fitness.example');
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'connected-token', user: {} }));
    await renderSession();

    const staleWrite = deferred<void>();
    const setItemMock = SecureStore.setItemAsync as jest.Mock;
    const defaultSetItem = setItemMock.getMockImplementation();
    expect(defaultSetItem).toBeDefined();
    setItemMock.mockImplementationOnce(async (...args: [string, string]) => {
      await staleWrite.promise;
      return defaultSetItem?.(...args);
    });

    let signInPromise!: Promise<void>;
    await act(async () => {
      signInPromise = latestSession.signIn('member@example.com', 'not-persisted');
      await Promise.resolve();
    });
    await waitFor(() => expect(setItemMock).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.stringContaining('connected-token'),
    ));

    let demoPromise!: Promise<void>;
    await act(async () => {
      demoPromise = latestSession.enterDemo();
      await Promise.resolve();
    });

    await act(async () => {
      staleWrite.resolve();
      await Promise.all([signInPromise, demoPromise]);
    });

    expect(latestSession.session).toEqual({
      email: 'demo@dawnage.local',
      mode: 'demo',
    });
    await expect(SecureStore.getItemAsync(SESSION_STORAGE_KEY)).resolves.toBe(
      JSON.stringify({ email: 'demo@dawnage.local', mode: 'demo' }),
    );
  });
});
