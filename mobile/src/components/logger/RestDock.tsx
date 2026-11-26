import { HIT_SLOP_MIN } from '@/theme/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { radius, spacing, useTheme } from '@/theme';
import { REST_PRESETS, useRestTimer } from './useRestTimer';

type Preference = { autoStart: boolean; seconds: number | null };
const defaults: Preference = { autoStart: false, seconds: null };
export function useRestPreference(userId: string) {
  const owner = useRef(userId); owner.current = userId;
  const [value, setValue] = useState<{ owner: string; preference: Preference }>({ owner: userId, preference: defaults });
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  useEffect(() => {
    const currentVersion = ++version.current;
    setError(null); setValue({ owner: userId, preference: defaults });
    void AsyncStorage.getItem(`workout-rest-preference:${userId}`).then((raw) => {
      if (!raw || owner.current !== userId || version.current !== currentVersion) return;
      const parsed = JSON.parse(raw) as Preference;
      if (typeof parsed.autoStart !== 'boolean' || (parsed.seconds !== null && (!Number.isFinite(parsed.seconds) || parsed.seconds <= 0))) throw new Error('Invalid rest preference');
      setValue({ owner: userId, preference: parsed });
    }).catch(() => { if (owner.current === userId) setError('Couldn’t read your rest preference. Auto-start is off.'); });
    return () => { version.current += 1; };
  }, [userId]);
  const change = useCallback(async (preference: Preference) => {
    const currentVersion = ++version.current;
    try {
      await AsyncStorage.setItem(`workout-rest-preference:${userId}`, JSON.stringify(preference));
      if (owner.current === userId && version.current === currentVersion) { setValue({ owner: userId, preference }); setError(null); }
    } catch { if (owner.current === userId) setError('Couldn’t save your rest preference. Try again.'); }
  }, [userId]);
  return { preference: value.owner === userId ? value.preference : defaults, change, error: value.owner === userId ? error : null };
}

export function WorkoutRestFooter({ children, onHeightChange }: { children: ReactNode; onHeightChange?: (height: number) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lastHeight = useRef(0);
  const heightChangeRef = useRef(onHeightChange);
  heightChangeRef.current = onHeightChange;
  useEffect(() => () => heightChangeRef.current?.(0), []);
  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height === lastHeight.current) return;
    lastHeight.current = height;
    onHeightChange?.(height);
  };
  return <View testID="workout-rest-footer" onLayout={handleLayout} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
    {children}
  </View>;
}

/** The only ticking subscriber in the workout route. Expanded controls are deliberate. */
export function RestDock({ prescribedSeconds, preference, onPreferenceChange, preferenceError }: {
  prescribedSeconds?: number;
  preference: Preference;
  onPreferenceChange: (preference: Preference) => void;
  preferenceError?: string | null;
}) {
  const { colors } = useTheme();
  const timer = useRestTimer();
  const { isCompact } = useResponsiveLayout();
  const [expanded, setExpanded] = useState(false);
  const prescribed = prescribedSeconds && Number.isFinite(prescribedSeconds) && prescribedSeconds > 0 ? prescribedSeconds : null;
  const seconds = prescribed ?? preference.seconds;
  const active = timer.running || timer.paused;
  const mmss = `${Math.floor(timer.remaining / 60)}:${String(timer.remaining % 60).padStart(2, '0')}`;
  return <View testID="rest-dock" style={{ gap: spacing.xs }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
      <View style={{ flex: 1, minWidth: isCompact ? 120 : 100, gap: spacing.xs }}>
        {active ? <Text variant="overline" tone="primary">Rest</Text> : null}
        <Text variant={active ? 'h2' : 'bodySm'} numeric accessibilityLabel={active ? `Rest ${timer.paused ? 'paused' : 'running'}, ${timer.remaining} seconds remaining` : timer.complete ? 'Rest finished' : 'Rest timer ready'}>
          {active ? `${mmss}${timer.paused ? ' · paused' : ''}` : timer.complete ? 'Rest finished' : 'Rest after each set'}
        </Text>
      </View>
      {active ? <>
        <RestAction label={timer.paused ? 'Resume' : 'Pause'} accessibilityLabel={timer.paused ? 'Resume rest timer' : 'Pause rest timer'} onPress={timer.toggle} />
        <RestAction label="+15s" accessibilityLabel="Extend rest by 15 seconds" onPress={() => timer.extend(15)} />
        <RestAction label="Skip" accessibilityLabel="Skip rest" onPress={timer.skip} />
      </> : seconds ? <RestAction label={`Start ${seconds}s`} accessibilityLabel={`Start ${seconds} second rest`} onPress={() => timer.start(seconds)} /> : null}
      <Button label={expanded ? 'Less' : 'Rest options'} variant="ghost" icon={<DisclosureChevron expanded={expanded} />} onPress={() => setExpanded((open) => !open)} />
    </View>
    {active ? <View accessibilityRole="progressbar" accessibilityLabel="Rest time remaining" accessibilityValue={{ min: 0, max: timer.duration, now: timer.remaining, text: `${timer.remaining} seconds remaining` }} style={{ height: 4, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.elevated }}>
      <View style={{ width: `${timer.duration > 0 ? Math.max(0, Math.min(100, (timer.remaining / timer.duration) * 100)) : 0}%`, height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary }} />
    </View> : null}
    {expanded ? <View style={{ gap: spacing.sm }}>
      <Text variant="bodySm" tone="muted">{prescribed ? `Prescribed rest · ${prescribed} seconds` : preference.seconds ? `Your rest choice · ${preference.seconds} seconds` : 'Choose your rest duration.'}</Text>
      {!prescribed ? <SegmentedControl label="Rest duration" value={String(preference.seconds ?? '')} segments={REST_PRESETS.map((duration) => ({ value: String(duration), label: `${duration}s` }))} onChange={(duration) => onPreferenceChange({ ...preference, seconds: Number(duration) })} /> : null}
      <SwitchRow label="Auto-start after a set" value={preference.autoStart} onValueChange={(autoStart) => onPreferenceChange({ ...preference, autoStart })} />
    </View> : null}
    {preferenceError ? <Text variant="bodySm" tone="destructive">{preferenceError}</Text> : null}
  </View>;
}

function RestAction({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, minWidth: HIT_SLOP_MIN, paddingHorizontal: spacing.xs, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}><Text variant="bodySm" tone="primary">{label}</Text></Pressable>;
}
