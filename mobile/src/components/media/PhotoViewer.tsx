import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, spacing, useMotion, useTheme } from '@/theme';

export type ViewerPhoto = {
  label: string;
  weekLabel: string;
  url: string;
  caption: string;
};

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
}: {
  photos: ViewerPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  const safeIndex = photos.length ? Math.min(Math.max(0, index), photos.length - 1) : 0;
  const photo = photos[safeIndex];
  const announcement = photo
    ? `${photo.label} photo, ${photo.weekLabel}, ${safeIndex + 1} of ${photos.length}`
    : null;

  useEffect(() => {
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  if (!photo || !announcement) return null;

  return (
    <Modal visible animationType={motion.reduced ? 'none' : 'fade'} onRequestClose={onClose}>
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
            style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <X size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          <Image
            source={{ uri: photo.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={`viewer:${photo.url}`}
            accessibilityLabel={announcement}
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
            style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, justifyContent: 'center', opacity: safeIndex === 0 ? 0.35 : 1 }}
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
            style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'flex-end', justifyContent: 'center', opacity: safeIndex === photos.length - 1 ? 0.35 : 1 }}
          >
            <ChevronRight size={iconSize.xl} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
