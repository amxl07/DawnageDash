import {
  useWindowDimensions,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from 'react-native';
import { forwardRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { horizontalInset, screenContentPadding, spacing, useTheme, type ScreenArchetype } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Wrap in a ScrollView. Set false for screens owning their own FlatList. */
  scroll?: boolean;
  /**
   * What kind of screen this is. Drives top/bottom insets so no screen has to
   * do the arithmetic itself: 'root' clears the tab bar, 'editor' clears a
   * sticky action bar, 'child' is a pushed screen, 'sheet' sits in a sheet.
   */
  archetype?: ScreenArchetype;
  /** Extra bottom padding on top of the archetype's, for unusual cases. */
  bottomInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
};

export const Screen = forwardRef<ScrollView, Props>(function Screen(
  { children, scroll = true, archetype = 'child', bottomInset = 0, refreshControl, style },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const horizontal = horizontalInset(width);
  const archetypePadding = screenContentPadding(archetype, insets);

  const container: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingLeft: insets.left + horizontal,
    paddingRight: insets.right + horizontal,
  };

  const contentPadding = {
    paddingTop: archetypePadding.paddingTop,
    paddingBottom: archetypePadding.paddingBottom + bottomInset,
  };

  if (!scroll) {
    return <View style={[container, contentPadding, style]}>{children}</View>;
  }

  return (
    <ScrollView
      ref={ref}
      style={container}
      contentContainerStyle={[contentPadding, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
});

export const screenStyles = StyleSheet.create({
  stack: { gap: spacing.lg },
});
