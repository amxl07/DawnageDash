import { Check } from 'lucide-react-native';
import type { RefObject } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Button, Sheet, SheetScrollView, Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { HEALTH_FIELDS, healthFieldDefinition, healthFieldLabel, type HealthField } from './health-model';
import type { HealthReviewState } from './health-review';

export const HEALTH_ACCESS_EXPLANATION = 'Dawnage reads morning weight, steps, food calories, water, protein, carbs and fats for the reporting day you choose. Review and choose which values to use. Access is optional and read-only. Chosen values enter your daily check-in and are shared with your coach when you submit. Dawnage does not write to your health apps.';
const displayValue = (field: HealthField, value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: healthFieldDefinition(field).precision ?? 0 })} ${healthFieldDefinition(field).unit}`;
export function HealthReviewSheet({ state, onRead, onClose, onToggle, onApply, returnFocusRef }: {
  state: HealthReviewState;
  onRead: () => void;
  onClose: () => void;
  onToggle: (field: HealthField) => void;
  onApply: () => void;
  returnFocusRef?: RefObject<View | null>;
}) {
  const { colors } = useTheme();
  const result = state.result;
  const choicesDisabled = state.stage !== 'result' || !!state.error;
  return <Sheet visible={state.stage !== 'closed'} onClose={onClose} title="Review health data" role="editor" returnFocusRef={returnFocusRef}>
    <SheetScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}>
      <Text selectable variant="bodySm" tone="muted">{state.scope?.date} · {state.scope?.timezone}</Text>
      {state.stage === 'intro' ? <>
        <Text selectable>{HEALTH_ACCESS_EXPLANATION}</Text>
        <Text variant="bodySm" tone="muted">Allow only the measurements you want, or enter your check-in manually.</Text>
        {!state.error ? <Button label="Choose access and read this day" onPress={onRead} /> : null}
      </> : null}
      {state.stage === 'loading' ? <View accessibilityLiveRegion="polite" style={{ gap: spacing.sm }}>
        <Text>Reading accessible records…</Text>
        <Text variant="bodySm" tone="muted">Complete the system access dialog if it appears. You can close this review at any time.</Text>
      </View> : null}
      {result ? <>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">{result.provider}</Text>
          <Text selectable variant="bodySm" tone="muted">{result.window.partial ? 'Today so far' : 'Recorded totals'} · Read at {result.window.readAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
          <Text variant="bodySm" tone="muted">Totals cover accessible records for this local day and may be incomplete. Compare them with what you actually consumed or did.</Text>
          {result.message ? <Text selectable accessibilityLiveRegion="polite">{result.message}</Text> : null}
        </View>
        {HEALTH_FIELDS.map(field => {
          const measurement = result.measurements.find(m => m.field === field);
          const issue = result.issues.find(i => i.field === field);
          if (!measurement) return issue ? <View key={field} style={{ gap: spacing.xs }}><Text>{healthFieldLabel(field)}</Text><Text selectable variant="bodySm" tone="muted">{issue.message}</Text></View> : null;
          const existing = state.scope?.form[field];
          const replacement = existing !== null && existing !== undefined;
          const action = replacement ? 'Replace' : 'Use';
          const selected = state.selected.includes(field);
          const choice = `${action} ${healthFieldLabel(field)} with ${displayValue(field, measurement.value)}${replacement ? `, current entry ${displayValue(field, existing)}` : ''}`;
          const source = `Source: ${measurement.sources.join(', ')}`;
          const timezone = state.scope?.timezone ?? result.window.timezone;
          const observation = measurement.observedAt ? `Observed ${measurement.observedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: timezone })} · ${timezone}` : null;
          return <Pressable key={field} accessibilityRole="checkbox" accessibilityLabel={`${choice}. ${source}.${observation ? ` ${observation}.` : ''}`} accessibilityState={{ checked: selected, disabled: choicesDisabled }} accessibilityHint={replacement ? 'Explicitly choose whether to replace your existing entry.' : 'Choose whether to add this value to your check-in.'} disabled={choicesDisabled} onPress={() => onToggle(field)} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, paddingHorizontal: spacing.sm, paddingVertical: spacing.base, gap: spacing.sm, borderRadius: radius.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: pressed && !choicesDisabled ? colors.pressed : 'transparent', opacity: choicesDisabled ? 0.5 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: iconSize.lg, height: iconSize.lg, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: selected ? colors.primaryFill : colors.borderStrong, backgroundColor: selected ? colors.primaryFill : 'transparent' }}>
                {selected ? <Check size={iconSize.sm} color={colors.onPrimary} strokeWidth={2.5} accessible={false} /> : null}
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}><Text>{action} {healthFieldLabel(field)}</Text><Text numeric>{displayValue(field, measurement.value)}</Text></View>
            </View>
            {field === 'morningWeight' ? <Text variant="bodySm" tone="muted">Morning weight uses an observation before local noon.</Text> : null}
            {field === 'calorieIntake' ? <Text variant="bodySm" tone="muted">Food intake, not calories burned.</Text> : null}
            {replacement ? <Text variant="bodySm" tone="muted">Current entry: {displayValue(field, existing)}. Select to replace it.</Text> : null}
            <Text selectable variant="bodySm" tone="muted">{source}</Text>
            {observation ? <Text selectable variant="bodySm" tone="muted">{observation}</Text> : null}
          </Pressable>;
        })}
        {result.measurements.length ? <>
          <Text variant="bodySm" tone="muted">Unselected entries stay as they are. You still need to complete and submit your check-in.</Text>
          <Button label={`Use ${state.selected.length} selected ${state.selected.length === 1 ? 'value' : 'values'}`} disabled={choicesDisabled || !state.selected.length} onPress={onApply} />
        </> : null}
        {result.retryable || result.issues.some(i => i.kind === 'error' || i.kind === 'denied') ? <Button label="Review access and retry" variant="secondary" disabled={choicesDisabled} onPress={onRead} /> : null}
        <View style={{ gap: spacing.xs }}><Text variant="label">Manage access</Text><Text selectable variant="bodySm" tone="muted">{Platform.OS === 'ios' ? 'Apple Health → your profile → Apps → Dawnage.' : Platform.OS === 'android' ? 'Health Connect → App permissions → Dawnage.' : 'Manage access in your device’s health app.'} Previously submitted check-ins are managed separately in Dawnage.</Text></View>
      </> : null}
      {state.error ? <Text selectable accessibilityRole="alert">{state.error}</Text> : null}
      <Button label="Cancel health import" variant="text" onPress={onClose} />
    </SheetScrollView>
  </Sheet>;
}
