import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
  divider?: boolean;
};

export function ListRow({ icon: Icon, title, subtitle, onPress, divider = false }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: HIT_SLOP_MIN + 12,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.border,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Icon size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
      <View style={{ flex: 1 }}>
        <Text>{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" tone="muted">{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
    </Pressable>
  );
}
