import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { useNativeHeader, useNativeTabs } from '@/components/navigation/NavigationChrome';
import { ToolbarAction } from './ToolbarAction';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  action?: React.ReactNode;
};

/** Shared screen title treatment for stack destinations. */
export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
  action,
}: Props) {
  const { colors } = useTheme();
  const nativeHeader = useNativeHeader();
  const nativeTabs = useNativeTabs();
  if (nativeHeader && !nativeTabs) return <NativePageHeader title={title} subtitle={subtitle} onBack={onBack} backLabel={backLabel} action={action} />;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => ({
            minWidth: HIT_SLOP_MIN,
            minHeight: HIT_SLOP_MIN,
            alignItems: 'flex-start',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <ArrowLeft size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="h1">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}


function NativePageHeader({ title, subtitle, onBack, backLabel, action }: Props) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: action ? () => action : undefined,
      // Preserve any screen-owned guard rather than bypassing it with a system pop.
      headerLeft: onBack ? () => <ToolbarAction symbol="back" label={backLabel ?? 'Back'} onPress={onBack} /> : undefined,
    });
  }, [action, backLabel, navigation, onBack, title]);
  return subtitle ? <Text variant="bodySm" tone="muted">{subtitle}</Text> : null;
}
