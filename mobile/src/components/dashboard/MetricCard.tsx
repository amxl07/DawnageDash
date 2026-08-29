import type { LucideIcon } from 'lucide-react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimatedNumber, Card, Text } from '@/components/ui';
import { iconSize, spacing, useTheme } from '@/theme';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  /** Signed delta. Down is good for weight, so callers say what good means. */
  trend?: { value: number; goodDirection: 'down' | 'up'; caption: string };
};

export function MetricCard({ icon: Icon, label, value, unit, trend }: Props) {
  const { colors } = useTheme();

  const trendIsGood =
    trend && (trend.goodDirection === 'down' ? trend.value < 0 : trend.value > 0);
  const TrendIcon = trend && trend.value < 0 ? TrendingDown : TrendingUp;

  // Value + unit are read as one phrase; the trend gets its own sentence.
  const a11y = [
    `${label}: ${value}${unit ? ` ${unit}` : ''}`,
    trend && trend.value !== 0
      ? `${trend.value > 0 ? 'up' : 'down'} ${Math.abs(trend.value).toFixed(1)}, ${trend.caption}`
      : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Card style={{ flex: 1, alignSelf: 'stretch', gap: spacing.sm, minWidth: 0 }} accessible accessibilityLabel={a11y}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Icon size={iconSize.sm} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          {label}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        {Number.isFinite(Number(value)) && value !== '—' ? (
          <AnimatedNumber
            value={Number(value)}
            precision={value.includes('.') ? 1 : 0}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <Text variant="metric" numeric>
            {value}
          </Text>
        )}
        {unit ? (
          <Text variant="bodySm" tone="muted">
            {unit}
          </Text>
        ) : null}
      </View>

      {trend && trend.value !== 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <TrendIcon
            size={iconSize.sm}
            color={trendIsGood ? colors.success : colors.mutedForeground}
            strokeWidth={2}
            accessible={false}
          />
          {/* Number is present as text — the arrow is not the only signal. */}
          <Text variant="bodySm" tone={trendIsGood ? 'success' : 'muted'} numeric>
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}
          </Text>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {trend.caption}
          </Text>
        </View>
      ) : (
        <Text variant="bodySm" tone="muted">
          {trend?.caption ?? ' '}
        </Text>
      )}
    </Card>
  );
}
