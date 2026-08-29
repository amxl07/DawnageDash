import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { coachInitials, useCoach } from '@/hooks/useCoach';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  /** 'inline' for a quiet line; 'card' for a standalone block. */
  variant?: 'inline' | 'card';
  /** Overrides the default line, e.g. "will read this". */
  caption?: string;
  size?: number;
};

/**
 * Shows who the client's coach is.
 *
 * Dawnage is the only app in the surveyed set with a real person on the other
 * end, and until now the app never rendered them — "coach" appeared in the UI
 * only as a text placeholder. A name and a face turn a tracker into a
 * relationship.
 *
 * Renders nothing when there is no coach, or before the RPC is deployed. Every
 * placement must therefore tolerate its absence.
 */
export function CoachBadge({ variant = 'inline', caption, size = 36 }: Props) {
  const { colors } = useTheme();
  const { data: coach } = useCoach();

  if (!coach?.full_name) return null;

  const label = caption ?? 'Your coach';

  const avatar = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        overflow: 'hidden',
      }}
    >
      {coach.avatar_url ? (
        <Image
          source={{ uri: coach.avatar_url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        // avatar_url is null for coaches today, so initials are the norm,
        // not the exception.
        <Text variant="bodySm" tone="muted">
          {coachInitials(coach.full_name)}
        </Text>
      )}
    </View>
  );

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {avatar}
      <View style={{ flex: 1 }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Text variant={variant === 'card' ? 'h2' : 'body'}>{coach.full_name}</Text>
      </View>
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${coach.full_name}`}
      style={
        variant === 'card'
          ? {
              padding: spacing.base,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }
          : undefined
      }
    >
      {body}
    </View>
  );
}
