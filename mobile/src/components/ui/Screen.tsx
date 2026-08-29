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

import { spacing, useTheme } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Wrap in a ScrollView. Set false for screens owning their own FlatList. */
  scroll?: boolean;
  /** Extra bottom padding so content clears a sticky action bar. */
  bottomInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
};

export const Screen = forwardRef<ScrollView, Props>(function Screen(
  { children, scroll = true, bottomInset = 0, refreshControl, style },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Wider gutters on tablets / large phones so text keeps a readable measure.
  const horizontal = width >= 768 ? spacing.lg : spacing.base;

  const container: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingLeft: insets.left + horizontal,
    paddingRight: insets.right + horizontal,
  };

  const contentPadding = {
    paddingTop: spacing.base,
    paddingBottom: insets.bottom + spacing.xl + bottomInset,
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
