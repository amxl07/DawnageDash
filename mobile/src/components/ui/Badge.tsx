import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Tone = 'neutral' | 'primary' | 'success' | 'warning';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const palette = {
    neutral: { border: colors.borderStrong, text: colors.mutedForeground },
    primary: { border: colors.primary, text: colors.primary },
    success: { border: colors.success, text: colors.success },
    warning: { border: colors.gold, text: colors.gold },
  }[tone];

  return (
    <View
      accessibilityLabel={label}
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Text variant="label" style={{ color: palette.text }}>
        {label}
      </Text>
    </View>
  );
}
