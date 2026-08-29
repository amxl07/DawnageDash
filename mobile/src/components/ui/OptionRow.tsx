import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 'radio' for one-of-many, 'checkbox' for independent toggles. */
  role?: 'radio' | 'checkbox';
};

/** A selectable row. Selection is carried by a check glyph, not colour alone. */
export function OptionRow({ label, selected, onPress, role = 'radio' }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: HIT_SLOP_MIN,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.borderStrong,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Text style={{ flex: 1 }} tone={selected ? 'primary' : 'default'}>
        {label}
      </Text>
      {selected ? (
        <Check size={iconSize.md} color={colors.primary} strokeWidth={2.5} accessible={false} />
      ) : (
        <View style={{ width: iconSize.md }} />
      )}
    </Pressable>
  );
}
