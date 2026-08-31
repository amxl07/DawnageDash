import { CheckCircle2 } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  label: string;
  complete: boolean;
  error?: string;
  children: ReactNode;
  testID?: string;
};

export function CheckInFieldBlock({ label, complete, error, children, testID }: Props) {
  const { colors } = useTheme();
  const { isCompact } = useResponsiveLayout();

  return (
    <View
      testID={testID}
      style={{
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: isCompact ? spacing.xs : spacing.md,
        borderRadius: radius.md,
        borderWidth: error || complete ? 2 : 1,
        borderColor: error ? colors.primary : complete ? colors.borderStrong : colors.border,
        backgroundColor: complete ? colors.elevated : colors.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>{label}</Text>
        {complete && !error ? (
          <View testID={testID ? `${testID}-complete` : undefined} accessible={false}>
            <CheckCircle2 size={iconSize.sm} color={colors.primary} accessible={false} />
          </View>
        ) : null}
      </View>
      {children}
      {error ? <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}
