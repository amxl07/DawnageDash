import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { spacing, useMotion } from '@/theme';

import { historyCaption, type HistoryStat } from '../history';

type Props = {
  value: number | null;
  history: HistoryStat | undefined;
  unit?: string;
  precision?: number;
};

export function HistoryCaption({ value, history, unit, precision }: Props) {
  const motion = useMotion();
  if (value === null) return null;

  const caption = historyCaption(history, { unit, precision });
  return (
    <Animated.View
      entering={motion.enabled ? FadeIn.duration(motion.duration.feedback) : undefined}
      style={{ marginTop: spacing.xs }}
    >
      <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
        {caption}
      </Text>
    </Animated.View>
  );
}

