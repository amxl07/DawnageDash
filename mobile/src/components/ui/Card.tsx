import { View, type ViewProps, type ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from '@/theme';

export type CardSurface = 'grouped' | 'metric' | 'hero';
export type CardElevation = 'flat' | 'raised' | 'overlay';
export type CardProps = ViewProps & {
  padded?: boolean;
  elevated?: boolean;
  surface?: CardSurface;
  elevation?: CardElevation;
};

export function Card({ style, padded = true, elevated = false, surface = 'grouped', elevation, ...rest }: CardProps) {
  const { colors, shadow } = useTheme();
  const resolvedElevation = elevated ? 'overlay' : elevation ?? (surface === 'hero' ? 'raised' : 'flat');
  const base: ViewStyle = {
    backgroundColor: elevated || surface === 'metric' ? colors.elevated : colors.card,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 0,
    padding: padded ? spacing.base : 0,
  };
  const elevationStyle = resolvedElevation === 'overlay'
    ? shadow.sheet
    : resolvedElevation === 'raised'
      ? shadow.card
      : undefined;
  return <View style={[base, elevationStyle, style]} {...rest} />;
}
