/** Spacing, radius, sizing, type and motion tokens. See plans/02-design-system.md. */
import { Platform, type TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radius = { sm: 8, md: 12, card: 20, pill: 999 } as const;

export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

/** Minimum interactive target. Reach it with padding first, hitSlop second. */
export const HIT_SLOP_MIN = 44;

/** Tabular figures: any number that animates, aligns in a column, or sits in a
 *  table. Android support is inconsistent — always pair with a fixed minWidth. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const fonts = {
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  poppinsRegular: 'Poppins_400Regular',
  poppinsSemiBold: 'Poppins_600SemiBold',
  poppinsBold: 'Poppins_700Bold',
} as const;

/** Type scale. Nothing a user must read drops below 14. */
export const type = {
  display: { fontFamily: fonts.poppinsBold, fontSize: 32, lineHeight: 38 },
  metric: { fontFamily: fonts.poppinsBold, fontSize: 28, lineHeight: 34 },
  h1: { fontFamily: fonts.interBold, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: fonts.interSemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.interRegular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.interRegular, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} satisfies Record<string, TextStyle>;

/**
 * Motion. Consume via useMotion() — it collapses these when the OS
 * "Reduce Motion" setting is on, so screens never repeat the check.
 */
export const motion = {
  duration: { micro: 120, feedback: 160, enter: 200, exit: 160, value: 260, celebration: 500 },
  /** Cubic-bezier control points; feed to Easing.bezier(...). */
  easing: {
    standard: [0.16, 1, 0.3, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  spring: {
    sheet: { damping: 20, stiffness: 90 },
    press: { damping: 15, stiffness: 250 },
  },
  pressScale: 0.97,
} as const;

/**
 * Elevation. Dark separates surfaces by lifting their colour (shadows are
 * invisible on near-black); light separates them with a real shadow.
 */
export const shadow = {
  card: (isDark: boolean) =>
    isDark
      ? {}
      : Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 2 },
          },
          android: { elevation: 2 },
          default: {},
        }),
  sheet: (isDark: boolean) =>
    isDark
      ? {}
      : Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
          },
          android: { elevation: 8 },
          default: {},
        }),
} as const;
