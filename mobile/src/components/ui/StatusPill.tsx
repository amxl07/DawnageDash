import {
  Circle,
  CircleAlert,
  CircleCheck,
  CloudOff,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import type { SaveStatus } from '@/hooks/useCheckInDraft';
import { iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

const DEFAULT_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved on this device',
  offline: 'Saved here · waiting to sync',
  error: 'Couldn’t save draft',
};

const STATUS_ICON: Record<SaveStatus, LucideIcon> = {
  idle: Circle,
  saving: LoaderCircle,
  saved: CircleCheck,
  offline: CloudOff,
  error: CircleAlert,
};

type Props = {
  status: SaveStatus;
  label?: string;
};

export function StatusPill({ status, label: customLabel }: Props) {
  const { colors } = useTheme();
  const label = customLabel ?? DEFAULT_LABEL[status];
  const Icon = STATUS_ICON[status];
  const color = {
    idle: colors.mutedForeground,
    saving: colors.mutedForeground,
    saved: colors.success,
    offline: colors.gold,
    error: colors.destructive,
  }[status];

  if (!label) return null;

  return (
    <View
      role="status"
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      aria-live="polite"
      style={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Icon size={iconSize.sm} color={color} strokeWidth={2} accessible={false} />
      <Text variant="bodySm" style={{ color, flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}
