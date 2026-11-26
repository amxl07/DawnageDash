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
import { AccessibilityInfo, BackHandler, findNodeHandle, Platform, Pressable, View, useWindowDimensions, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type WebFocusable = { focus: (options?: { preventScroll: boolean }) => void };
function isWebFocusable(node: unknown): node is WebFocusable {
  return typeof node === 'object' && node !== null && 'focus' in node && typeof node.focus === 'function';
}

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Short choices fit content; details and editors have expandable detents. */
  role?: 'choice' | 'detail' | 'editor';
  /** Optional explicit height for long, virtualized choice collections. */
  heightRatio?: number;
  /** Disables gesture/backdrop dismissal while an owned operation cannot be interrupted. */
  dismissible?: boolean;
  /** Trigger that regains accessibility focus after the sheet closes. */
  returnFocusRef?: RefObject<View | TextInput | null>;
};

/** Sheet-aware inputs/scroll views retain keyboard, recovery and focus behavior. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  role = 'detail',
  heightRatio,
  dismissible = true,
  returnFocusRef,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fitsContent = role === 'choice' && heightRatio === undefined;
  const ref = useRef<BottomSheetModal>(null);
  const titleRef = useRef<View>(null);
  const hasFocusedTitle = useRef(false);
  const controlledDismissPending = useRef(false);
  const restoreFocusPending = useRef(false);
  const wasVisible = useRef(false);

  const snapPoints = useMemo(() => heightRatio !== undefined ? [`${Math.round(heightRatio * 100)}%`] : role === 'editor' ? ['85%', '95%'] : ['65%', '90%'], [heightRatio, role]);

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
      if (isWebFocusable(trigger)) (trigger as WebFocusable).focus({ preventScroll: true });
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
        // Browser focus can scroll Gorhom's overflow-hidden positioning viewport.
        // Move accessibility focus without displacing the presented sheet.
        if (isWebFocusable(titleRef.current)) (titleRef.current as WebFocusable).focus({ preventScroll: true });
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
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }} ref={titleRef} accessibilityRole="header" tabIndex={Platform.OS === 'web' ? -1 : undefined}>
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
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.pressed : colors.elevated,
          })}
        >
          <X size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  ), [colors.elevated, colors.borderStrong, colors.mutedForeground, colors.pressed, dismissible, onClose, title]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={fitsContent ? undefined : snapPoints}
      // Editors need their full scroll viewport immediately, including on short screens.
      index={role === 'editor' && heightRatio === undefined ? 1 : 0}
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      enableDynamicSizing={fitsContent}
      maxDynamicContentSize={Math.max(240, height - insets.top - spacing.lg)}
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
      {fitsContent ? <BottomSheetScrollView testID="sheet-content" contentContainerStyle={{ paddingBottom: insets.bottom }}>{children}</BottomSheetScrollView> : <View testID="sheet-content" style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>}
    </BottomSheetModal>
  );
}

/** Use inside a Sheet instead of RN's ScrollView. */
export const SheetScrollView = BottomSheetScrollView;
/** Use inside a Sheet instead of RN's FlatList. */
export const SheetFlatList = BottomSheetFlatList;
