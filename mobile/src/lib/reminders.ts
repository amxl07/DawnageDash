import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * On-device reminders only. No push tokens, no server, no new tables.
 *
 * Kept behind this small interface so a future server-push module can sit
 * beside it without touching call sites (plan §7.6).
 */

export const DAILY_ID = 'daily-checkin-reminder';
export const WEEKLY_ID = 'weekly-checkin-reminder';
const SETTINGS_KEY = 'reminder-settings';
const ANDROID_CHANNEL = 'reminders';

export type ReminderSettings = {
  dailyEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  weeklyEnabled: boolean;
  /** 1 = Sunday … 7 = Saturday (expo-notifications convention). */
  weeklyWeekday: number;
  weeklyHour: number;
  weeklyMinute: number;
};

export const DEFAULT_SETTINGS: ReminderSettings = {
  dailyEnabled: false,
  dailyHour: 8,
  dailyMinute: 0,
  weeklyEnabled: false,
  weeklyWeekday: 1, // Sunday
  weeklyHour: 18,
  weeklyMinute: 0,
};

export async function loadSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as ReminderSettings) } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function remindersAvailable(): boolean {
  return Platform.OS !== 'web' && Device.isDevice;
}

/** Android 8+ silently drops notifications posted without a channel. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!remindersAvailable()) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasPermission(): Promise<boolean> {
  if (!remindersAvailable()) return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

/** Replace the request with the same native identifier without first deleting it. */
async function scheduleWithId(
  identifier: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({ identifier, content, trigger });
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await ensureAndroidChannel();
  await scheduleWithId(
    DAILY_ID,
    {
      title: 'A moment for your daily record',
      body: 'Check in with your training, nutrition and recovery when you’re ready.',
      data: { url: '/check-in' },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    {
      // DAILY fires in the device's local timezone — no timezone maths needed.
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  );
}

export async function scheduleWeekly(
  weekday: number,
  hour: number,
  minute: number,
): Promise<void> {
  await ensureAndroidChannel();
  await scheduleWithId(
    WEEKLY_ID,
    {
      title: 'Your weekly check-in is ready 📝',
      body: 'Tell your coach how the week went.',
      data: { url: '/weekly-feedback' },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    },
  );
}

export async function cancelDaily(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
}
export async function cancelWeekly(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID);
}
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/**
 * The OS can clear schedules (reboot, force-stop, aggressive battery savers).
 * Re-create anything missing whenever the app comes to the foreground.
 */
let scheduleOperation: Promise<unknown> = Promise.resolve();
function serializeSchedules<T>(operation: () => Promise<T>): Promise<T> {
  const result = scheduleOperation.catch(() => {}).then(operation);
  scheduleOperation = result;
  return result;
}

/** A status retry reads after already-started native changes without scheduling. */
export async function waitForReminderChanges(): Promise<void> {
  await scheduleOperation.catch(() => {});
}

export function reconcile(): Promise<void> {
  return serializeSchedules(async () => {
    const settings = await loadSettings();
    if (!remindersAvailable()) return;
    if ((settings.dailyEnabled || settings.weeklyEnabled) && !(await hasPermission())) return;
    await applySchedules(settings);
  });
}

async function applySchedules(settings: ReminderSettings): Promise<boolean> {
  const outcomes = await Promise.allSettled([
    settings.dailyEnabled ? scheduleDaily(settings.dailyHour, settings.dailyMinute) : cancelDaily(),
    settings.weeklyEnabled ? scheduleWeekly(settings.weeklyWeekday, settings.weeklyHour, settings.weeklyMinute) : cancelWeekly(),
  ]);
  return outcomes.every((outcome) => outcome.status === 'fulfilled');
}

/** Persist the desired schedule before any OS change, so partial work can resume. */
export function applyReminderSettings(settings: ReminderSettings): Promise<boolean> {
  return serializeSchedules(async () => {
    await saveSettings(settings);
    return applySchedules(settings);
  });
}

export type ReminderDelivery = 'off' | 'scheduled' | 'pending' | 'unavailable';
export function reminderDelivery(settings: ReminderSettings, scheduled: { identifier: string; trigger: unknown }[] | null): Record<'daily' | 'weekly', ReminderDelivery> {
  const status = (which: 'daily' | 'weekly'): ReminderDelivery => {
    if (scheduled === null) return 'unavailable';
    const record = scheduled.find((item) => item.identifier === (which === 'daily' ? DAILY_ID : WEEKLY_ID));
    const enabled = which === 'daily' ? settings.dailyEnabled : settings.weeklyEnabled;
    if (!enabled) return record ? 'pending' : 'off';
    if (!record || !record.trigger || typeof record.trigger !== 'object') return 'pending';
    const raw = record.trigger as Record<string, unknown>;
    const parts = raw.dateComponents && typeof raw.dateComponents === 'object' ? raw.dateComponents as Record<string, unknown> : raw;
    const hour = which === 'daily' ? settings.dailyHour : settings.weeklyHour;
    const minute = which === 'daily' ? settings.dailyMinute : settings.weeklyMinute;
    return parts.hour === hour && parts.minute === minute && (which === 'daily' || parts.weekday === settings.weeklyWeekday) ? 'scheduled' : 'pending';
  };
  return { daily: status('daily'), weekly: status('weekly') };
}

export async function listScheduled() {
  return Notifications.getAllScheduledNotificationsAsync();
}
