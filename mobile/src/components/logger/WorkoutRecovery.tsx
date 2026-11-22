import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import type { OutboxItem } from '@/lib/outbox';
import { parseWorkoutContent } from '@/lib/workout-content';
import { spacing } from '@/theme';

type Props = {
  versions: OutboxItem[];
  targets: { id: string; title: string | null }[];
  canRetry: boolean;
  sending: boolean;
  error: string | null;
  onRetry: (logId: string) => void;
  onReload: () => void;
  onClose: () => void;
};

/** Deliberate recovery of retained versions, separate from editing a new intent. */
export function WorkoutRecovery({ versions, targets, canRetry, sending, error, onRetry, onReload, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const target = targets.some((row) => row.id === selected) ? selected : targets.length === 1 ? targets[0].id : null;
  return <Screen>
    <Button label="Close workout" variant="ghost" onPress={onClose} />
    <View style={{ gap: spacing.base }}>
      <Text variant="h1">Recover saved versions</Text>
      <Text variant="bodySm" tone="muted">These versions are saved on this device. Retry the earlier version first, then the later version for the selected workout. Your newer edits stay open separately.</Text>
      {versions.map((version, index) => {
        const content = parseWorkoutContent(version.content);
        return <Card key={version.id}>
          <Text variant="caption" tone="muted">{index === 0 ? 'Earlier saved version' : 'Later saved version'}</Text>
          <Text variant="h2">{version.title || 'Untitled workout'}</Text>
          <Text variant="bodySm" tone="muted">{content.kind === 'text' ? content.text : content.exercises.map((exercise) => exercise.name).join(', ') || 'No exercises recorded'}</Text>
        </Card>;
      })}
      {targets.length === 1 ? <Text variant="bodySm">Workout: {targets[0].title || 'Saved workout'}</Text> : targets.map((row) => <Button key={row.id} label={`${target === row.id ? 'Selected: ' : ''}${row.title || 'Saved workout'}`} variant="secondary" disabled={sending} onPress={() => setSelected(row.id)} />)}
      {!canRetry ? <Text variant="bodySm" tone="muted">Reconnect and reload to verify the saved workout before retrying.</Text> : null}
      {error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button label="Retry saved versions" disabled={!canRetry || !target} loading={sending} onPress={() => { if (target) onRetry(target); }} />
      <Button label="Reload saved versions" variant="secondary" disabled={sending} onPress={onReload} />
    </View>
  </Screen>;
}
