import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CheckInPayload } from './persistence';
import { persistCheckIn } from './persistence';
import { flushCheckInOutbox, readCheckInOutbox, saveCheckIn } from './checkInOutbox';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('./persistence', () => ({ persistCheckIn: jest.fn() }));

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

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    mockStorage.getItem.mockImplementation(async () => stored);
    mockStorage.setItem.mockImplementation(async (_key, value) => {
      stored = value;
    });
    mockPersist.mockResolvedValue({ updated: false });
  });

  it('durably queues the exact payload when persistence fails', async () => {
    mockPersist.mockRejectedValueOnce(new Error('offline'));

    await expect(saveCheckIn('user-1', payload(7))).resolves.toEqual({
      status: 'offline',
      updated: null,
    });
    await expect(readCheckInOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'user-1:2026-08-31',
        payload: payload(7),
      }),
    ]);
  });

  it('lets a newer same-day check-in replace the queued payload', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    await saveCheckIn('user-1', payload(5));
    await saveCheckIn('user-1', payload(9));

    await expect(readCheckInOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ payload: payload(9) }),
    ]);
  });

  it('flushes only the signed-in account and retains failed work', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    await saveCheckIn('user-1', payload(5));
    await saveCheckIn('user-2', payload(8));

    mockPersist
      .mockResolvedValueOnce({ updated: true })
      .mockRejectedValueOnce(new Error('still offline'));

    await expect(flushCheckInOutbox('user-1')).resolves.toBe(1);
    await expect(readCheckInOutbox('user-1')).resolves.toEqual([]);
    await expect(readCheckInOutbox('user-2')).resolves.toHaveLength(1);
  });
});
