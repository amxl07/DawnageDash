import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilePenLine,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

export type RecordStatusValue = 'saving-local' | 'draft' | 'queued' | 'synced' | 'blocked';

export type RecordStatusProps = {
  value: RecordStatusValue;
  updatedAt?: number;
  onRetry?: () => void;
};

const statusContent: Record<
  RecordStatusValue,
  { text: string; icon: LucideIcon; tone: 'muted' | 'primary' | 'success' | 'destructive' }
> = {
  'saving-local': { text: 'Saving on this device…', icon: LoaderCircle, tone: 'muted' },
  draft: { text: 'Saved on this device', icon: FilePenLine, tone: 'muted' },
  queued: { text: 'Saved on this device. Waiting to sync.', icon: Clock3, tone: 'primary' },
  synced: { text: 'Saved and synced', icon: CheckCircle2, tone: 'success' },
  blocked: { text: "Couldn't sync this record.", icon: CircleAlert, tone: 'destructive' },
};

export function RecordStatus({ value, updatedAt, onRetry }: RecordStatusProps) {
  const { colors } = useTheme();
  const previousValue = useRef<RecordStatusValue | null>(null);
  const content = statusContent[value];
  const Icon = content.icon;
  const color =
    content.tone === 'success'
      ? colors.success
      : content.tone === 'destructive'
        ? colors.destructive
        : content.tone === 'primary'
          ? colors.primary
          : colors.mutedForeground;

  useEffect(() => {
    if (previousValue.current && previousValue.current !== value) {
      AccessibilityInfo.announceForAccessibility(content.text);
    }
    previousValue.current = value;
  }, [content.text, value]);

  const updated = updatedAt
    ? `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View
        accessible
        role="status"
        accessibilityLabel={updated ? `${content.text}. ${updated}` : content.text}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Icon size={iconSize.sm} color={color} strokeWidth={2} accessible={false} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="bodySm" tone={content.tone}>
            {content.text}
          </Text>
          {updated ? (
            <Text variant="caption" tone="muted">
              {updated}
            </Text>
          ) : null}
        </View>
      </View>
      {value === 'blocked' && onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry save"
          hitSlop={8}
          onPress={onRetry}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? colors.pressed : 'transparent' })}
        >
          <Text variant="label" tone="primary">
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
