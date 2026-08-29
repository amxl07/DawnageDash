import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, iconSize, spacing, useMotion, useTheme } from '@/theme';

export type ViewerPhoto = { label: string; url: string; caption: string };

/**
 * Full-screen viewer. Prev/next are visible buttons as well as swipes —
 * swipe is never the only way to move (§03.B.2).
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
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);

  if (!photos.length) return null;
  const photo = photos[Math.min(index, photos.length - 1)];

  return (
    <Modal visible animationType={motion.reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
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

        <Image
          source={{ uri: photo.url }}
          style={{ width, flex: 1 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityLabel={`${photo.label}, ${photo.caption}`}
        />

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
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous angle"
            accessibilityState={{ disabled: index === 0 }}
            style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, justifyContent: 'center', opacity: index === 0 ? 0.35 : 1 }}
          >
            <ChevronLeft size={iconSize.xl} color={colors.foreground} strokeWidth={2} />
          </Pressable>

          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="bodySm" tone="muted">
              {photo.caption}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {photos.map((p, i) => (
                <View
                  key={p.label + i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === index ? colors.primary : colors.borderStrong,
                  }}
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setIndex((i) => Math.min(photos.length - 1, i + 1))}
            disabled={index === photos.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next angle"
            accessibilityState={{ disabled: index === photos.length - 1 }}
            style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'flex-end', justifyContent: 'center', opacity: index === photos.length - 1 ? 0.35 : 1 }}
          >
            <ChevronRight size={iconSize.xl} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
