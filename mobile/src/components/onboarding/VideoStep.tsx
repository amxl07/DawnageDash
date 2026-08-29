import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Skeleton, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

/**
 * YouTube embed in a fixed 16:9 box so the page never reflows as it loads.
 * No autoplay — a video that starts talking on its own is hostile.
 */
export function VideoStep({ videoId, title }: { videoId: string; title: string }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          aspectRatio: 16 / 9,
          borderRadius: radius.md,
          overflow: 'hidden',
          backgroundColor: colors.elevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {loading ? (
          <Skeleton height="100%" width="100%" style={{ position: 'absolute' }} />
        ) : null}
        <WebView
          source={{ uri: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1` }}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          onLoadEnd={() => setLoading(false)}
          accessibilityLabel={title}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
      <Text variant="bodySm" tone="muted">
        {title}
      </Text>
    </View>
  );
}
