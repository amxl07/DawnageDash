import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Switch, View } from 'react-native';

import { Button, Card, OptionRow, PageHeader, Screen, Sheet, Text } from '@/components/ui';
import {
  DEFAULT_SETTINGS,
  applyReminderSettings,
  hasPermission,
  listScheduled,
  loadSettings,
  requestPermission,
  reconcile,
  remindersAvailable,
  reminderDelivery,
  waitForReminderChanges,
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
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [showExplainer, setShowExplainer] = useState<null | 'daily' | 'weekly'>(null);
  const [picker, setPicker] = useState<null | 'daily' | 'weekly'>(null);
  const [dayPicker, setDayPicker] = useState(false);
  const [scheduled, setScheduled] = useState<Awaited<ReturnType<typeof listScheduled>> | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(!remindersAvailable());
  const updating = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const refreshGeneration = useRef(0);
  const delivery = reminderDelivery(settings, scheduled);
  const showPermissionDenied = permissionDenied || (permissionGranted === false && (settings.dailyEnabled || settings.weeklyEnabled));
  const dailySwitchEnabled = settings.dailyEnabled && permissionGranted !== false;
  const weeklySwitchEnabled = settings.weeklyEnabled && permissionGranted !== false;

  const refreshScheduled = useCallback((repair = false) => {
    const generation = ++refreshGeneration.current;
    void (async () => {
      if (repair) await reconcile().catch(() => {});
      else await waitForReminderChanges();
      if (generation !== refreshGeneration.current) return;
      const [schedule, permission] = await Promise.allSettled([listScheduled(), hasPermission()]);
      if (generation !== refreshGeneration.current) return;
      if (schedule.status === 'fulfilled') {
        setScheduled(schedule.value);
      } else { setScheduled(null); }
      if (permission.status === 'fulfilled') {
        setPermissionGranted(permission.value);
        if (permission.value) setPermissionDenied(false);
      } else { setPermissionGranted(null); setScheduled(null); }
    })();
  }, []);

  useEffect(() => {
    void loadSettings().then((saved) => { setSettings(saved); setLoaded(true); }).catch(() => setReminderError('Your saved reminder preferences couldn’t load. Retry before changing them.'));
  }, []);
  useFocusEffect(useCallback(() => { refreshScheduled(true); }, [refreshScheduled]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshScheduled(true); });
    return () => { subscription.remove(); refreshGeneration.current += 1; };
  }, [refreshScheduled]);

  const persist = async (next: ReminderSettings) => {
    if (updating.current || !loaded) return;
    updating.current = true; setBusy(true); setReminderError(null);
    refreshGeneration.current += 1;
    try {
      const applied = await applyReminderSettings(next);
      setSettings(next);
      if (!applied) setReminderError('Your preferences are saved. Some device schedules still need to be applied.');
    } catch { setReminderError('We couldn’t save all reminder changes. Review the schedule and try again.'); }
    finally { updating.current = false; setBusy(false); refreshScheduled(); }
  };

  /** Only ever ask when the user turns something ON — never on launch. */
  const enable = async (which: 'daily' | 'weekly') => {
    if (!remindersAvailable()) { setUnavailable(true); return; }
    let granted = false;
    try { granted = (await hasPermission()) || (await requestPermission()); }
    catch { setReminderError('Reminder permissions are unavailable. Try again later.'); return; }
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
    if (value) {
      if (permissionGranted === true) {
        void persist(which === 'daily' ? { ...settings, dailyEnabled: true } : { ...settings, weeklyEnabled: true });
      } else setShowExplainer(which);
    }
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
          <Text variant="bodySm" tone="muted">Times follow your device timezone.</Text>
          {unavailable ? <Text variant="bodySm" tone="muted">Reminders aren’t available in this preview. Set them up on your device.</Text> : null}
          {reminderError ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{reminderError}</Text> : null}
          {reminderError || delivery.daily === 'pending' || delivery.weekly === 'pending' ? <Button label="Retry reminder setup" variant="secondary" loading={busy} onPress={() => { void loadSettings().then((saved) => { setSettings(saved); setLoaded(true); setReminderError(null); if (loaded) return persist(saved); refreshScheduled(); }).catch(() => setReminderError('Saved preferences are still unavailable. Please try again.')); }} /> : null}
          {!unavailable && scheduled === null ? <Button label="Refresh reminder status" variant="secondary" disabled={busy} onPress={() => refreshScheduled()} /> : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: HIT_SLOP_MIN }}>
            <View style={{ flex: 1 }}>
              <Text>Daily check-in</Text>
              <Text variant="bodySm" tone="muted" numeric>
                {settings.dailyEnabled ? (delivery.daily === 'scheduled' ? '' : 'Requested: ') + fmtTime(settings.dailyHour, settings.dailyMinute) : 'Off'}
              </Text>
              {delivery.daily === 'pending' || delivery.daily === 'unavailable' ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">{delivery.daily === 'pending' ? 'Device schedule needs updating' : 'Device schedule unavailable'}</Text> : null}
            </View>
            <Switch
              value={dailySwitchEnabled}
              disabled={busy || unavailable || !loaded}
              onValueChange={(value) =>
                toggle(
                  'daily',
                  permissionGranted === false && settings.dailyEnabled ? false : value,
                )
              }
              accessibilityRole="switch"
              accessibilityLabel="Daily check-in reminder"
              accessibilityState={{ checked: dailySwitchEnabled }}
              trackColor={{ true: colors.primaryFill, false: colors.borderStrong }}
            />
          </View>
          {settings.dailyEnabled ? (
            Platform.OS === 'ios' ? <CompactReminderTime label="Daily reminder time" hour={settings.dailyHour} minute={settings.dailyMinute} disabled={busy || unavailable || !loaded}
              onChange={(dailyHour, dailyMinute) => { void persist({ ...settings, dailyHour, dailyMinute }); }} /> :
            <Button label="Change time" variant="secondary" disabled={busy || unavailable || !loaded} onPress={() => setPicker('daily')} />
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
                  ? `${delivery.weekly === 'scheduled' ? '' : 'Requested: '}${WEEKDAYS[settings.weeklyWeekday - 1]}, ${fmtTime(settings.weeklyHour, settings.weeklyMinute)}`
                  : 'Off'}
              </Text>
              {delivery.weekly === 'pending' || delivery.weekly === 'unavailable' ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">{delivery.weekly === 'pending' ? 'Device schedule needs updating' : 'Device schedule unavailable'}</Text> : null}
            </View>
            <Switch
              value={weeklySwitchEnabled}
              disabled={busy || unavailable || !loaded}
              onValueChange={(value) =>
                toggle(
                  'weekly',
                  permissionGranted === false && settings.weeklyEnabled ? false : value,
                )
              }
              accessibilityRole="switch"
              accessibilityLabel="Weekly check-in reminder"
              accessibilityState={{ checked: weeklySwitchEnabled }}
              trackColor={{ true: colors.primaryFill, false: colors.borderStrong }}
            />
          </View>
          {settings.weeklyEnabled ? (
            <View style={{ gap: spacing.sm }}>
              <Button label="Change day" variant="text" disabled={busy || unavailable || !loaded} onPress={() => setDayPicker(true)} />
              {Platform.OS === 'ios' ? <CompactReminderTime label="Weekly reminder time" hour={settings.weeklyHour} minute={settings.weeklyMinute} disabled={busy || unavailable || !loaded}
                onChange={(weeklyHour, weeklyMinute) => { void persist({ ...settings, weeklyHour, weeklyMinute }); }} /> :
              <Button label="Change time" variant="secondary" disabled={busy || unavailable || !loaded} onPress={() => setPicker('weekly')} />}
            </View>
          ) : null}

          {showPermissionDenied ? (
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
      <Sheet role="choice"
        visible={showExplainer !== null}
        onClose={() => setShowExplainer(null)}
        title="Turn on reminders?"
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

      <Sheet role="choice"
        visible={dayPicker}
        onClose={() => setDayPicker(false)}
        title="Which day?"
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


function CompactReminderTime({ label, hour, minute, disabled, onChange }: {
  label: string; hour: number; minute: number; disabled: boolean; onChange: (hour: number, minute: number) => void;
}) {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
    <Text variant="bodySm" tone="muted">Time</Text>
    <DateTimePicker mode="time" display="compact" value={value} disabled={disabled} accessibilityLabel={label}
      onChange={(event, selected) => { if (event.type === 'set' && selected && !disabled) onChange(selected.getHours(), selected.getMinutes()); }} />
  </View>;
}
