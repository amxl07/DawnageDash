import { Platform, ScrollView, StyleSheet, View, type RefreshControlProps, type ViewStyle } from 'react-native';
import { forwardRef, useImperativeHandle, useRef, type Ref } from 'react';
import { useScrollToTop } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNativeHeader, useNativeTabs } from '@/components/navigation/NavigationChrome';
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
  /** Measured height of an overlay footer/action bar owned by this screen. */
  footerHeight?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Native content view at the scroll origin, for measuring descendant fields. */
  contentRef?: Ref<View>;
  testID?: string;
};

export const Screen = forwardRef<ScrollView, Props>(function Screen(
  {
    children,
    scroll = true,
    archetype = 'child',
    includeTopSafeArea = true,
    bottomInset = 0,
    footerHeight = 0,
    refreshControl,
    style,
    contentStyle,
    contentRef,
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

  const nativeTabs = useNativeTabs();
  const nativeHeader = useNativeHeader();
  const nativeRoot = nativeTabs && archetype === 'root';
  const automatic = Platform.OS === 'ios' && scroll && nativeRoot;
  const archetypePadding = screenContentPadding(archetype, insets);
  const footerPadding = archetype === 'editor' && footerHeight > 0
    ? spacing.lg + footerHeight
    : automatic ? spacing.lg : nativeRoot ? (Platform.OS === 'android' ? 0 : insets.bottom) + spacing.lg : Platform.OS === 'web' && archetype === 'root' ? spacing.lg : archetypePadding.paddingBottom + footerHeight;

  const container: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
  };

  const content = {
    width: '100%' as const,
    maxWidth: maxContentWidth,
    alignSelf: 'center' as const,
    flex: scroll ? undefined : 1,
    paddingTop: automatic || nativeHeader || !includeTopSafeArea ? spacing.base : archetypePadding.paddingTop,
    paddingBottom: footerPadding + bottomInset,
  };

  const body = (
    // Lists need a bounded flex chain; flexGrow alone lets their content exceed
    // the viewport. Content owns the inset once, including with RefreshControl.
    <View ref={contentRef} collapsable={contentRef ? false : undefined} style={{ paddingLeft: insets.left + horizontal, paddingRight: insets.right + horizontal, flex: scroll ? undefined : 1 }}>
      <View testID={testID} style={[content, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (!scroll) {
    return <View style={[container, style]}>{body}</View>;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={[container, style]}
      contentInsetAdjustmentBehavior={automatic ? 'automatic' : 'never'}
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
