import { Platform } from 'react-native';
import { applyReminderSettings, cancelDaily, DAILY_ID, WEEKLY_ID, listScheduled, reconcile, reminderDelivery, remindersAvailable, requestPermission, saveSettings, scheduleDaily, DEFAULT_SETTINGS } from './reminders';

const mockSave = jest.fn();
const mockCancel = jest.fn();
const mockSchedule = jest.fn();
const mockList = jest.fn();
const mockPermission = jest.fn();
const mockLoad = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({ setItem: (...args: unknown[]) => mockSave(...args), getItem: () => mockLoad() }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  getAllScheduledNotificationsAsync: () => mockList(),
  getPermissionsAsync: () => mockPermission(),
  requestPermissionsAsync: () => mockPermission(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  mockCancel.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue(DAILY_ID);
  mockSave.mockResolvedValue(undefined);
  mockLoad.mockResolvedValue(null);
});
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }); });

it('uses a stable identifier and the chosen device-local hour and minute', async () => {
  await scheduleDaily(9, 15);
  expect(mockCancel).not.toHaveBeenCalled();
  expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ identifier: DAILY_ID, trigger: { type: 'daily', hour: 9, minute: 15 } }));
});
it('keeps desired settings and exposes per-channel status after a partial OS failure', async () => {
  const desired = { ...DEFAULT_SETTINGS, dailyEnabled: true, dailyHour: 9, weeklyEnabled: true };
  mockSchedule.mockImplementation(async ({ identifier }: { identifier: string }) => { if (identifier === WEEKLY_ID) throw new Error('weekly unavailable'); return identifier; });
  expect(await applyReminderSettings(desired)).toBe(false);
  expect(mockSave).toHaveBeenCalledWith('reminder-settings', JSON.stringify(desired));
  expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockSchedule.mock.invocationCallOrder[0]);
  expect(reminderDelivery(desired, [{ identifier: DAILY_ID, trigger: { type: 'daily', hour: 9, minute: 0 } }])).toEqual({ daily: 'scheduled', weekly: 'pending' });
});
it('does not cancel or schedule anything when the desired settings cannot be persisted', async () => {
  mockSave.mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(applyReminderSettings(DEFAULT_SETTINGS)).rejects.toThrow('storage unavailable');
  expect(mockCancel).not.toHaveBeenCalled();
  expect(mockSchedule).not.toHaveBeenCalled();
});
it('propagates storage and OS failures so Settings cannot show false success', async () => {
  mockSave.mockRejectedValue(new Error('storage unavailable'));
  mockCancel.mockRejectedValue(new Error('OS unavailable'));
  mockList.mockRejectedValue(new Error('OS unavailable'));
  await expect(saveSettings(DEFAULT_SETTINGS)).rejects.toThrow('storage unavailable');
  await expect(cancelDaily()).rejects.toThrow('OS unavailable');
  await expect(listScheduled()).rejects.toThrow('OS unavailable');
});
it('does not request native notification permission in a web preview', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  expect(remindersAvailable()).toBe(false);
  expect(await requestPermission()).toBe(false);
  expect(mockPermission).not.toHaveBeenCalled();
});

it('keeps a newer requested time when an older foreground repair finishes slowly', async () => {
  let release!: () => void;
  let started!: () => void;
  const nativeWait = new Promise<void>((resolve) => { release = resolve; });
  const nativeStarted = new Promise<void>((resolve) => { started = resolve; });
  let nativeHour: number | undefined;
  mockLoad.mockResolvedValue(JSON.stringify({ ...DEFAULT_SETTINGS, dailyEnabled: true }));
  mockPermission.mockResolvedValue({ granted: true });
  mockSchedule.mockImplementation(async ({ trigger }: { trigger: { hour: number } }) => {
    if (trigger.hour === 8) { started(); await nativeWait; }
    nativeHour = trigger.hour;
    return DAILY_ID;
  });
  const repair = reconcile();
  await nativeStarted;
  const change = applyReminderSettings({ ...DEFAULT_SETTINGS, dailyEnabled: true, dailyHour: 9 });
  release();
  await Promise.all([repair, change]);
  expect(nativeHour).toBe(9);
});
