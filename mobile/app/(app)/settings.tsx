import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';

import { Button, Card, OptionRow, PageHeader, Screen, Sheet, Text } from '@/components/ui';
import {
  DEFAULT_SETTINGS,
  cancelDaily,
  cancelWeekly,
  hasPermission,
  listScheduled,
  loadSettings,
  requestPermission,
  saveSettings,
  scheduleDaily,
  scheduleWeekly,
  type ReminderSettings,
} from '@/lib/reminders';
import { useTheme, useThemePreference, type ThemePreference } from '@/theme';
import { HIT_SLOP_MIN, iconSize, spacing } from '@/theme';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmtTime = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const router = useRouter();

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showExplainer, setShowExplainer] = useState<null | 'daily' | 'weekly'>(null);
  const [picker, setPicker] = useState<null | 'daily' | 'weekly'>(null);
  const [dayPicker, setDayPicker] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const refreshScheduled = useCallback(() => {
    void listScheduled().then((s) => setScheduledCount(s.length));
  }, []);

  useEffect(() => {
    void loadSettings().then(setSettings);
    refreshScheduled();
  }, [refreshScheduled]);

  const persist = async (next: ReminderSettings) => {
    setSettings(next);
    await saveSettings(next);
    if (next.dailyEnabled) await scheduleDaily(next.dailyHour, next.dailyMinute);
    else await cancelDaily();
    if (next.weeklyEnabled) await scheduleWeekly(next.weeklyWeekday, next.weeklyHour, next.weeklyMinute);
    else await cancelWeekly();
    refreshScheduled();
  };

  /** Only ever ask when the user turns something ON — never on launch. */
  const enable = async (which: 'daily' | 'weekly') => {
    const granted = (await hasPermission()) || (await requestPermission());
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    await persist(
      which === 'daily'
        ? { ...settings, dailyEnabled: true }
        : { ...settings, weeklyEnabled: true },
    );
  };

  const toggle = (which: 'daily' | 'weekly', value: boolean) => {
    if (value) setShowExplainer(which);
    else
      void persist(
        which === 'daily'
          ? { ...settings, dailyEnabled: false }
          : { ...settings, weeklyEnabled: false },
      );
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <PageHeader title="Settings" onBack={() => router.back()} />

        <Card style={{ gap: spacing.base }}>
          <Text variant="h2">Reminders</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: HIT_SLOP_MIN }}>
            <View style={{ flex: 1 }}>
              <Text>Daily check-in</Text>
              <Text variant="bodySm" tone="muted" numeric>
                {settings.dailyEnabled ? fmtTime(settings.dailyHour, settings.dailyMinute) : 'Off'}
              </Text>
            </View>
            <Switch
              value={settings.dailyEnabled}
              onValueChange={(v) => toggle('daily', v)}
              accessibilityRole="switch"
              accessibilityLabel="Daily check-in reminder"
              accessibilityState={{ checked: settings.dailyEnabled }}
              trackColor={{ true: colors.primaryFill, false: colors.borderStrong }}
            />
          </View>
          {settings.dailyEnabled ? (
            <Button label="Change time" variant="secondary" onPress={() => setPicker('daily')} />
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: HIT_SLOP_MIN,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: spacing.base,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text>Weekly check-in</Text>
              <Text variant="bodySm" tone="muted" numeric>
                {settings.weeklyEnabled
                  ? `${WEEKDAYS[settings.weeklyWeekday - 1]}, ${fmtTime(settings.weeklyHour, settings.weeklyMinute)}`
                  : 'Off'}
              </Text>
            </View>
            <Switch
              value={settings.weeklyEnabled}
              onValueChange={(v) => toggle('weekly', v)}
              accessibilityRole="switch"
              accessibilityLabel="Weekly check-in reminder"
              accessibilityState={{ checked: settings.weeklyEnabled }}
              trackColor={{ true: colors.primaryFill, false: colors.borderStrong }}
            />
          </View>
          {settings.weeklyEnabled ? (
            <View style={{ gap: spacing.sm }}>
              <Button label="Change day" variant="secondary" onPress={() => setDayPicker(true)} />
              <Button label="Change time" variant="secondary" onPress={() => setPicker('weekly')} />
            </View>
          ) : null}

          {permissionDenied ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                Notifications are turned off for Dawnage, so reminders can&apos;t be scheduled.
              </Text>
              <Button
                label="Open Settings"
                variant="secondary"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          ) : null}

          <Text variant="bodySm" tone="muted" numeric>
            {scheduledCount} reminder{scheduledCount === 1 ? '' : 's'} scheduled on this device.
          </Text>
        </Card>

        <Card style={{ gap: spacing.base }}>
          <Text variant="h2">Appearance</Text>
          {(
            [
              ['system', 'Match device'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ] as [ThemePreference, string][]
          ).map(([v, label]) => (
            <OptionRow
              key={v}
              label={label}
              selected={preference === v}
              onPress={() => setPreference(v)}
            />
          ))}
        </Card>
      </View>

      {/* Contextual pre-permission explainer, shown BEFORE the OS prompt. */}
      <Sheet
        visible={showExplainer !== null}
        onClose={() => setShowExplainer(null)}
        title="Turn on reminders?"
        heightRatio={0.45}
      >
        <View style={{ padding: spacing.base, gap: spacing.base }}>
          <Bell size={iconSize.xl} color={colors.primary} strokeWidth={2} accessible={false} />
          <Text variant="bodySm" tone="muted">
            {showExplainer === 'daily'
              ? 'Get a nudge for your daily check-in. You can change the time or turn it off any time.'
              : 'A weekly nudge when it’s time to send your coach an update. Change it any time.'}
          </Text>
          <Button
            label="Enable reminders"
            onPress={() => {
              const which = showExplainer;
              setShowExplainer(null);
              if (which) void enable(which);
            }}
          />
          <Button label="Not now" variant="ghost" onPress={() => setShowExplainer(null)} />
        </View>
      </Sheet>

      <Sheet
        visible={dayPicker}
        onClose={() => setDayPicker(false)}
        title="Which day?"
        heightRatio={0.7}
      >
        <View style={{ padding: spacing.base, gap: spacing.sm }}>
          {WEEKDAYS.map((d, i) => (
            <OptionRow
              key={d}
              label={d}
              selected={settings.weeklyWeekday === i + 1}
              onPress={() => {
                void persist({ ...settings, weeklyWeekday: i + 1 });
                setDayPicker(false);
              }}
            />
          ))}
        </View>
      </Sheet>

      {picker ? (
        <DateTimePicker
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={(() => {
            const d = new Date();
            d.setHours(
              picker === 'daily' ? settings.dailyHour : settings.weeklyHour,
              picker === 'daily' ? settings.dailyMinute : settings.weeklyMinute,
              0,
              0,
            );
            return d;
          })()}
          onChange={(_, selected) => {
            const which = picker;
            setPicker(null);
            if (!selected || !which) return;
            void persist(
              which === 'daily'
                ? { ...settings, dailyHour: selected.getHours(), dailyMinute: selected.getMinutes() }
                : {
                    ...settings,
                    weeklyHour: selected.getHours(),
                    weeklyMinute: selected.getMinutes(),
                  },
            );
          }}
        />
      ) : null}
    </Screen>
  );
}
