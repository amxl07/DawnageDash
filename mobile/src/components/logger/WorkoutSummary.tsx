import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CompletionHeader, CompletionValue } from '@/features/completion/CompletionLayout';
import { spacing } from '@/theme';
import type { WorkoutResult } from '@/features/workout/workout-review';

export type { WorkoutResult } from '@/features/workout/workout-review';

type Props = {
  result: WorkoutResult;
  syncStatus: 'review' | 'sending' | 'synced' | 'queued' | 'blocked';
  onDone: () => void;
  onEdit: () => void;
  onSave: () => void;
  error?: string | null;
  receiptRevision?: number;
};
export function WorkoutSummary({ result, syncStatus, onDone, onEdit, onSave, error, receiptRevision = 0 }: Props) {
  const receipt = syncStatus === 'synced' || syncStatus === 'queued' || syncStatus === 'blocked';
  const title = syncStatus === 'synced'
    ? 'Workout saved and synced'
    : syncStatus === 'queued'
      ? 'Workout saved on this device'
      : syncStatus === 'blocked'
        ? 'Workout needs attention'
        : 'Review your workout';
  return <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
    <CompletionHeader eyebrow={receipt ? 'Workout record' : 'Session review'} title={title} state={syncStatus}
      revision={receipt ? receiptRevision : 0} testID="workout-receipt-reveal"
      detail={syncStatus === 'queued' ? 'Waiting to sync. Keep this device signed in so delivery can retry when a connection is available.'
        : syncStatus === 'synced' ? 'Your session is saved to your account. You can return to it in Training History.'
        : syncStatus === 'blocked' ? 'Your recorded work is kept on this device. Review the issue below, then retry.'
        : syncStatus === 'sending' ? 'Saving workout…' : 'Check the completed and incomplete work before saving.'} />
    <Card testID="workout-summary-metrics" style={{ gap: spacing.md, padding: 24, borderRadius: 24 }}>
      <View accessible accessibilityLabel={`Completed sets: ${result.sets}`} style={{ gap: spacing.xs }}>
        <Text variant="label" tone="muted">Completed sets</Text>
        <Text variant="metric" numeric>{result.sets}</Text>
      </View>
      <CompletionValue label="Incomplete sets" value={String(result.incompleteSets)} />
      {result.volume > 0 ? <CompletionValue label="Volume" value={result.volume.toLocaleString()} detail="kg × reps · completed strength sets" /> : null}
    </Card>
    {result.incompleteSets > 0 ? <Text variant="bodySm" tone="muted">{result.incompleteSets} sets are still incomplete. {receipt ? 'This record includes only the work you entered. You can return to editing to add more.' : 'You can return to enter them or save this session as recorded.'}</Text> : null}
    {result.excludedSets > 0 ? <Text variant="bodySm" tone="destructive">{result.excludedSets} completed sets have values that cannot be included in volume. Review their weight and repetitions.</Text> : null}
    {error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
    <View style={{ gap: spacing.sm }}>
      {receipt && syncStatus !== 'blocked' && !error ? <Button label="Done" onPress={onDone} style={{ minHeight: 48 }} /> : <Button label={syncStatus === 'blocked' ? 'Retry save' : 'Save workout'} loading={syncStatus === 'sending'} onPress={onSave} testID="confirm-save-workout" style={{ minHeight: 48 }} />}
      <Button label="Return to editing" variant="ghost" onPress={onEdit} style={{ minHeight: 48 }} />
    </View>
  </View>;
}
