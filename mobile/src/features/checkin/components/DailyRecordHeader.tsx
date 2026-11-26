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
    {editor.hasPendingNumericEdits ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">Unsaved entry</Text> : editor.draftState === 'writing' ? <RecordStatus value="saving-local" /> : editor.draftState === 'error' ?
      <Text variant="bodySm" tone="destructive" accessibilityRole="alert">Couldn’t save. Keep this screen open and retry.</Text> : editor.hasEdits ?
        editor.receipt ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">Editing a new draft · previous version {editor.receipt.status === 'synced' ? 'saved' : editor.deliveryState === 'blocked' ? 'couldn’t sync' : 'waiting to sync'}</Text> : <RecordStatus value="draft" /> : editor.deliveryState === 'queued' || editor.deliveryState === 'synced' || editor.deliveryState === 'blocked' ?
          <RecordStatus value={editor.deliveryState} /> : null}
  </View>;
}
