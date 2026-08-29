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

/** Height of the tab bar body, excluding the bottom safe area. */
export const TAB_BAR_HEIGHT = 56;
/** Height of a sticky action bar body, excluding the bottom safe area. */
export const ACTION_BAR_HEIGHT = 64;

/**
 * The Dynamic Island reports a taller top inset than the notch, which leaves
 * headers looking bottom-heavy. skulpt corrects by 6pt; same here.
 */
export function statusBarHeight(insets: EdgeInsets): number {
  const hasDynamicIsland = Platform.OS === 'ios' && insets.top > 50;
  return hasDynamicIsland ? insets.top - 6 : insets.top;
}

/** Horizontal gutter — wider on tablets so text keeps a readable measure. */
export function horizontalInset(width: number): number {
  return width >= 768 ? spacing.lg : spacing.base;
}

export function screenContentPadding(
  archetype: ScreenArchetype,
  insets: EdgeInsets,
): { paddingTop: number; paddingBottom: number } {
  switch (archetype) {
    case 'root':
      return {
        paddingTop: spacing.base,
        // Clear the tab bar plus a comfortable scroll tail.
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg,
      };
    case 'editor':
      return {
        paddingTop: spacing.base,
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
        paddingTop: spacing.base,
        paddingBottom: insets.bottom + spacing.xl,
      };
  }
}
