import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { Button, Input, Sheet, Text } from '@/components/ui';
import { useMeasurementMutation } from '@/hooks/useMeasurements';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { num, type BodyMeasurement } from '@/types/db';
import { spacing } from '@/theme';

const FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'arms', label: 'Arms' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];
type Draft = Record<FieldKey, string>;

const EMPTY: Draft = { chest: '', waist: '', hips: '', thighs: '', arms: '' };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Row being edited; null = new entry for today. */
  editing: BodyMeasurement | null;
  /** Most recent entry, used to prefill so the user edits deltas. */
  previous: BodyMeasurement | null;
  onSaved: (payoff: string) => void;
};

export function MeasurementSheet({ visible, onClose, editing, previous, onSaved }: Props) {
  const mutation = useMeasurementMutation();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const refs = useRef<Record<string, TextInput | null>>({});

  const date = editing?.date ?? localDateString();

  useEffect(() => {
    if (!visible) return;
    const source = editing ?? previous;
    if (!source) {
      setDraft(EMPTY);
    } else {
      setDraft({
        chest: source.chest ? String(num(source.chest)) : '',
        waist: source.waist ? String(num(source.waist)) : '',
        hips: source.hips ? String(num(source.hips)) : '',
        thighs: source.thighs ? String(num(source.thighs)) : '',
        arms: source.arms ? String(num(source.arms)) : '',
      });
    }
    setErrors({});
    setSaveError(null);
  }, [visible, editing, previous]);

  const validate = (value: string): string | undefined => {
    if (!value.trim()) return undefined;
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return 'Enter a number in centimetres.';
    if (n < 20 || n > 250) return 'That looks off — expected 20–250 cm.';
    return undefined;
  };

  const save = async () => {
    const next: Partial<Record<FieldKey, string>> = {};
    for (const f of FIELDS) {
      const e = validate(draft[f.key]);
      if (e) next[f.key] = e;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaveError(null);
    try {
      await mutation.mutateAsync({
        date,
        chest: draft.chest ? parseFloat(draft.chest) : null,
        waist: draft.waist ? parseFloat(draft.waist) : null,
        hips: draft.hips ? parseFloat(draft.hips) : null,
        thighs: draft.thighs ? parseFloat(draft.thighs) : null,
        arms: draft.arms ? parseFloat(draft.arms) : null,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Delta payoff against the previous entry.
      let payoff = 'Measurements saved.';
      if (previous && draft.waist) {
        const delta = num(previous.waist) - parseFloat(draft.waist);
        if (Math.abs(delta) >= 0.1) {
          payoff = `Waist ${delta > 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)} cm since last time`;
        }
      }
      AccessibilityInfo.announceForAccessibility(payoff);
      onSaved(payoff);
      onClose();
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError("Couldn't save. Check your connection and try again.");
    }
  };

  const hintFor = useMemo(
    () => (key: FieldKey) => {
      if (!previous || editing) return undefined;
      const v = num(previous[key]);
      return v > 0 ? `last: ${v} cm` : undefined;
    },
    [previous, editing],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? `Edit ${format(parseLocalDate(date), 'd MMM yyyy')}` : 'Add measurements'}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="bodySm" tone="muted">
            {editing
              ? 'Editing an existing entry — the date is locked.'
              : `Recording for ${format(parseLocalDate(date), 'EEEE d MMMM')}. Values are prefilled from your last entry, so you only change what moved.`}
          </Text>

          {FIELDS.map((f, i) => (
            <Input
              key={f.key}
              ref={(r) => {
                refs.current[f.key] = r;
              }}
              label={`${f.label} (cm)`}
              hint={hintFor(f.key)}
              error={errors[f.key]}
              value={draft[f.key]}
              onChangeText={(t) => {
                setDraft((p) => ({ ...p, [f.key]: t }));
                setErrors((p) => ({ ...p, [f.key]: undefined }));
              }}
              onBlur={() => setErrors((p) => ({ ...p, [f.key]: validate(draft[f.key]) }))}
              keyboardType="decimal-pad"
              returnKeyType={i === FIELDS.length - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                const nextField = FIELDS[i + 1];
                if (nextField) refs.current[nextField.key]?.focus();
                else void save();
              }}
              placeholder="0.0"
            />
          ))}

          {saveError ? (
            <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : null}
        </ScrollView>

        <View style={{ padding: spacing.base }}>
          <Button label="Save" onPress={save} loading={mutation.isPending} />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
