import { ScrollView, StyleSheet, View, type RefreshControlProps, type ViewStyle } from 'react-native';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { screenContentPadding, spacing, useTheme, type ScreenArchetype } from '@/theme';

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
  /** Whether this screen owns the top safe-area clearance. */
  includeTopSafeArea?: boolean;
  /** Extra bottom padding on top of the archetype's, for unusual cases. */
  bottomInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
};

export const Screen = forwardRef<ScrollView, Props>(function Screen(
  {
    children,
    scroll = true,
    archetype = 'child',
    includeTopSafeArea = true,
    bottomInset = 0,
    refreshControl,
    style,
    contentStyle,
    testID,
  },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { horizontal, maxContentWidth } = useResponsiveLayout();
  const scrollRef = useRef<ScrollView>(null);

  // Register the actual ScrollView so an active-tab reselect uses React
  // Navigation's platform-standard return-to-top behavior.
  useScrollToTop(scrollRef);
  useImperativeHandle(ref, () => scrollRef.current as ScrollView, []);

  const archetypePadding = screenContentPadding(archetype, insets);

  const container: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingLeft: insets.left + horizontal,
    paddingRight: insets.right + horizontal,
  };

  const content = {
    width: '100%' as const,
    maxWidth: maxContentWidth,
    alignSelf: 'center' as const,
    flexGrow: scroll ? undefined : 1,
    paddingTop: includeTopSafeArea ? archetypePadding.paddingTop : spacing.base,
    paddingBottom: archetypePadding.paddingBottom + bottomInset,
  };

  const body = (
    <View testID={testID} style={[content, contentStyle]}>
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={[container, style]}>{body}</View>;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={[container, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {body}
    </ScrollView>
  );
});

export const screenStyles = StyleSheet.create({
  stack: { gap: spacing.lg },
});
