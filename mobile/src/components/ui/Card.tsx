import { View, type ViewProps, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme';

type Props = ViewProps & { padded?: boolean; elevated?: boolean };

export function Card({ style, padded = true, elevated = false, ...rest }: Props) {
  const { colors, shadow } = useTheme();
  const base: ViewStyle = {
    backgroundColor: elevated ? colors.elevated : colors.card,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? spacing.base : 0,
  };
  return <View style={[base, elevated ? shadow.sheet : shadow.card, style]} {...rest} />;
}
