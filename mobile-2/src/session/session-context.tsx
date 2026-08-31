import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { validateServerUrl } from '@/data/server-url';
import {
  clearStoredSession,
  readStoredServerUrl,
  readStoredSession,
  saveStoredServerUrl,
  saveStoredSession,
} from '@/session/session-storage';
import { MfaRequiredError, type AppSession, type RestoreStatus } from '@/session/session-types';

export type SessionState = {
  restoreStatus: RestoreStatus;
  savedServerUrl: string | null;
  session: AppSession | null;
};

type SessionAction =
  | { savedServerUrl: string | null; session: AppSession | null; type: 'restored' }
  | { type: 'demo-entered' }
  | { session: Extract<AppSession, { mode: 'connected' }>; type: 'connected' }
  | { type: 'signed-out' }
  | { serverUrl: string; type: 'server-saved' };

export const initialSessionState: SessionState = {
  restoreStatus: 'restoring',
  savedServerUrl: null,
  session: null,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'restored':
      return {
        restoreStatus: 'ready',
        savedServerUrl: action.savedServerUrl,
        session: action.session,
      };
    case 'demo-entered':
      return {
        ...state,
        session: { email: 'demo@dawnage.local', mode: 'demo' },
      };
    case 'connected':
      return { ...state, session: action.session };
    case 'signed-out':
      return { ...state, session: null };
    case 'server-saved':
      return { ...state, savedServerUrl: action.serverUrl };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseError(action: string, status: number): Error {
  return new Error(`${action} failed (HTTP ${status}). Check the server URL and try again.`);
}

async function responseJson(response: Response, action: string): Promise<unknown> {
  if (!response.ok) {
    throw responseError(action, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${action} returned an invalid response. Try again or check the server.`);
  }
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export type SessionContextValue = SessionState & {
  enterDemo(): Promise<void>;
  saveServer(url: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const savedServerUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([readStoredSession(), readStoredServerUrl()])
      .then(([session, savedServerUrl]) => {
        if (!isMounted) {
          return;
        }

        savedServerUrlRef.current = savedServerUrl;
        dispatch({ savedServerUrl, session, type: 'restored' });
      })
      .catch(() => {
        if (isMounted) {
          dispatch({ savedServerUrl: null, session: null, type: 'restored' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const enterDemo = useCallback(async () => {
    const session: AppSession = { email: 'demo@dawnage.local', mode: 'demo' };
    await saveStoredSession(session);
    dispatch({ type: 'demo-entered' });
  }, []);

  const saveServer = useCallback(async (input: string) => {
    const serverUrl = validateServerUrl(input, isDevelopmentBuild());
    let response: Response;

    try {
      response = await fetch(`${serverUrl}/api/auth/settings`, { method: 'GET' });
    } catch {
      throw new Error('Unable to reach the server settings. Check the URL and your connection.');
    }

    if (!response.ok) {
      throw responseError('Server validation', response.status);
    }

    await saveStoredServerUrl(serverUrl);
    savedServerUrlRef.current = serverUrl;
    dispatch({ serverUrl, type: 'server-saved' });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const serverUrl = savedServerUrlRef.current;
    if (!serverUrl) {
      throw new Error('Choose and validate a server before signing in.');
    }

    let response: Response;
    try {
      response = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Origin: new URL(serverUrl).origin,
        },
        method: 'POST',
      });
    } catch {
      throw new Error('Unable to reach the sign-in service. Check your connection and try again.');
    }

    const body = await responseJson(response, 'Sign in');
    if (!isRecord(body)) {
      throw new Error('Sign in returned an invalid response. Try again or check the server.');
    }

    if (body.twoFactorRedirect === true) {
      throw new MfaRequiredError();
    }

    const token = body.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Sign in did not return a session token. Try again or check the server.');
    }

    const user = isRecord(body.user) ? body.user : null;
    const responseEmail = user?.email ?? body.email;
    const session: Extract<AppSession, { mode: 'connected' }> = {
      email: typeof responseEmail === 'string' && responseEmail.length > 0 ? responseEmail : email,
      mode: 'connected',
      serverUrl,
      token,
    };

    await saveStoredSession(session);
    dispatch({ session, type: 'connected' });
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredSession();
    dispatch({ type: 'signed-out' });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, enterDemo, saveServer, signIn, signOut }),
    [enterDemo, saveServer, signIn, signOut, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return session;
}
