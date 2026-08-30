import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { AdaptiveGrid } from '@/components/ui/AdaptiveGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { iconSize, spacing, useTheme } from '@/theme';

export type WorkoutResult = {
  volume: number;
  sets: number;
  minutes: number;
  prs: string[];
};

type Props = {
  result: WorkoutResult;
  syncStatus: 'saved' | 'offline';
  onDone: () => void;
};

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card
      style={{ flex: 1, alignSelf: 'stretch', gap: spacing.xs }}
      accessible
      accessibilityLabel={`${label}: ${value} ${detail}`}
    >
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text variant="metric" numeric accessibilityElementsHidden>
        {value}
      </Text>
      <Text variant="bodySm" tone="muted" accessibilityElementsHidden>
        {detail}
      </Text>
    </Card>
  );
}

export function WorkoutSummary({ result, syncStatus, onDone }: Props) {
  const { colors } = useTheme();
  const completedSets = `${result.sets} completed set${result.sets === 1 ? '' : 's'}`;
  const prAnnouncement = `${completedSets}. New personal records: ${result.prs.join(', ')}.`;

  return (
    <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="h1">Workout complete</Text>
        <StatusPill
          status={syncStatus}
          label={syncStatus === 'saved' ? 'Saved and synced' : 'Saved here · waiting to sync'}
        />
      </View>

      <AdaptiveGrid testID="workout-summary-metrics">
        <Metric label="Volume" value={result.volume.toLocaleString()} detail="kg total" />
        <Metric label="Completed sets" value={String(result.sets)} detail="sets" />
        <Metric label="Duration" value={String(result.minutes)} detail="minutes" />
      </AdaptiveGrid>

      {result.prs.length ? (
        <Card
          style={{ gap: spacing.sm, borderColor: colors.gold, borderWidth: 2 }}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={prAnnouncement}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Trophy size={iconSize.lg} color={colors.gold} strokeWidth={2} accessible={false} />
            <Text variant="h2" accessibilityElementsHidden>
              Personal records
            </Text>
          </View>
          {result.prs.map((pr) => (
            <Text key={pr} variant="bodySm" accessibilityElementsHidden>
              {pr} — heaviest set yet
            </Text>
          ))}
        </Card>
      ) : null}

      <Button label="Done" onPress={onDone} />
    </View>
  );
}
