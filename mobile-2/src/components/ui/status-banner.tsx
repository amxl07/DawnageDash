import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme/theme';

export function StatusBanner({ children, tone = 'warning' }: { children: string; tone?: 'warning' | 'danger' }) {
  const { colors, radii } = useTheme();
  const isDanger = tone === 'danger';
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: isDanger ? colors.dangerSurface : colors.warningSurface, borderRadius: radii.control, padding: 12 }}>
      <AppText tone={isDanger ? 'danger' : 'default'}>{children}</AppText>
    </View>
  );
}
