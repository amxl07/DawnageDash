import { CheckCircle2 } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  label: string;
  complete: boolean;
  error?: string;
  children: ReactNode;
  testID?: string;
  focusTarget?: (node: View | null) => void;
  description?: string;
};

export function CheckInFieldBlock({ label, complete, error, children, testID, focusTarget, description }: Props) {
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
        borderWidth: 1,
        borderColor: error ? colors.destructive : 'transparent',
        backgroundColor: colors.card,
      }}
    >
      <View
        ref={focusTarget}
        accessible
        accessibilityLabel={error ? `${label}. ${error}` : label}
        tabIndex={Platform.OS === 'web' ? -1 : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Text variant="h2" style={{ flex: 1 }}>{label}</Text>
        {complete && !error ? (
          <View testID={testID ? `${testID}-complete` : undefined} accessible={false}>
            <CheckCircle2 size={iconSize.sm} color={colors.primary} accessible={false} />
          </View>
        ) : null}
      </View>
      {description ? <Text variant="bodySm" tone="muted">{description}</Text> : null}
      {children}
      {error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}
