import { Text } from './Text';
import type { AppTextProps } from './Text';

type Props = Omit<AppTextProps, 'children'> & {
  value: number;
  precision?: number;
  /** Rendered before/after the number, e.g. "kg". */
  suffix?: string;
};

/** Stable tabular metric text. Dashboard values should be immediately readable. */
export function AnimatedNumber({
  value,
  precision = 0,
  suffix = '',
  variant = 'metric',
  tone = 'default',
  style,
  ...rest
}: Props) {
  return (
    <Text variant={variant} tone={tone} numeric style={style} {...rest}>
      {value.toFixed(precision)}
      {suffix}
    </Text>
  );
}
