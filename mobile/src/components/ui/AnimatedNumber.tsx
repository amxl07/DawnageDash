import { useMemo } from 'react';
import { View, type TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { tabularNums, type as typeScale, useMotion, useTheme } from '@/theme';
import { Text, type AppTextProps } from './Text';

type Variant = keyof typeof typeScale;
type Tone = NonNullable<AppTextProps['tone']>;

type Props = {
  value: number;
  precision?: number;
  /** Rendered after the number, e.g. "kg". Not animated. */
  suffix?: string;
  variant?: Variant;
  tone?: Tone;
  /** Screen readers read the parent's label instead — see note below. */
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
};

/**
 * Odometer digits: each position is a column of 0–9 that slides to the right
 * number, rather than one Text whose characters are rewritten every frame.
 *
 * The previous implementation interpolated a float and called runOnJS to
 * setState on every frame — that re-rendered text ~60×/sec, hopped the bridge
 * continuously, and made width jitter as glyphs changed. This runs entirely on
 * the UI thread and each column keeps a fixed width, so nothing reflows.
 *
 * `LinearTransition` handles the digit count changing (9 → 10 grows a column).
 */

/**
 * Tabular figures are monospaced, so one ratio per family holds for every size.
 * These are close for Poppins/Inter but are the one value worth eyeballing on
 * device — if columns look loose or cramped, tune here, not per call site.
 */
const DIGIT_WIDTH_RATIO = 0.62;

function AnimatedDigit({
  digit,
  width,
  height,
  textStyle,
}: {
  digit: number;
  width: number;
  height: number;
  textStyle: TextStyle;
}) {
  const motion = useMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: motion.enabled
          ? withSpring(-height * digit, { duration: 1000, dampingRatio: 0.9 })
          : -height * digit,
      },
    ],
  }));

  return (
    <Animated.View
      layout={motion.enabled ? LinearTransition.duration(400) : undefined}
      entering={motion.enabled ? FadeIn.duration(200) : undefined}
      exiting={motion.enabled ? FadeOut.duration(150) : undefined}
      style={{ width, height, overflow: 'hidden' }}
    >
      <Animated.View style={[{ flexDirection: 'column' }, animated]}>
        {/* One Text per possible digit; the column slides to reveal the right one. */}
        {Array.from({ length: 10 }, (_, n) => (
          <Animated.Text
            key={n}
            style={[textStyle, { width, height, textAlign: 'center' }]}
          >
            {n}
          </Animated.Text>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

export function AnimatedNumber({
  value,
  precision = 0,
  suffix,
  variant = 'metric',
  tone = 'default',
  accessibilityElementsHidden,
  importantForAccessibility,
}: Props) {
  const { colors } = useTheme();
  const motion = useMotion();

  const toneColor: Record<Tone, string> = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    success: colors.success,
    gold: colors.gold,
    onPrimary: colors.onPrimary,
  };

  const style = typeScale[variant];
  const color = toneColor[tone];
  const height = style.lineHeight ?? style.fontSize * 1.2;
  const width = style.fontSize * DIGIT_WIDTH_RATIO;

  const textStyle: TextStyle = {
    ...style,
    ...tabularNums,
    color,
    lineHeight: height,
  };

  const chars = useMemo(
    () => (Number.isFinite(value) ? value.toFixed(precision) : '—').split(''),
    [value, precision],
  );

  const a11y = {
    accessibilityElementsHidden,
    importantForAccessibility,
  };

  // Under reduced motion there is nothing to reveal — render it plainly.
  if (!motion.enabled) {
    return (
      <Text variant={variant} tone={tone} numeric {...a11y}>
        {chars.join('')}
        {suffix ?? ''}
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} {...a11y}>
      <Animated.View
        layout={LinearTransition.duration(400)}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {chars.map((char, i) => {
          const digit = Number(char);
          if (Number.isNaN(digit)) {
            // Separators ("." , "-") are static — only digits roll.
            return (
              <Animated.Text
                // Index is stable here: the separator's position within a fixed
                // format never changes for a given precision.
                key={`sep-${i}`}
                style={[textStyle, { textAlign: 'center' }]}
              >
                {char}
              </Animated.Text>
            );
          }
          return (
            <AnimatedDigit
              key={`pos-${i}`}
              digit={digit}
              width={width}
              height={height}
              textStyle={textStyle}
            />
          );
        })}
      </Animated.View>
      {suffix ? (
        <Text variant="bodySm" tone="muted">
          {` ${suffix}`}
        </Text>
      ) : null}
    </View>
  );
}
