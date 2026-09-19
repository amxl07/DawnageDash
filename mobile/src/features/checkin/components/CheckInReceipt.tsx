import { format } from 'date-fns';
import { View } from 'react-native';
import { Button, Card, RecordStatus, Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing } from '@/theme';
import { CHECK_IN_FIELDS } from '../config/fields';
import type { CheckInReceiptData } from '../useCheckInEditor';
import { checkInAnswer } from './CheckInReviewSheet';

export function CheckInReceipt({ receipt, onEdit, onHome }: { receipt: CheckInReceiptData; onEdit: () => void; onHome: () => void }) {
  return <View testID="checkin-receipt" style={{ gap: spacing.lg }}>
    <Text variant="h1" accessibilityLiveRegion="polite">{receipt.status === 'synced' ? 'Saved and synced' : 'Saved on this device'}</Text>
    <Text>{format(parseLocalDate(receipt.date), 'EEEE, d MMMM yyyy')}</Text>
    <RecordStatus value={receipt.status} />
    <Text variant="bodySm" tone="muted">{receipt.status === 'synced' ? 'Your record is available to your coach.' : 'Waiting to sync. Keep this device signed in so delivery can retry when a connection is available.'}</Text>
    <Card style={{ gap: spacing.md }}>
      {CHECK_IN_FIELDS.filter(({ id }) => ['morningWeight', 'sleepHours', 'workoutStatus', 'nutritionScore', 'dailySteps'].includes(id)).map((field) => <View key={field.id} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="bodySm" tone="muted">{field.label}</Text><Text variant="bodySm" numeric>{checkInAnswer(field, receipt.form)}</Text>
      </View>)}
    </Card>
    <Button label="Edit this record" variant="secondary" onPress={onEdit} />
    <Button label="Back to Home" variant="ghost" onPress={onHome} />
  </View>;
}
