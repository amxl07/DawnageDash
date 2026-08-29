import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  action?: React.ReactNode;
};

/** Shared screen title treatment for stack destinations. */
export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
  action,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={{
            minWidth: HIT_SLOP_MIN,
            minHeight: HIT_SLOP_MIN,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="h1">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
