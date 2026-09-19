import type { RefObject } from 'react';
import { View, type TextInput } from 'react-native';
import { Button, Sheet, SheetScrollView, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { CHECK_IN_FIELDS, type CheckInFieldDef } from '../config/fields';
import type { FormState } from '../model';

export function checkInAnswer(field: CheckInFieldDef, form: FormState): string {
  const value = form[field.id];
  if (value === null || value === '') return 'Not recorded';
  const option = field.options?.find((item) => item.value === value);
  return option?.label ?? (typeof value === 'number' ? `${value}${field.unit ? ` ${field.unit}` : field.control === 'rating' ? '/10' : ''}` : String(value));
}
export function CheckInReviewSheet({ visible, date, form, onClose, onEdit, returnFocusRef }: {
  visible: boolean; date: string; form: FormState; onClose: () => void; onEdit: (field: keyof FormState) => void; returnFocusRef: RefObject<View | TextInput | null>;
}) {
  return <Sheet visible={visible} onClose={onClose} title="Review your record" returnFocusRef={returnFocusRef}>
    <SheetScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
      <Text variant="bodySm" tone="muted">Reporting date · {date}</Text>
      {CHECK_IN_FIELDS.filter((field) => !('showsWhen' in field) || field.showsWhen.in.some((value) => value === form.workoutStatus)).map((field) => <View key={field.id} style={{ gap: spacing.xs }}>
        <Text variant="label">{field.label}</Text>
        <Text variant="bodySm">{checkInAnswer(field, form)}</Text>
        <Button label={`Edit ${field.label}`} variant="ghost" onPress={() => onEdit(field.id)} />
      </View>)}
      <Button label="Back to record" variant="secondary" onPress={onClose} />
    </SheetScrollView>
  </Sheet>;
}
