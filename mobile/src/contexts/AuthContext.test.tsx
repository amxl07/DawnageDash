import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';
import { Pressable } from 'react-native';
import AuthLayout from '../../app/(auth)/_layout';
import { AuthProvider, useAuth } from './AuthContext';

const mockStorageRead = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockClear = jest.fn();
const mockStopRefresh = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSignOut = jest.fn();
let mockAuthEvent: (event: string, session: Session | null) => void;
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <Text>Redirect: {href}</Text>,
    Stack: () => <Text>Account routes</Text>,
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockStorageRead(...args),
  setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined),
}));
jest.mock('@/lib/env', () => ({ isConfigured: true }));
jest.mock('@/lib/supabase', () => ({
  clearCorruptAuthData: () => mockClear(),
  isInvalidRefreshTokenError: () => false,
  startAuthAutoRefresh: () => mockStopRefresh,
  supabase: { auth: {
    getSession: () => mockGetSession(), getUser: () => mockGetUser(),
    signOut: () => mockSignOut(),
    onAuthStateChange: (callback: typeof mockAuthEvent) => {
      mockAuthEvent = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    },
  } },
}));

function session(id: string, role?: string): Session {
  return { user: { id, user_metadata: role ? { role } : {} } } as Session;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockStorageRead.mockResolvedValue(null);
  mockSignOut.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ data: { session: session('a', 'client') }, error: null });
});

it('closes the authenticated route immediately while recovery sign-out is pending', async () => {
  const remote = deferred<void>();
  mockSignOut.mockReturnValue(remote.promise);
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(() => { mockAuthEvent('PASSWORD_RECOVERY', session('a', 'client')); });
  let pending!: Promise<void>;
  await act(() => { pending = result.current.signOut(); });
  expect(result.current.passwordRecoveryPending).toBe(false);
  expect(result.current.session).toBeNull();
  await act(() => { mockAuthEvent('TOKEN_REFRESHED', session('a', 'client')); });
  expect(result.current.session).toBeNull();
  await act(async () => { remote.resolve(); await pending; });
});

it('never renders an app redirect while the recovery route signs out', async () => {
  const remote = deferred<void>();
  mockSignOut.mockReturnValue(remote.promise);
  function RecoveryAction() {
    const { signOut } = useAuth();
    return <Pressable accessibilityRole="button" accessibilityLabel="Finish recovery" onPress={() => { void signOut(); }} />;
  }
  const view = await render(<AuthProvider><AuthLayout /><RecoveryAction /></AuthProvider>);
  expect(view.getByText('Redirect: /(app)/(tabs)')).toBeTruthy();
  await act(() => { mockAuthEvent('PASSWORD_RECOVERY', session('a', 'client')); });
  expect(view.getByText('Account routes')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Finish recovery'));
  expect(view.queryByText('Redirect: /(app)/(tabs)')).toBeNull();
  expect(view.getByText('Account routes')).toBeTruthy();
  await act(() => { mockAuthEvent('TOKEN_REFRESHED', session('a', 'client')); });
  expect(view.queryByText('Redirect: /(app)/(tabs)')).toBeNull();
  await act(async () => { remote.resolve(); await remote.promise; });
  expect(view.queryByText('Redirect: /(app)/(tabs)')).toBeNull();
});

it('holds the route gate until persisted password recovery is hydrated', async () => {
  const recovery = deferred<string | null>();
  mockStorageRead.mockReturnValue(recovery.promise);
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(() => { mockAuthEvent('INITIAL_SESSION', session('a', 'client')); });
  expect(result.current.loading).toBe(true);
  await act(async () => { recovery.resolve('1'); await recovery.promise; });
  expect(result.current.loading).toBe(false);
  expect(result.current.passwordRecoveryPending).toBe(true);
});

it('keeps a newer sign-out event when a stale boot session resolves', async () => {
  const boot = deferred<{ data: { session: Session }; error: null }>();
  mockGetSession.mockReturnValue(boot.promise);
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(() => { mockAuthEvent('SIGNED_OUT', null); });
  await act(async () => { boot.resolve({ data: { session: session('old', 'client') }, error: null }); await boot.promise; });
  expect(result.current.user).toBeNull();
  expect(result.current.loading).toBe(false);
});

it('does not invent a client role for an unknown account', async () => {
  mockGetSession.mockResolvedValue({ data: { session: session('a') }, error: null });
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(async () => { await Promise.resolve(); });
  expect(result.current.role).toBeNull();
});

it('does not replace a switched account with an older role retry response', async () => {
  const retry = deferred<{ data: { user: Session['user'] }; error: null }>();
  mockGetUser.mockReturnValue(retry.promise);
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(async () => { await Promise.resolve(); });
  let pending!: Promise<void>;
  await act(() => { pending = result.current.retryRole(); });
  await act(() => { mockAuthEvent('SIGNED_IN', session('b', 'coach')); });
  await act(async () => { retry.resolve({ data: { user: session('a', 'client').user }, error: null }); await pending; });
  expect(result.current.user?.id).toBe('b');
  expect(result.current.role).toBe('coach');
});
