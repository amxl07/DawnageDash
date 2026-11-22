import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CheckInPayload } from './persistence';
import { persistCheckIn } from './persistence';
import { flushCheckInOutbox, readCheckInOutbox, saveCheckIn, subscribeCheckInDelivery } from './checkInOutbox';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('./persistence', () => ({ persistCheckIn: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { refreshSession: jest.fn() } },
}));

const mockStorage = jest.mocked(AsyncStorage);
const mockPersist = jest.mocked(persistCheckIn);

const payload = (energy: number): CheckInPayload => ({
  date: '2026-08-31',
  morning_weight: 72.4,
  sleep_hours: 7.5,
  workout_status: 'cardio_day',
  workout_performance: 8,
  nutrition_score: 7,
  calorie_intake: 2400,
  water_liters: 3,
  daily_steps: 8500,
  protein: 160,
  carbs: 260,
  fats: 70,
  energy_level: energy,
  hunger_level: 4,
  stress_level: 3,
  digestion: 'none',
  notes: null,
});

describe('check-in AsyncStorage outbox', () => {
  let stored: string | null;
  let revisions: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersist.mockReset();
    stored = null;
    revisions = null;
    mockStorage.getItem.mockImplementation(async (key) =>
      key === 'checkin-outbox' ? stored : revisions,
    );
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (key === 'checkin-outbox') stored = value;
      else revisions = value;
    });
    mockPersist.mockResolvedValue({ updated: false });
  });

  it('durably queues the exact payload when persistence fails', async () => {
    mockPersist.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(saveCheckIn('user-1', payload(7))).resolves.toEqual({
      status: 'offline',
      updated: null,
    });
    await expect(readCheckInOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'user-1:2026-08-31',
        payload: payload(7),
        revision: 1,
        failure: { kind: 'transport', retryable: true, code: 'network-request-failed' },
      }),
    ]);
  });

  it('lets a newer same-day check-in replace the queued payload', async () => {
    mockPersist.mockRejectedValue(new TypeError('Network request failed'));
    await saveCheckIn('user-1', payload(5));
    await saveCheckIn('user-1', payload(9));

    await expect(readCheckInOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ payload: payload(9) }),
    ]);
  });

  it('flushes only the signed-in account and retains failed work', async () => {
    mockPersist.mockRejectedValue(new TypeError('Network request failed'));
    await saveCheckIn('user-1', payload(5));
    await saveCheckIn('user-2', payload(8));

    mockPersist
      .mockResolvedValueOnce({ updated: true })
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(flushCheckInOutbox('user-1')).resolves.toBe(1);
    await expect(readCheckInOutbox('user-1')).resolves.toEqual([]);
    await expect(readCheckInOutbox('user-2')).resolves.toHaveLength(1);
  });

  it('returns blocked for a validation error and retains the correctable payload', async () => {
    mockPersist.mockRejectedValueOnce({
      message: 'invalid input syntax for type numeric: private value',
      details: null,
      hint: null,
      code: '22P02',
    });

    await expect(saveCheckIn('user-1', payload(7))).resolves.toEqual({
      status: 'blocked',
      updated: null,
      failure: { kind: 'validation', retryable: false, code: '22p02' },
    });
    await expect(readCheckInOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        payload: payload(7),
        failure: { kind: 'validation', retryable: false, code: '22p02' },
      }),
    ]);
  });

  it('never sends local delivery metadata in the check-in payload', async () => {
    await saveCheckIn('user-1', payload(7));

    expect(mockPersist).toHaveBeenCalledWith('user-1', payload(7));
  });

  it('publishes a permanent reconnect failure even when the flush confirms zero rows', async () => {
    const events: unknown[] = [];
    const unsubscribe = subscribeCheckInDelivery((event) => events.push(event));
    mockPersist.mockRejectedValueOnce(new TypeError('Network request failed'));
    await saveCheckIn('user-1', payload(7));
    mockPersist.mockRejectedValueOnce({ message: 'forbidden', code: '42501' });

    await expect(flushCheckInOutbox('user-1')).resolves.toBe(0);
    expect(events).toEqual([
      expect.objectContaining({ userId: 'user-1', date: '2026-08-31', revision: 1, status: 'queued' }),
      expect.objectContaining({ userId: 'user-1', date: '2026-08-31', revision: 1, status: 'blocked', failure: { kind: 'permission', retryable: false, code: '42501' } }),
    ]);

    unsubscribe();
    mockPersist.mockResolvedValueOnce({ updated: false });
    await flushCheckInOutbox('user-1');
    expect(events).toHaveLength(2);
  });
});
