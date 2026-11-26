import { format } from 'date-fns';
import type { ReactNode } from 'react';
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
  nextAction?: ReactNode;
};

export function CheckInReceipt({ receipt, onEdit, onHome, firstCheckIn = false, nextAction }: Props) {
  const highlights = CHECK_IN_FIELDS.filter(({ id }) =>
    ['energyLevel', 'sleepHours', 'workoutStatus', 'nutritionScore', 'morningWeight', 'dailySteps'].includes(id)
      && receipt.form[id] !== null && receipt.form[id] !== '');
  return <View testID="checkin-receipt" style={{ gap: spacing.lg }}>
    <CompletionHeader eyebrow="Daily check-in" state={receipt.status} revision={receipt.generation} showStatus={false}
      title={receipt.status === 'synced' ? firstCheckIn ? 'Day 1 · Check-in saved' : 'Check-in saved' : 'Saved on this device'}
      detail={receipt.status === 'synced' ? undefined : `${firstCheckIn ? 'Your first check-in is waiting to sync. ' : ''}Will sync when you are online. Keep this device signed in.`} />
    <Card style={{ gap: spacing.md, padding: 24, borderRadius: 24 }}>
      <Text variant="h2">{format(parseLocalDate(receipt.date), 'EEEE, d MMMM yyyy')}</Text>
      {highlights.map((field) => <CompletionValue key={field.id} label={field.label} value={checkInAnswer(field, receipt.form)} />)}
    </Card>
    <View style={{ gap: spacing.sm }}>
      {nextAction ?? <Button label="Back to Home" onPress={onHome} style={{ minHeight: 48 }} />}
      <Button label="Edit this record" variant="ghost" onPress={onEdit} style={{ minHeight: 48 }} />
    </View>
  </View>;
}
