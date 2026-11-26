const mockInvoke = jest.fn();
const mockClear = jest.fn(async () => {});
const mockCancelAll = jest.fn(async () => {});

jest.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ clear: () => mockClear() }));
jest.mock('@/lib/reminders', () => ({ cancelAll: () => mockCancelAll() }));

import { deleteAccount } from './deleteAccount';

beforeEach(() => jest.clearAllMocks());

test('deletes on the server, then wipes this device and signs out', async () => {
  mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
  const signOut = jest.fn(async () => {});
  await deleteAccount(signOut);
  expect(mockInvoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
  expect(mockCancelAll).toHaveBeenCalled();
  expect(mockClear).toHaveBeenCalled();
  expect(signOut).toHaveBeenCalled();
});

test('a server refusal keeps the account signed in and shows the server reason', async () => {
  mockInvoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: 'Sign in again to delete your account.' }) } } });
  const signOut = jest.fn(async () => {});
  await expect(deleteAccount(signOut)).rejects.toThrow('Sign in again to delete your account.');
  expect(mockClear).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});

test('a network failure gives a retryable message', async () => {
  mockInvoke.mockResolvedValue({ data: null, error: new Error('Failed to send a request') });
  await expect(deleteAccount(jest.fn())).rejects.toThrow(/connection/);
});
