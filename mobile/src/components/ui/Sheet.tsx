import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet occupies. */
  heightRatio?: number;
};

/**
 * Bottom sheet, built on @gorhom/bottom-sheet.
 *
 * Replaces a plain `Modal` with `animationType="slide"`. What that bought:
 * drag-to-dismiss, a real backdrop that fades with the drag, snap points, and —
 * the reason it was worth changing — keyboard handling. The measurement and
 * questionnaire sheets are forms, and a Modal has no notion of a keyboard
 * pushing its content.
 *
 * Pure JS on top of Reanimated + Gesture Handler, so it still runs in Expo Go;
 * nothing here forfeits the SDK 54 decision.
 *
 * Scrollable children MUST use the exports below (`SheetScrollView`,
 * `SheetFlatList`) rather than plain RN ones, or the inner scroll fights the
 * sheet's own pan gesture.
 */
export function Sheet({ visible, onClose, title, children, heightRatio = 0.85 }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const titleRef = useRef<View>(null);

  const snapPoints = useMemo(() => [`${Math.round(heightRatio * 100)}%`], [heightRatio]);

  useEffect(() => {
    if (!visible) {
      ref.current?.dismiss();
      return;
    }

    ref.current?.present();
    const frame = requestAnimationFrame(() => {
      const titleHandle = findNodeHandle(titleRef.current);
      if (titleHandle != null) AccessibilityInfo.setAccessibilityFocus(titleHandle);
    });

    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.card,
        borderTopRightRadius: radius.card,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View ref={titleRef} accessibilityRole="header">
          <Text variant="h2">{title}</Text>
        </View>
        {/* A visible close button is mandatory — dismissal is never
            gesture-only, even though pan-down now works (§03.B.6). */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          style={{
            minWidth: HIT_SLOP_MIN,
            minHeight: HIT_SLOP_MIN,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <X size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </BottomSheetView>

      <View testID="sheet-content" style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
    </BottomSheetModal>
  );
}

/** Use inside a Sheet instead of RN's ScrollView. */
export const SheetScrollView = BottomSheetScrollView;
/** Use inside a Sheet instead of RN's FlatList. */
export const SheetFlatList = BottomSheetFlatList;
