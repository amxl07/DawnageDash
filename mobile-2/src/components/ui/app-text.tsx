import { Text } from 'react-native';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme/theme';

type AppTextProps = ComponentProps<typeof Text> & {
  tone?: 'default' | 'muted' | 'inverse' | 'danger';
  variant?: 'body' | 'caption' | 'title' | 'display';
};

const variants = {
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700' as const, letterSpacing: -1 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
};

export function AppText({ style, tone = 'default', variant = 'body', ...props }: AppTextProps) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'inverse' ? colors.textInverse : tone === 'muted' ? colors.muted : colors.text;

  return <Text allowFontScaling style={[variants[variant], { color }, style]} {...props} />;
}
