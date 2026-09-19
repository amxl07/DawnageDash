import { View } from 'react-native';
import { AdaptiveGrid } from '@/components/ui/AdaptiveGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RecordStatus } from '@/components/ui/RecordStatus';
import { Text } from '@/components/ui/Text';
import { MotionReveal } from '@/components/ui/MotionReveal';
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
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card style={{ flex: 1, alignSelf: 'stretch', gap: spacing.xs }} accessible accessibilityLabel={`${label}: ${value} ${detail}`}>
    <Text variant="label" tone="muted">{label}</Text><Text variant="metric" numeric accessibilityElementsHidden>{value}</Text><Text variant="bodySm" tone="muted" accessibilityElementsHidden>{detail}</Text>
  </Card>;
}
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
    <MotionReveal revision={receipt ? receiptRevision : 0} testID="workout-receipt-reveal">
      <View style={{ gap: spacing.sm }}>
        <Text variant="h1">{title}</Text>
        {receipt ? <RecordStatus value={syncStatus as 'synced' | 'queued' | 'blocked'} /> : syncStatus === 'sending' ? <Text variant="bodySm" tone="muted">Saving workout…</Text> : <Text variant="bodySm" tone="muted">Check the completed and incomplete work before saving.</Text>}
        {syncStatus === 'queued' ? <Text variant="bodySm" tone="muted">Waiting to sync. Keep this device signed in so delivery can retry when a connection is available.</Text> : null}
      </View>
    </MotionReveal>
    <AdaptiveGrid testID="workout-summary-metrics">
      <Metric label="Volume" value={result.volume.toLocaleString()} detail="kg × reps · completed strength sets" />
      <Metric label="Completed sets" value={String(result.sets)} detail="sets" />
      <Metric label="Incomplete sets" value={String(result.incompleteSets)} detail="sets" />
    </AdaptiveGrid>
    {result.incompleteSets > 0 ? <Text variant="bodySm" tone="muted">{result.incompleteSets} sets are still incomplete. You can return to enter them or save this session as recorded.</Text> : null}
    {result.excludedSets > 0 ? <Text variant="bodySm" tone="destructive">{result.excludedSets} completed sets have values that cannot be included in volume. Review their weight and repetitions.</Text> : null}
    {error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
    <Button label="Return to editing" variant="secondary" onPress={onEdit} />
    {receipt && syncStatus !== 'blocked' && !error ? <Button label="Done" onPress={onDone} /> : <Button label={syncStatus === 'blocked' ? 'Retry save' : 'Save workout'} loading={syncStatus === 'sending'} onPress={onSave} testID="confirm-save-workout" />}
  </View>;
}
