import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { validateServerUrl } from '@/data/server-url';
import { signInWireSchema } from '@/domain/schemas';
import {
  clearStoredSession,
  readStoredServerUrl,
  readStoredSession,
  saveStoredServerUrl,
  saveStoredSession,
} from '@/session/session-storage';
import { MfaRequiredError, type AppSession, type RestoreStatus } from '@/session/session-types';
import { queryClient } from '@/query/query-client';

export type SessionState = {
  restoreStatus: RestoreStatus;
  savedServerUrl: string | null;
  session: AppSession | null;
};

export type TabAccessDecision = 'redirect-welcome' | 'render-tabs' | 'restoring';
export type PublicRouteAccessDecision = 'redirect-tabs' | 'render-public' | 'restoring';

export function getTabAccessDecision({ restoreStatus, session }: Pick<SessionState, 'restoreStatus' | 'session'>): TabAccessDecision {
  if (restoreStatus === 'restoring') {
    return 'restoring';
  }

  return session ? 'render-tabs' : 'redirect-welcome';
}

export function getPublicRouteAccessDecision({ restoreStatus, session }: Pick<SessionState, 'restoreStatus' | 'session'>): PublicRouteAccessDecision {
  if (restoreStatus === 'restoring') {
    return 'restoring';
  }

  return session ? 'redirect-tabs' : 'render-public';
}

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
      if (state.restoreStatus !== 'restoring') {
        return state;
      }

      return {
        restoreStatus: 'ready',
        savedServerUrl: action.savedServerUrl,
        session: action.session,
      };
    case 'demo-entered':
      return {
        ...state,
        restoreStatus: 'ready',
        session: { email: 'demo@dawnage.local', mode: 'demo' },
      };
    case 'connected':
      return { ...state, restoreStatus: 'ready', session: action.session };
    case 'signed-out':
      return { ...state, restoreStatus: 'ready', session: null };
    case 'server-saved':
      return { ...state, restoreStatus: 'ready', savedServerUrl: action.serverUrl };
  }
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
  const operationVersionRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const identityCommitQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  const assertRestorationComplete = useCallback(() => {
    if (state.restoreStatus === 'restoring') {
      throw new Error('Session is still restoring. Please wait a moment and try again.');
    }
  }, [state.restoreStatus]);

  const beginOperation = useCallback(() => {
    requestAbortRef.current?.abort();
    const abortController = new AbortController();
    requestAbortRef.current = abortController;
    operationVersionRef.current += 1;

    return {
      signal: abortController.signal,
      version: operationVersionRef.current,
    };
  }, []);

  const isLatestOperation = useCallback(
    (version: number) => operationVersionRef.current === version,
    [],
  );

  const replaceIdentity = useCallback(async (
    version: number,
    session: AppSession | null,
  ) => {
    const commit = identityCommitQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (!isLatestOperation(version)) return;

        await queryClient.cancelQueries();
        if (!isLatestOperation(version)) return;
        queryClient.clear();

        if (session) {
          await saveStoredSession(session);
        } else {
          await clearStoredSession();
        }

        if (!isLatestOperation(version)) return;
        dispatch(session?.mode === 'connected'
          ? { session, type: 'connected' }
          : session?.mode === 'demo'
            ? { type: 'demo-entered' }
            : { type: 'signed-out' });
      });

    identityCommitQueueRef.current = commit.catch(() => undefined);
    await commit;
  }, [isLatestOperation]);

  const enterDemo = useCallback(async () => {
    assertRestorationComplete();
    const { version } = beginOperation();
    const session: AppSession = { email: 'demo@dawnage.local', mode: 'demo' };
    await replaceIdentity(version, session);
  }, [assertRestorationComplete, beginOperation, replaceIdentity]);

  const saveServer = useCallback(async (input: string) => {
    assertRestorationComplete();
    const { signal, version } = beginOperation();
    const serverUrl = validateServerUrl(input, isDevelopmentBuild());
    let response: Response;

    try {
      response = await fetch(`${serverUrl}/api/auth/settings`, { method: 'GET', signal });
    } catch {
      if (!isLatestOperation(version)) return;
      throw new Error('Unable to reach the server settings. Check the URL and your connection.');
    }

    if (!isLatestOperation(version)) return;
    if (!response.ok) {
      throw responseError('Server validation', response.status);
    }

    await saveStoredServerUrl(serverUrl);
    if (!isLatestOperation(version)) return;
    savedServerUrlRef.current = serverUrl;
    dispatch({ serverUrl, type: 'server-saved' });
  }, [assertRestorationComplete, beginOperation, isLatestOperation]);

  const signIn = useCallback(async (email: string, password: string) => {
    assertRestorationComplete();
    const { signal, version } = beginOperation();
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
        signal,
      });
    } catch {
      if (!isLatestOperation(version)) return;
      throw new Error('Unable to reach the sign-in service. Check your connection and try again.');
    }

    if (!isLatestOperation(version)) return;
    const result = signInWireSchema.safeParse(await responseJson(response, 'Sign in'));
    if (!result.success) {
      throw new Error('Sign in returned an invalid response. Try again or check the server.');
    }

    const body = result.data;

    if (body.twoFactorRedirect === true) {
      throw new MfaRequiredError();
    }

    const token = body.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Sign in did not return a session token. Try again or check the server.');
    }

    const responseEmail = body.user?.email ?? body.email;
    const session: Extract<AppSession, { mode: 'connected' }> = {
      email: typeof responseEmail === 'string' && responseEmail.length > 0 ? responseEmail : email,
      mode: 'connected',
      serverUrl,
      token,
    };

    await replaceIdentity(version, session);
  }, [assertRestorationComplete, beginOperation, isLatestOperation, replaceIdentity]);

  const signOut = useCallback(async () => {
    assertRestorationComplete();
    const { version } = beginOperation();
    await replaceIdentity(version, null);
  }, [assertRestorationComplete, beginOperation, replaceIdentity]);

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
