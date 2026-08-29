import { useWindowDimensions } from 'react-native';

import { contentMaxWidth, getResponsiveMode, horizontalInset } from '@/theme/layout';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const mode = getResponsiveMode(width, fontScale);

  return {
    width,
    height,
    fontScale,
    mode,
    isCompact: mode === 'compact',
    isWide: mode === 'wide',
    horizontal: horizontalInset(width),
    maxContentWidth: contentMaxWidth(mode),
  } as const;
}
