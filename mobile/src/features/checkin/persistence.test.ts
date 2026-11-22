import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncOutbox } from '@/lib/asyncOutbox';
import { persistCheckIn, type CheckInPayload } from './persistence';

const mockFetch = jest.fn();

jest.mock('@/lib/supabase', () => {
  const { PostgrestClient } = jest.requireActual('@supabase/postgrest-js');
  return {
    supabase: new PostgrestClient('https://check-in.test', {
      fetch: (...args: unknown[]) => mockFetch(...args),
    }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const payload: CheckInPayload = {
  date: '2026-09-18',
  morning_weight: 72.4,
  sleep_hours: 7.5,
  workout_status: 'completed',
  workout_performance: 8,
  nutrition_score: 7,
  calorie_intake: 2400,
  water_liters: 3,
  daily_steps: 8500,
  protein: 160,
  carbs: 260,
  fats: 70,
  energy_level: 8,
  hunger_level: 4,
  stress_level: 3,
  digestion: 'none',
  notes: 'boundary fixture',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('persistCheckIn PostgREST boundary', () => {
  let stored: string | null;

  beforeEach(() => {
    mockFetch.mockReset();
    stored = null;
    jest.mocked(AsyncStorage.getItem).mockImplementation(async () => stored);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
      stored = value;
    });
  });

  it('rejects a zero-row update before releasing the saved intent', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1' }]))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(persistCheckIn('user-1', payload)).rejects.toMatchObject({ status: 403 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the exact intent durable when an SDK update acknowledges zero rows', async () => {
    const input = { userId: 'user-1', payload };
    const outbox = createAsyncOutbox<typeof input, typeof input & { id: string; queuedAt: number }>({
      storageKey: 'check-in-boundary-test',
      belongsTo: (item, userId) => item.userId === userId,
      sameTarget: (item, candidate) =>
        item.userId === candidate.userId && item.payload.date === candidate.payload.date,
      toItem: (candidate) => ({
        ...candidate,
        id: `${candidate.userId}:${candidate.payload.date}`,
        queuedAt: 1,
      }),
    });
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1' }]))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(
      outbox.save(input, (item) => persistCheckIn(item.userId, item.payload)),
    ).resolves.toEqual({
      status: 'blocked',
      value: null,
      failure: { kind: 'permission', retryable: false, code: 'http-403' },
    });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'user-1:2026-09-18',
        payload,
        failure: { kind: 'permission', retryable: false, code: 'http-403' },
      }),
    ]);
  });

  it('rejects an update acknowledgement owned by another account', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1', user_id: 'user-2' }]));

    await expect(persistCheckIn('user-1', payload)).rejects.toMatchObject({ status: 403 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('accepts an update only after the SDK returns the owned row identity', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-1', user_id: 'user-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ package_start_date: payload.date }]));

    await expect(persistCheckIn('user-1', payload)).resolves.toEqual({ updated: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('rejects an insert that returns no owned row identity', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(persistCheckIn('user-1', payload)).rejects.toThrow(
      'Check-in insert affected no owned row',
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('accepts an insert only after the SDK returns the owned row identity', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'check-2', user_id: 'user-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ package_start_date: payload.date }]));

    await expect(persistCheckIn('user-1', payload)).resolves.toEqual({ updated: false });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
