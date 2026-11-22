import { format } from 'date-fns';
import { View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { CompletionHeader, CompletionValue } from '@/features/completion/CompletionLayout';
import { parseLocalDate } from '@/lib/dates';
import { spacing } from '@/theme';
import { CHECK_IN_FIELDS } from '../config/fields';
import type { CheckInReceiptData } from '../useCheckInEditor';
import { checkInAnswer } from './CheckInReviewSheet';

type Props = {
  receipt: CheckInReceiptData;
  onEdit: () => void;
  onHome: () => void;
  firstCheckIn?: boolean;
  nextAction?: { label: string; detail?: string; onPress: () => void };
};

export function CheckInReceipt({ receipt, onEdit, onHome, firstCheckIn = false, nextAction }: Props) {
  const highlights = CHECK_IN_FIELDS.filter(({ id }) =>
    ['energyLevel', 'sleepHours', 'workoutStatus', 'nutritionScore', 'morningWeight', 'dailySteps'].includes(id)
      && receipt.form[id] !== null && receipt.form[id] !== '');
  return <View testID="checkin-receipt" style={{ gap: spacing.lg }}>
    <CompletionHeader eyebrow="Daily check-in" state={receipt.status} revision={receipt.generation}
      title={receipt.status === 'synced' ? 'Saved and synced' : 'Saved on this device'}
      detail={receipt.status === 'synced' ? 'Your check-in is saved to your account.' : 'Waiting to sync. Keep this device signed in so delivery can retry when a connection is available.'} />
    {firstCheckIn ? <Text variant="h2">{receipt.status === 'synced' ? 'Your Day 1 is recorded.' : 'Your first check-in is waiting to sync.'}</Text> : null}
    <Card style={{ gap: spacing.md, padding: 24, borderRadius: 24 }}>
      <Text variant="label" tone="muted">Your record</Text>
      <Text variant="h2">{format(parseLocalDate(receipt.date), 'EEEE, d MMMM yyyy')}</Text>
      {highlights.map((field) => <CompletionValue key={field.id} label={field.label} value={checkInAnswer(field, receipt.form)} />)}
    </Card>
    <View style={{ gap: spacing.sm }}>
      {nextAction?.detail ? <Text variant="bodySm" tone="muted">{nextAction.detail}</Text> : null}
      <Button label={nextAction?.label ?? 'Back to Home'} onPress={nextAction?.onPress ?? onHome} style={{ minHeight: 48 }} />
      <Button label="Edit this record" variant="ghost" onPress={onEdit} style={{ minHeight: 48 }} />
    </View>
  </View>;
}
