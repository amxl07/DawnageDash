import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext, type ReactNode } from 'react';
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
  primaryTestID?: string;
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
  primaryTestID,
  secondaryLabel,
  onSecondary,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const clearsOverlayTabBar = process.env.EXPO_OS === 'ios' && tabBarHeight > 0;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: clearsOverlayTabBar ? tabBarHeight : 0,
        gap: spacing.sm,
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
        paddingBottom: (clearsOverlayTabBar ? 0 : insets.bottom) + spacing.sm,
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
          testID={primaryTestID}
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
