import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { spacing } from './tokens';

/**
 * Screen inset maths, in one place.
 *
 * Adapted from skulpt's `screenContentPadding`. Previously every screen
 * hand-rolled its own `insets.bottom + spacing.xl` arithmetic, which drifted:
 * some screens cleared the tab bar, some cleared a sticky bar, some cleared
 * neither. An archetype names the intent and the maths follows from it.
 */

export type ScreenArchetype =
  /** A tab root — content sits above the tab bar. */
  | 'root'
  /** A pushed stack screen — no tab bar beneath. */
  | 'child'
  /** A focused task with a sticky action bar pinned at the bottom. */
  | 'editor'
  /** Content inside a bottom sheet. */
  | 'sheet';

export type ResponsiveMode = 'compact' | 'regular' | 'wide';

/** Height of the tab bar body, excluding the bottom safe area. */
export const TAB_BAR_HEIGHT = 56;
/** Height of a sticky action bar body, excluding the bottom safe area. */
export const ACTION_BAR_HEIGHT = 64;

export function getResponsiveMode(width: number, fontScale: number): ResponsiveMode {
  if (width >= 768) return 'wide';
  if (width < 360 || fontScale >= 1.3) return 'compact';
  return 'regular';
}

export function contentMaxWidth(mode: ResponsiveMode): number | undefined {
  return mode === 'wide' ? 720 : undefined;
}

/** The full OS-reported safe area, including Dynamic Island clearance. */
export function statusBarHeight(
  insets: EdgeInsets,
  platform: typeof Platform.OS = Platform.OS,
): number {
  void platform;
  return insets.top;
}

/** Horizontal gutter — wider on tablets so text keeps a readable measure. */
export function horizontalInset(width: number): number {
  return width >= 768 ? spacing.lg : spacing.base;
}

export function screenContentPadding(
  archetype: ScreenArchetype,
  insets: EdgeInsets,
  platform: typeof Platform.OS = Platform.OS,
): { paddingTop: number; paddingBottom: number } {
  switch (archetype) {
    case 'root':
      return {
        paddingTop: statusBarHeight(insets, platform) + spacing.base,
        // Clear the tab bar plus a comfortable scroll tail.
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg,
      };
    case 'editor':
      return {
        paddingTop: statusBarHeight(insets, platform) + spacing.base,
        // Clear the sticky action bar, which sits inside the safe area itself.
        paddingBottom: insets.bottom + ACTION_BAR_HEIGHT + spacing.lg,
      };
    case 'sheet':
      return {
        paddingTop: spacing.base,
        paddingBottom: insets.bottom + spacing.base,
      };
    case 'child':
    default:
      return {
        paddingTop: statusBarHeight(insets, platform) + spacing.base,
        paddingBottom: insets.bottom + spacing.xl,
      };
  }
}
