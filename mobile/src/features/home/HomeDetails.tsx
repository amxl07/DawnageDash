import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { spacing, useTheme } from '@/theme';

/** Optional reference information; drafts and delivery recovery stay outside. */
export function HomeDetails({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  return <View style={{ borderTopWidth: 1, borderColor: colors.border, gap: spacing.lg }}>
    <Pressable onPress={() => setExpanded((value) => !value)}
      testID="home-details-toggle" accessibilityRole="button" accessibilityLabel="Progress & coaching"
      accessibilityState={{ expanded }}
      style={({ pressed }) => ({ minHeight: 72, paddingVertical: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: pressed ? colors.pressed : 'transparent', borderRadius: 12 })}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="label">Progress & coaching</Text>
      </View>
      <DisclosureChevron expanded={expanded} />
    </Pressable>
    {expanded ? <View style={{ gap: spacing.lg }}>{children}</View> : null}
  </View>;
}
