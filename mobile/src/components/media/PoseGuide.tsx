import { Image } from 'expo-image';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import type { AngleKey } from '@/lib/photos';

/**
 * Alignment aid shown over a picked photo.
 *
 * The ghost of LAST WEEK's shot for the same angle is far more useful than a
 * generic outline — matching your own previous framing is what makes progress
 * photos actually comparable. The silhouette is the Week-0 fallback.
 */
export function PoseGuide({
  angle,
  ghostUrl,
  visible,
}: {
  angle: AngleKey;
  ghostUrl: string | null;
  visible: boolean;
}) {
  const { colors } = useTheme();
  if (!visible) return null;

  if (ghostUrl) {
    return (
      <View pointerEvents="none" style={{ ...StyleSheetAbsolute, opacity: 0.25 }}>
        <Image
          source={{ uri: ghostUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessible={false}
        />
      </View>
    );
  }

  const isSide = angle === 'side_left' || angle === 'side_right';
  return (
    <View pointerEvents="none" style={{ ...StyleSheetAbsolute, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="60%" height="80%" viewBox="0 0 100 200" opacity={0.35}>
        <Circle cx="50" cy="22" r="15" stroke={colors.primary} strokeWidth="2" fill="none" />
        {isSide ? (
          <Path
            d="M50 38 L50 110 M50 55 L58 85 M50 110 L46 175 M50 110 L56 175"
            stroke={colors.primary}
            strokeWidth="2"
            fill="none"
          />
        ) : (
          <Path
            d="M50 38 L50 110 M50 52 L26 82 M50 52 L74 82 M50 110 L34 178 M50 110 L66 178"
            stroke={colors.primary}
            strokeWidth="2"
            fill="none"
          />
        )}
      </Svg>
      <Text variant="bodySm" tone="muted" style={{ position: 'absolute', bottom: spacing.md }}>
        Stand square to the camera
      </Text>
    </View>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
