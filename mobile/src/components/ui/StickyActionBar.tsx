import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
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
  primaryVariant?: ComponentProps<typeof Button>['variant'];
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Feed this value to the owning Screen's footerHeight prop. */
  onHeightChange?: (height: number) => void;
};

/** A consistent, safe-area-aware action area for focused task flows. */
export function StickyActionBar({
  status,
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  primaryTestID,
  primaryVariant = 'primary',
  secondaryLabel,
  onSecondary,
  onHeightChange,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lastHeight = useRef(0);
  const heightChangeRef = useRef(onHeightChange);
  heightChangeRef.current = onHeightChange;

  useEffect(() => () => heightChangeRef.current?.(0), []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height === lastHeight.current) return;
    lastHeight.current = height;
    onHeightChange?.(height);
  };

  return (
    <View
      testID="sticky-action-bar"
      onLayout={handleLayout}
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
          testID={primaryTestID}
          label={primaryLabel}
          variant={primaryVariant}
          onPress={onPrimary}
          loading={primaryLoading}
          disabled={primaryDisabled}
          style={{ flex: secondaryLabel ? 1.5 : 1 }}
        />
      </View>
    </View>
  );
}
