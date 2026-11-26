import { Switch, View } from 'react-native';
import { HIT_SLOP_MIN, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type Props = { label: string; detail?: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean; testID?: string };

/** Native UISwitch / Android Switch; the readable label stays outside its fixed thumb. */
export function SwitchRow({ label, detail, value, onValueChange, disabled = false, testID }: Props) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: HIT_SLOP_MIN, gap: spacing.base }}>
    <View style={{ flex: 1, gap: spacing.xs }}><Text>{label}</Text>{detail ? <Text variant="bodySm" tone="muted">{detail}</Text> : null}</View>
    <Switch testID={testID} value={value} disabled={disabled} onValueChange={onValueChange}
      accessibilityLabel={label} accessibilityHint={detail} trackColor={{ false: colors.borderStrong, true: colors.primaryFill }} />
  </View>;
}
