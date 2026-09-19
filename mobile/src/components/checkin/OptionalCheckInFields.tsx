import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { Text } from '@/components/ui';
import { useNumericCommits } from '@/features/checkin/components/NumericCommitProvider';
import { iconSize, radius, spacing, useMotion, useTheme } from '@/theme';

type Props = {
  label: string;
  testID: string;
  reveal?: boolean;
  revealRequest?: number;
  children: ReactNode;
};

export function OptionalCheckInFields({ label, testID, reveal = false, revealRequest = 0, children }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const commits = useNumericCommits();
  const [expanded, setExpanded] = useState(reveal);

  useEffect(() => {
    if (reveal) setExpanded(true);
  }, [reveal, revealRequest]);

  const toggle = () => {
    if (expanded && commits?.flush() === false) return;
    setExpanded((current) => !current);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.primarySoft : 'transparent',
        })}
      >
        <Text variant="label" tone="primary" style={{ flex: 1 }}>{label}</Text>
        <DisclosureChevron expanded={expanded} size={iconSize.md} color={colors.primary} />
      </Pressable>
      {expanded ? <Animated.View
        testID={`${testID}-content`}
        entering={motion.enabled ? FadeIn.duration(motion.duration.feedback) : undefined}
        style={{ gap: spacing.base }}
      >{children}</Animated.View> : null}
    </View>
  );
}
