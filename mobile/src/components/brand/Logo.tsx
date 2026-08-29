import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/theme';

// Intrinsic aspect ratios of the trimmed artwork.
const WORDMARK_AR = 1643 / 226; // 7.27
const GLYPH_AR = 329 / 224; //    1.47

type Variant = 'wordmark' | 'glyph' | 'lockup';

type Props = {
  variant?: Variant;
  /** Width in dp for wordmark/lockup; height in dp for a bare glyph. */
  size?: number;
  /** Defaults to the theme foreground. Pass a token for accent treatments. */
  color?: string;
  style?: StyleProp<ImageStyle & ViewStyle>;
  /** Screen readers announce the brand once; decorative uses pass false. */
  label?: string | false;
};

/**
 * Brand mark.
 *
 * The source artwork is pure white with an alpha channel, so it would vanish
 * on the light theme. Rather than ship a second inverted asset that can drift,
 * both marks are tinted at render time from the theme — one file, always the
 * right colour, and it follows a live theme switch with no reload.
 */
export function Logo({
  variant = 'wordmark',
  size = 180,
  color,
  style,
  label = 'Dawnage',
}: Props) {
  const { colors } = useTheme();
  const tint = color ?? colors.foreground;

  const a11y =
    label === false
      ? { accessible: false as const, importantForAccessibility: 'no' as const }
      : { accessible: true as const, accessibilityRole: 'image' as const, accessibilityLabel: label };

  if (variant === 'glyph') {
    return (
      <Image
        source={require('@/assets/glyph.png')}
        style={[{ height: size, width: size * GLYPH_AR }, style as StyleProp<ImageStyle>]}
        resizeMode="contain"
        tintColor={tint}
        {...a11y}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <Image
        source={require('@/assets/wordmark.png')}
        style={[{ width: size, height: size / WORDMARK_AR }, style as StyleProp<ImageStyle>]}
        resizeMode="contain"
        tintColor={tint}
        {...a11y}
      />
    );
  }

  // Lockup: the bird ascending above the wordmark.
  return (
    <View style={[{ alignItems: 'center', gap: spacing.base }, style as StyleProp<ViewStyle>]} {...a11y}>
      <Image
        source={require('@/assets/glyph.png')}
        style={{ height: size * 0.28, width: size * 0.28 * GLYPH_AR }}
        resizeMode="contain"
        tintColor={tint}
        accessible={false}
      />
      <Image
        source={require('@/assets/wordmark.png')}
        style={{ width: size, height: size / WORDMARK_AR }}
        resizeMode="contain"
        tintColor={tint}
        accessible={false}
      />
    </View>
  );
}
