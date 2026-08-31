import * as SecureStore from 'expo-secure-store';

import { normalizeServerUrl } from '@/data/server-url';
import type { AppSession } from '@/session/session-types';

export const SESSION_STORAGE_KEY = 'com.dawnage.mobile2.session';
export const SERVER_URL_STORAGE_KEY = 'com.dawnage.mobile2.server-url';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === keys.length && actualKeys.every((key, index) => key === keys[index]);
}

function isStoredSession(value: unknown): value is AppSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const session = value as Record<string, unknown>;
  if (session.mode === 'demo') {
    return (
      hasOnlyKeys(session, ['email', 'mode']) &&
      session.email === 'demo@dawnage.local'
    );
  }

  if (session.mode !== 'connected' || !hasOnlyKeys(session, ['email', 'mode', 'serverUrl', 'token'])) {
    return false;
  }

  if (
    !isNonEmptyString(session.email) ||
    !isNonEmptyString(session.serverUrl) ||
    !isNonEmptyString(session.token)
  ) {
    return false;
  }

  try {
    return normalizeServerUrl(session.serverUrl) === session.serverUrl;
  } catch {
    return false;
  }
}

function isStoredServerUrl(value: string): boolean {
  try {
    return normalizeServerUrl(value) === value;
  } catch {
    return false;
  }
}

export async function readStoredSession(): Promise<AppSession | null> {
  const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (value === null) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(value);
    if (!isStoredSession(session)) {
      throw new Error('Invalid session');
    }

    return session;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveStoredSession(session: AppSession): Promise<void> {
  return SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): Promise<void> {
  return SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export async function readStoredServerUrl(): Promise<string | null> {
  const value = await SecureStore.getItemAsync(SERVER_URL_STORAGE_KEY);
  if (value === null) {
    return null;
  }

  if (!isStoredServerUrl(value)) {
    await SecureStore.deleteItemAsync(SERVER_URL_STORAGE_KEY);
    return null;
  }

  return value;
}

export function saveStoredServerUrl(serverUrl: string): Promise<void> {
  return SecureStore.setItemAsync(SERVER_URL_STORAGE_KEY, serverUrl);
}
