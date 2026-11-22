import { PrivatePhoto } from './PrivatePhoto';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, spacing, useMotion, useTheme } from '@/theme';

export type ViewerPhoto = {
  label: string;
  weekLabel: string;
  /** Durable photo reference, resolved to a short-lived URL only by PrivatePhoto. */
  url: string;
  caption: string;
};

export type PhotoFocusTarget = View | { focus: () => void };

/** RN Web throws when its host node is passed through findNodeHandle. */
export function focusPhotoTarget(
  target: PhotoFocusTarget | null | undefined,
  platform: typeof Platform.OS = Platform.OS,
): boolean {
  if (!target) return false;
  if (platform === 'web') {
    const focus = (target as { focus?: () => void }).focus;
    if (typeof focus !== 'function') return false;
    try {
      focus.call(target);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const handle = findNodeHandle(target as View);
    if (handle == null) return false;
    AccessibilityInfo.setAccessibilityFocus(handle);
    return true;
  } catch {
    // The target can disappear while a modal is closing; focus is best-effort.
    return false;
  }
}

export function photoPositionForSourceIndex(
  sourceSlots: readonly { url: string | null }[],
  sourceIndex: number,
): number | null {
  if (!sourceSlots[sourceIndex]?.url) return null;
  return sourceSlots.slice(0, sourceIndex).filter((slot) => slot.url).length;
}

/**
 * Full-screen viewer with explicit previous/next controls.
 */
export function PhotoViewer({
  photos,
  startIndex,
  onClose,
  returnFocusTarget,
}: {
  photos: ViewerPhoto[];
  startIndex: number;
  onClose: () => void;
  returnFocusTarget?: PhotoFocusTarget | null;
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const photoRef = useRef<View>(null);
  const modalShownRef = useRef(false);
  const focusedAnnouncementRef = useRef<string | null>(null);

  const safeIndex = photos.length ? Math.min(Math.max(0, index), photos.length - 1) : 0;
  const photo = photos[safeIndex];
  const announcement = photo
    ? `${photo.label} photo, ${photo.weekLabel}, ${safeIndex + 1} of ${photos.length}`
    : null;

  const focusAndAnnounce = useCallback(() => {
    if (!announcement) return;
    if (!focusPhotoTarget(photoRef.current)) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
    focusedAnnouncementRef.current = announcement;
  }, [announcement]);

  useEffect(
    () => () => {
      focusPhotoTarget(returnFocusTarget);
    },
    [returnFocusTarget],
  );

  useEffect(() => {
    if (
      modalShownRef.current &&
      announcement &&
      focusedAnnouncementRef.current !== announcement
    ) {
      focusAndAnnounce();
    }
  }, [announcement, focusAndAnnounce]);

  if (!photo || !announcement) return null;

  return (
    <Modal
      visible
      animationType={motion.reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
      onShow={() => {
        modalShownRef.current = true;
        if (focusedAnnouncementRef.current !== announcement) focusAndAnnounce();
      }}
    >
      <View
        accessibilityViewIsModal
        style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.base,
          }}
        >
          <Text variant="h2" style={{ flex: 1 }}>
            {photo.label}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            style={({ pressed }) => ({
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              alignItems: 'flex-end',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <X size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>

        <View
          ref={photoRef}
          accessible
          focusable
          accessibilityRole="image"
          accessibilityLabel={announcement}
          style={{ flex: 1 }}
        >
          <PrivatePhoto
            reference={photo.url}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            transition={motion.reduced ? 0 : Math.min(160, motion.duration.micro)}
            accessible={false}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.base,
            paddingBottom: insets.bottom + spacing.base,
          }}
        >
          <Pressable
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous angle"
            accessibilityState={{ disabled: safeIndex === 0 }}
            style={({ pressed }) => ({
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              justifyContent: 'center',
              opacity: safeIndex === 0 ? 0.35 : 1,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <ChevronLeft size={iconSize.xl} color={colors.foreground} strokeWidth={2} />
          </Pressable>

          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="bodySm" tone="muted">
              {photo.weekLabel} · {photo.caption} · {safeIndex + 1} of {photos.length}
            </Text>
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={{ flexDirection: 'row', gap: spacing.xs }}
            >
              {photos.map((p, i) => (
                <View
                  key={p.label + i}
                  testID={`photo-position-dot-${i}`}
                  accessible={false}
                  importantForAccessibility="no"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === safeIndex ? colors.primary : colors.borderStrong,
                  }}
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setIndex((i) => Math.min(photos.length - 1, i + 1))}
            disabled={safeIndex === photos.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next angle"
            accessibilityState={{ disabled: safeIndex === photos.length - 1 }}
            style={({ pressed }) => ({
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              alignItems: 'flex-end',
              justifyContent: 'center',
              opacity: safeIndex === photos.length - 1 ? 0.35 : 1,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <ChevronRight size={iconSize.xl} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
