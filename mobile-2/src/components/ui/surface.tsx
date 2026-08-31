import { View } from 'react-native';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme/theme';

type SurfaceProps = ComponentProps<typeof View> & { elevated?: boolean };

export function Surface({ elevated = false, style, ...props }: SurfaceProps) {
  const { colors, radii } = useTheme();
  return <View style={[{
    backgroundColor: elevated ? colors.surface : colors.surfaceRaised,
    borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, padding: 20,
    ...(elevated ? { boxShadow: `0 8px 24px ${colors.border}` } : {}),
  }, style]} {...props} />;
}
