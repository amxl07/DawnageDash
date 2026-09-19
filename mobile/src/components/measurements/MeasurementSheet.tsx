import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, TextInput, View } from 'react-native';

import { Button, Input, Sheet, SheetScrollView, StatusPill, Text } from '@/components/ui';
import { useMeasurementMutation } from '@/hooks/useMeasurements';
import { localDateString, parseLocalDate } from '@/lib/dates';
import {
  EMPTY_MEASUREMENT_DRAFT,
  MEASUREMENT_FIELDS,
  parseMeasurementDraft,
  validateMeasurementValue,
  type MeasurementDraft,
  type MeasurementErrors,
  type MeasurementField,
} from '@/lib/measurement-validation';
import { num, type BodyMeasurement } from '@/types/db';
import { spacing } from '@/theme';

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
  const [draft, setDraft] = useState<MeasurementDraft>(EMPTY_MEASUREMENT_DRAFT);
  const [errors, setErrors] = useState<MeasurementErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const refs = useRef<Record<string, TextInput | null>>({});
  const draftRef = useRef(draft);
  const inFlightRef = useRef(false);

  const [date, setDate] = useState(localDateString);
  const [comparison, setComparison] = useState<BodyMeasurement | null>(null);
  const openSession = useRef<{ key: string; revision: number; saving: boolean } | null>(null);

  useEffect(() => () => { openSession.current = null; }, []);

  useEffect(() => {
    if (!visible) {
      openSession.current = null;
      return;
    }
    const key = editing?.id ?? 'new';
    // Background refetches may replace either row object while this form is open.
    // Initialize once per opened entry, including its date and comparison value.
    if (openSession.current?.key === key) return;
    openSession.current = { key, revision: 0, saving: false };
    setDate(editing?.date ?? localDateString());
    setComparison(previous);
    const source = editing ?? previous;
    const initialDraft = source ? {
      chest: source.chest ? String(num(source.chest)) : '',
      waist: source.waist ? String(num(source.waist)) : '',
      hips: source.hips ? String(num(source.hips)) : '',
      thighs: source.thighs ? String(num(source.thighs)) : '',
      arms: source.arms ? String(num(source.arms)) : '',
    } : EMPTY_MEASUREMENT_DRAFT;
    draftRef.current = initialDraft;
    setDraft(initialDraft);
    setErrors({});
    setSaveError(null);
  }, [visible, editing, previous]);

  const save = async () => {
    const savingSession = openSession.current;
    if (!visible || !savingSession || savingSession.saving || inFlightRef.current) return;
    const { values, errors: next } = parseMeasurementDraft(draftRef.current);
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaveError(null);
    savingSession.saving = true;
    inFlightRef.current = true;
    const savedRevision = savingSession.revision;
    try {
      await mutation.mutateAsync({
        date,
        ...values,
      });
      if (openSession.current !== savingSession) return;
      if (savingSession.revision !== savedRevision) {
        setSaveError('Earlier values saved. Your latest changes still need saving.');
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Delta payoff against the previous entry.
      let payoff = 'Measurements saved.';
      if (comparison && num(comparison.waist) > 0 && values.waist !== null) {
        const delta = num(comparison.waist) - values.waist;
        if (Math.abs(delta) >= 0.1) {
          payoff = `Waist ${delta > 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)} cm since last time`;
        }
      }
      AccessibilityInfo.announceForAccessibility(payoff);
      onSaved(payoff);
      onClose();
    } catch {
      if (openSession.current !== savingSession) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError("Couldn't save. Check your connection and try again.");
    } finally {
      savingSession.saving = false;
      inFlightRef.current = false;
    }
  };

  const hintFor = useMemo(
    () => (key: MeasurementField) => {
      if (!comparison || editing) return undefined;
      const v = num(comparison[key]);
      return v > 0 ? `last: ${v} cm` : undefined;
    },
    [comparison, editing],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? `Edit ${format(parseLocalDate(date), 'd MMM yyyy')}` : 'Add measurements'}
    >
      <View style={{ flex: 1 }}>
        <SheetScrollView
          contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="bodySm" tone="muted">
            {editing
              ? 'Editing an existing entry — the date is locked.'
              : `Recording for ${format(parseLocalDate(date), 'EEEE d MMMM')}. Values are prefilled from your last entry, so you only change what moved.`}
          </Text>

          {MEASUREMENT_FIELDS.map((f, i) => (
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
                const session = openSession.current;
                if (!session) return;
                session.revision += 1;
                draftRef.current = { ...draftRef.current, [f.key]: t };
                setDraft(draftRef.current);
                setErrors((p) => ({ ...p, [f.key]: undefined }));
                setSaveError(null);
              }}
              onBlur={() =>
                setErrors((p) => ({
                  ...p,
                  [f.key]: validateMeasurementValue(draft[f.key]),
                }))
              }
              keyboardType="decimal-pad"
              returnKeyType={i === MEASUREMENT_FIELDS.length - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                const nextField = MEASUREMENT_FIELDS[i + 1];
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
        </SheetScrollView>

        <View style={{ padding: spacing.base, gap: spacing.sm }}>
          {mutation.isPending || saveError ? (
            <StatusPill
              status={mutation.isPending ? 'saving' : 'error'}
              label={saveError ? 'Measurement not saved' : 'Saving measurement…'}
            />
          ) : null}
          <Button
            label={saveError ? 'Retry save' : 'Save'}
            onPress={save}
            loading={mutation.isPending}
          />
        </View>
      </View>
    </Sheet>
  );
}
