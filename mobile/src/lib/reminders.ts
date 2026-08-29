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
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as ReminderSettings) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
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
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasPermission(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

/** Cancel-then-schedule against a fixed identifier = idempotent, no duplicates. */
async function scheduleWithId(
  identifier: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({ identifier, content, trigger });
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await ensureAndroidChannel();
  await scheduleWithId(
    DAILY_ID,
    {
      title: 'Time for your daily check-in 💪',
      body: 'Takes under a minute — most of it is already filled in.',
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
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
}
export async function cancelWeekly(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
}
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/**
 * The OS can clear schedules (reboot, force-stop, aggressive battery savers).
 * Re-create anything missing whenever the app comes to the foreground.
 */
export async function reconcile(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.dailyEnabled && !settings.weeklyEnabled) return;
  if (!(await hasPermission())) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const ids = new Set(scheduled.map((n) => n.identifier));

  if (settings.dailyEnabled && !ids.has(DAILY_ID)) {
    await scheduleDaily(settings.dailyHour, settings.dailyMinute);
  }
  if (!settings.dailyEnabled && ids.has(DAILY_ID)) await cancelDaily();

  if (settings.weeklyEnabled && !ids.has(WEEKLY_ID)) {
    await scheduleWeekly(settings.weeklyWeekday, settings.weeklyHour, settings.weeklyMinute);
  }
  if (!settings.weeklyEnabled && ids.has(WEEKLY_ID)) await cancelWeekly();
}

export async function listScheduled() {
  return Notifications.getAllScheduledNotificationsAsync().catch(() => []);
}
