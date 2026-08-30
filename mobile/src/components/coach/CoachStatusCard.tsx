import { Image } from 'expo-image';
import { UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { CoachLookup } from '@/hooks/useCoach';
import { coachInitials } from '@/hooks/useCoach';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  lookup: CoachLookup;
};

export function CoachStatusCard({ lookup }: Props) {
  const { colors } = useTheme();

  const avatar =
    lookup.kind === 'assigned' && lookup.coach.avatar_url ? (
      <Image
        source={{ uri: lookup.coach.avatar_url }}
        style={{ width: 48, height: 48 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessible={false}
      />
    ) : lookup.kind === 'assigned' ? (
      <Text variant="bodySm" tone="muted">
        {coachInitials(lookup.coach.full_name)}
      </Text>
    ) : (
      <UserRound
        size={iconSize.lg}
        color={colors.mutedForeground}
        strokeWidth={2}
        accessible={false}
      />
    );

  const title = lookup.kind === 'assigned' ? 'Your coach' : 'Coach status';
  const detail =
    lookup.kind === 'assigned'
      ? lookup.coach.full_name?.trim() || 'Coach assigned'
      : lookup.kind === 'unassigned'
        ? 'No coach assigned yet'
        : 'Coach details are temporarily unavailable';

  return (
    <Card
      accessible
      accessibilityLabel={`${title}: ${detail}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.elevated,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          overflow: 'hidden',
        }}
      >
        {avatar}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          {title}
        </Text>
        <Text variant="body" style={{ flexShrink: 1 }}>
          {detail}
        </Text>
      </View>
    </Card>
  );
}
