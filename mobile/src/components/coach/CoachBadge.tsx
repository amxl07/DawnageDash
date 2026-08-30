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
  /** Hide absent data in compact placements or explain its current state. */
  fallback?: 'hide' | 'status';
};

/**
 * Shows who the client's coach is.
 *
 * Dawnage is the only app in the surveyed set with a real person on the other
 * end, and until now the app never rendered them — "coach" appeared in the UI
 * only as a text placeholder. A name and a face turn a tracker into a
 * relationship.
 *
 * Compact placements hide absent data by default. Larger surfaces can request
 * a truthful status without conflating no assignment with an unavailable RPC.
 */
export function CoachBadge({
  variant = 'inline',
  caption,
  size = 36,
  fallback = 'hide',
}: Props) {
  const { colors } = useTheme();
  const { data: lookup } = useCoach();

  if (!lookup) return null;

  if (lookup.kind !== 'assigned' || !lookup.coach.full_name) {
    if (fallback === 'hide') return null;

    const message =
      lookup.kind === 'unassigned'
        ? 'No coach assigned yet.'
        : 'Coach details are temporarily unavailable.';
    return (
      <Text variant="bodySm" tone="muted">
        {message}
      </Text>
    );
  }

  const { coach } = lookup;

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
