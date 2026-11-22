import { format } from 'date-fns';
import { View } from 'react-native';
import { Button, RecordStatus, Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing } from '@/theme';
import type { CheckInEditor } from '../useCheckInEditor';

export function DailyRecordHeader({ editor, onHistory }: { editor: CheckInEditor; onHistory: () => void }) {
  return <View style={{ gap: spacing.sm }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="bodySm" tone="muted">{format(parseLocalDate(editor.date), 'EEEE, d MMMM yyyy')}</Text>
      <Button label="History" variant="ghost" onPress={onHistory} />
    </View>
    {editor.hasPendingNumericEdits ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">Number in progress · not saved yet</Text> : editor.draftState === 'writing' ? <RecordStatus value="saving-local" /> : editor.draftState === 'error' ?
      <Text variant="bodySm" tone="destructive" accessibilityRole="alert">Changes have not been saved on this device.</Text> : editor.hasEdits ?
        <RecordStatus value="draft" /> : editor.deliveryState === 'queued' || editor.deliveryState === 'synced' || editor.deliveryState === 'blocked' ?
          <RecordStatus value={editor.deliveryState} /> : null}
    {editor.hasEdits && editor.receipt ? <Text variant="bodySm" tone="muted">The previously submitted version is {editor.receipt.status === 'synced' ? 'synced' : 'waiting to sync'}. You are editing a newer draft.</Text> : null}
  </View>;
}
