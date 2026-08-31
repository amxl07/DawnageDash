import { View } from 'react-native';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme';

type OperatingSystem = 'android' | 'ios' | 'web' | string | undefined;

export function getTabScreenTopInset(
  operatingSystem: OperatingSystem,
  topInset: number,
): number {
  return operatingSystem === 'android' ? topInset : 0;
}

export function TabScreenBoundary({
  children,
  style,
}: PropsWithChildren<Pick<ComponentProps<typeof View>, 'style'>>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          backgroundColor: colors.background,
          flex: 1,
          paddingTop: getTabScreenTopInset(process.env.EXPO_OS, insets.top),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
