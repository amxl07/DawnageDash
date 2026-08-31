import { ClipboardCheck, Gauge, Moon, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import { iconSize, radius, spacing, useTheme } from '@/theme';

import type { CheckInStep } from './CheckInForm';
import { CHECK_IN_STAGE_META, getCheckInDailyPrompt } from './checkin-presentation';

type Props = {
  step: CheckInStep;
  stepIndex: number;
  totalSteps: number;
  date: string;
};

const STAGE_ICONS = {
  readiness: Gauge,
  recovery: Moon,
  adherence: Target,
  finish: ClipboardCheck,
};

export function CheckInStageHeader({ step, stepIndex, totalSteps, date }: Props) {
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
            backgroundColor: colors.primaryFill,
          }}
        >
          <Icon size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="label" tone="primary">{`Step ${stepIndex + 1} of ${totalSteps}`}</Text>
          <Text variant="h2">{meta.title}</Text>
        </View>
      </View>
      <ProgressBar
        value={(stepIndex + 1) / totalSteps}
        glow={false}
        accessibilityLabel={`Check-in step ${stepIndex + 1} of ${totalSteps}`}
      />
      <Text variant="bodySm" tone="muted">{meta.description}</Text>
      <Text variant="bodySm" tone="muted">{getCheckInDailyPrompt(date)}</Text>
    </View>
  );
}
