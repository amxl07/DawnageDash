import { useWindowDimensions } from 'react-native';

export type ResponsiveLayout = 'horizontal' | 'stacked';

export function getResponsiveLayout(fontScale: number): ResponsiveLayout {
  return fontScale >= 1.5 ? 'stacked' : 'horizontal';
}

export function useResponsiveLayout(): ResponsiveLayout {
  return getResponsiveLayout(useWindowDimensions().fontScale);
}
