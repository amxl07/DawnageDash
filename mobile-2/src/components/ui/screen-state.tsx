import { View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { useTheme } from '@/theme/theme';

export function ScreenState({ actionLabel, detail, onAction, title }: { actionLabel?: string; detail: string; onAction?: () => void; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 24 }}>
      <Surface elevated style={{ gap: 12 }}>
        <AppText variant="title">{title}</AppText>
        <AppText tone="muted">{detail}</AppText>
        {actionLabel && onAction ? <AppButton onPress={onAction}>{actionLabel}</AppButton> : null}
      </Surface>
    </View>
  );
}
