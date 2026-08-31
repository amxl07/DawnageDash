import { SafeAreaView } from 'react-native';

import { ScreenState } from '@/components/ui/screen-state';
import { useTheme } from '@/theme/theme';

type TabPlaceholderScreenProps = {
  detail: string;
  title: string;
};

export function TabPlaceholderScreen({ detail, title }: TabPlaceholderScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScreenState detail={detail} title={title} />
    </SafeAreaView>
  );
}
