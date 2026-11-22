import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme/theme';
import { View } from 'react-native';

export function ProgressRing({ label, progress, size = 112 }: { label: string; progress: number; size?: number }) {
  const { colors } = useTheme();
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.min(Math.max(progress, 0), 1);
  return (
    <View accessibilityLabel={`${label}: ${Math.round(bounded * 100)} percent`} accessibilityRole="progressbar" style={{ alignItems: 'center', height: size, justifyContent: 'center', width: size }}>
      <Svg height={size} width={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.progressTrack} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.accent} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - bounded)} />
      </Svg>
      <AppText variant="title">{Math.round(bounded * 100)}%</AppText>
    </View>
  );
}
