import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { iconSize, spacing, useTheme } from '@/theme';
import { Logo } from '@/components/brand';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  /** Pass `null` to use the brand glyph instead — for first-run empty screens. */
  icon: LucideIcon | null;
  title: string;
  /** One encouraging line. Forward-looking, never guilt. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
      {/* Decorative: the title already carries the meaning. */}
      {Icon ? (
        <Icon size={iconSize.xl} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
      ) : (
        <Logo variant="glyph" size={30} color={colors.borderStrong} label={false} />
      )}
      <Text variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}
