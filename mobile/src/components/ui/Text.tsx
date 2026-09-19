import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { tabularNums, type, useTheme } from '@/theme';

type Variant = keyof typeof type;
type Tone = 'default' | 'muted' | 'primary' | 'success' | 'gold' | 'destructive' | 'onPrimary';

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Tabular figures — for anything that animates or aligns in a column. */
  numeric?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'default',
  numeric = false,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    success: colors.success,
    gold: colors.gold,
    destructive: colors.destructive,
    onPrimary: colors.onPrimary,
  };
  const base: TextStyle = { ...type[variant], color: toneColor[tone] };
  return <RNText style={[base, numeric && tabularNums, style]} {...rest} />;
}
