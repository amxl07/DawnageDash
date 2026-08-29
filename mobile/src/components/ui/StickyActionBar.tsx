import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  status?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/** A consistent, safe-area-aware action area for focused task flows. */
export function StickyActionBar({
  status,
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        gap: spacing.sm,
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
        paddingBottom: insets.bottom + spacing.sm,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      {typeof status === 'string' ? (
        <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
          {status}
        </Text>
      ) : (
        status
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {secondaryLabel && onSecondary ? (
          <Button
            label={secondaryLabel}
            variant="secondary"
            onPress={onSecondary}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          loading={primaryLoading}
          disabled={primaryDisabled}
          style={{ flex: secondaryLabel ? 1.5 : 1 }}
        />
      </View>
    </View>
  );
}
