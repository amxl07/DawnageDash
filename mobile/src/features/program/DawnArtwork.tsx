import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

/** A decorative sunrise, never a progress chart or a measured health signal. */
export function DawnArtwork({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const gradient = 'dawn' + useId().replace(/:/g, '');
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ height: compact ? 84 : 132, overflow: 'hidden' }}>
    <Svg width="100%" height="100%" viewBox="0 0 320 140">
      <Defs><LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.primary} stopOpacity={0.26} /><Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} /></LinearGradient></Defs>
      <Path d="M32 126 A128 128 0 0 1 288 126" fill="none" stroke={colors.primary} strokeOpacity={0.14} strokeWidth={1} />
      <Path d="M60 126 A100 100 0 0 1 260 126" fill="none" stroke={colors.primary} strokeOpacity={0.25} strokeWidth={1} />
      <Path d="M88 126 A72 72 0 0 1 232 126 Z" fill={`url(#${gradient})`} />
      <Path d="M88 126 A72 72 0 0 1 232 126" fill="none" stroke={colors.primary} strokeWidth={2} />
      <Path d="M12 126 H308" stroke={colors.primary} strokeOpacity={0.25} strokeWidth={1} />
      <Circle cx={160} cy={54} r={4} fill={colors.primary} />
    </Svg>
  </View>;
}
