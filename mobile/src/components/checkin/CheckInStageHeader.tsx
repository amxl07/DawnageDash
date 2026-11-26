import { ClipboardCheck, Gauge, Sunrise, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import { iconSize, radius, spacing, useTheme } from '@/theme';
import type { AnswerProgress } from '@/features/checkin/answer-progress';

import type { CheckInStep } from './CheckInForm';
import { CHECK_IN_STAGE_META } from './checkin-presentation';

type Props = {
  step: CheckInStep;
  stepIndex: number;
  totalSteps: number;
  date: string;
  progress?: AnswerProgress;
};

const STAGE_ICONS = {
  readiness: Sunrise,
  recovery: Gauge,
  adherence: Target,
  finish: ClipboardCheck,
};

export function CheckInStageHeader({ step, stepIndex, totalSteps, progress }: Props) {
  const { colors } = useTheme();
  const Icon = STAGE_ICONS[step];
  const meta = CHECK_IN_STAGE_META[step];

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          accessible={false}
          style={{
            padding: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Icon size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
            {progress ? <Text testID="checkin-answer-progress" variant="caption" tone="muted" numeric accessibilityLiveRegion="polite">
              {`${progress.answered} of ${progress.total} answered`}
            </Text> : null}
          </View>
          <Text variant="h1">{meta.title}</Text>
        </View>
      </View>
      <ProgressBar
        value={(stepIndex + 1) / totalSteps}
        glow={false}
        accessibilityLabel={`Check-in step ${stepIndex + 1} of ${totalSteps}`}
      />
    </View>
  );
}
