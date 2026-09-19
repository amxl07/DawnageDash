import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { AccessibilityInfo, BackHandler, findNodeHandle, Platform, Pressable, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

function isWebFocusable(node: unknown): node is { focus: () => void } {
  return typeof node === 'object' && node !== null && 'focus' in node && typeof node.focus === 'function';
}

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet occupies. */
  heightRatio?: number;
  /** Disables gesture/backdrop dismissal while an owned operation cannot be interrupted. */
  dismissible?: boolean;
  /** Trigger that regains accessibility focus after the sheet closes. */
  returnFocusRef?: RefObject<View | TextInput | null>;
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
export function Sheet({
  visible,
  onClose,
  title,
  children,
  heightRatio = 0.85,
  dismissible = true,
  returnFocusRef,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const titleRef = useRef<View>(null);
  const hasFocusedTitle = useRef(false);
  const controlledDismissPending = useRef(false);
  const restoreFocusPending = useRef(false);
  const wasVisible = useRef(false);

  const snapPoints = useMemo(() => [`${Math.round(heightRatio * 100)}%`], [heightRatio]);

  useEffect(() => {
    if (!visible) {
      const shouldRestoreFocus = wasVisible.current;
      if (!shouldRestoreFocus) return;
      wasVisible.current = false;
      hasFocusedTitle.current = false;
      controlledDismissPending.current = true;
      restoreFocusPending.current = shouldRestoreFocus;
      ref.current?.dismiss();
      return;
    }

    wasVisible.current = true;
    hasFocusedTitle.current = false;
    controlledDismissPending.current = false;
    restoreFocusPending.current = false;
    ref.current?.present();
  }, [returnFocusRef, visible]);

  const restoreTriggerFocus = useCallback(() => {
    if (!restoreFocusPending.current) return;
    restoreFocusPending.current = false;
    const trigger = returnFocusRef?.current;
    if (!trigger) return;
    if (Platform.OS === 'web') {
      if (isWebFocusable(trigger)) trigger.focus();
      return;
    }
    const triggerHandle = findNodeHandle(trigger);
    if (triggerHandle != null) AccessibilityInfo.setAccessibilityFocus(triggerHandle);
  }, [returnFocusRef]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissible) onClose();
      return true;
    });
    return () => subscription.remove();
  }, [dismissible, onClose, visible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (!visible || index < 0 || hasFocusedTitle.current) return;

      hasFocusedTitle.current = true;
      if (Platform.OS === 'web') {
        if (isWebFocusable(titleRef.current)) titleRef.current.focus();
        return;
      }
      const titleHandle = findNodeHandle(titleRef.current);
      if (titleHandle != null) AccessibilityInfo.setAccessibilityFocus(titleHandle);
    },
    [visible],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        style={[props.style, { backgroundColor: colors.scrim }]}
        pressBehavior={dismissible ? 'close' : 'none'}
      />
    ),
    [colors.scrim, dismissible],
  );

  const handleDismiss = useCallback(() => {
    if (controlledDismissPending.current) {
      controlledDismissPending.current = false;
      restoreTriggerFocus();
      return;
    }

    if (!dismissible && visible) {
      ref.current?.present();
      onClose();
      return;
    }
    restoreFocusPending.current = wasVisible.current;
    wasVisible.current = false;
    restoreTriggerFocus();
    onClose();
  }, [dismissible, onClose, restoreTriggerFocus, visible]);

  const renderHandle = useCallback((props: BottomSheetHandleProps) => (
    <View>
      <BottomSheetHandle
        {...props}
        style={{ paddingHorizontal: 0, paddingBottom: 0 }}
        indicatorStyle={{ backgroundColor: colors.borderStrong }}
      />
      <View
        testID="sheet-header"
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
        <View ref={titleRef} accessibilityRole="header" tabIndex={Platform.OS === 'web' ? -1 : undefined}>
          <Text variant="h2">{title}</Text>
        </View>
        {/* A visible close button is mandatory — dismissal is never
            gesture-only, even though pan-down still works (§03.B.6). */}
        <Pressable
          onPress={() => {
            if (dismissible) onClose();
          }}
          disabled={!dismissible}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          accessibilityState={{ disabled: !dismissible }}
          style={({ pressed }) => ({
            minWidth: HIT_SLOP_MIN,
            minHeight: HIT_SLOP_MIN,
            alignItems: 'flex-end',
            justifyContent: 'center',
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <X size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  ), [colors.border, colors.borderStrong, colors.mutedForeground, colors.pressed, dismissible, onClose, title]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      enableDynamicSizing={false}
      enablePanDownToClose={dismissible}
      backgroundStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View testID="sheet-content" style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
    </BottomSheetModal>
  );
}

/** Use inside a Sheet instead of RN's ScrollView. */
export const SheetScrollView = BottomSheetScrollView;
/** Use inside a Sheet instead of RN's FlatList. */
export const SheetFlatList = BottomSheetFlatList;
