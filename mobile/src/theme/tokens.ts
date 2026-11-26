/** Spacing, radius, sizing, type and motion tokens. Documented in DESIGN.md (keep in sync). */
import { Platform, type TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  content: 20,
  lg: 24,
  section: 28,
  xl: 32,
  spacious: 40,
  '2xl': 48,
} as const;

export const radius = {
  sm: 8,
  input: 12,
  md: 12,
  button: 14,
  card: 24,
  sheet: 28,
  pill: 999,
} as const;

export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

/** Minimum interactive target. Reach it with padding first, hitSlop second. */
export const HIT_SLOP_MIN = Platform.select({ android: 48, default: 44 }) ?? 44;

/** Tabular figures: any number that animates, aligns in a column, or sits in a
 *  table. Android support is inconsistent — always pair with a fixed minWidth. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const fonts = {
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
} as const;

const uiFont = {
  regular: Platform.select({ ios: undefined, default: fonts.interRegular }),
  medium: Platform.select({ ios: undefined, default: fonts.interMedium }),
  semiBold: Platform.select({ ios: undefined, default: fonts.interSemiBold }),
} as const;

/** Type scale. Nothing a user must read drops below 14. */
export const type = {
  display: { fontFamily: uiFont.semiBold, fontWeight: '600', fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  metric: { fontFamily: uiFont.semiBold, fontWeight: '600', fontSize: 44, lineHeight: 50, letterSpacing: -0.6 },
  h1: { fontFamily: uiFont.semiBold, fontWeight: '600', fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: uiFont.semiBold, fontWeight: '600', fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  body: { fontFamily: uiFont.regular, fontWeight: '400', fontSize: 17, lineHeight: 24 },
  bodySm: { fontFamily: uiFont.regular, fontWeight: '400', fontSize: 15, lineHeight: 21 },
  label: {
    fontFamily: uiFont.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontFamily: uiFont.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
  },
  overline: {
    fontFamily: uiFont.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
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
    standard: [0.23, 1, 0.32, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  spring: {
    sheet: { damping: 20, stiffness: 90 },
    press: { duration: 120, dampingRatio: 1 },
  },
  pressScale: 0.97,
} as const;

/**
 * Elevation. Dark separates surfaces by lifting their colour (shadows are
 * invisible on near-black). Light works like iOS grouped lists: white on
 * #F2F2F7 does the separating, so the card shadow is a faint neutral lift.
 */
export const shadow = {
  card: (isDark: boolean) =>
    isDark
      ? {}
      : Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOpacity: 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
          },
          android: { elevation: 1 },
          web: { boxShadow: '0px 2px 10px rgba(0,0,0,0.04)' },
          default: {},
        }),
  sheet: (isDark: boolean) =>
    isDark
      ? {}
      : Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOpacity: 0.1,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
          },
          android: { elevation: 8 },
          web: { boxShadow: '0px 8px 32px rgba(0,0,0,0.1)' },
          default: {},
        }),
} as const;
