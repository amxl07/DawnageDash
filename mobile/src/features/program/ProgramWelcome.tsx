import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { CoachLookup } from '@/hooks/useCoach';
import { spacing, useTheme } from '@/theme';
import { DawnArtwork } from './DawnArtwork';
import { CheckInGuideSheet } from './CheckInGuideSheet';

export function ProgramWelcome({ waiting, coach, onStart }: { waiting: boolean; coach?: CoachLookup; onStart: () => void }) {
  const { colors } = useTheme();
  const [guide, setGuide] = useState(false);
  const guideRef = useRef<View>(null);
  const connected = coach?.kind === 'assigned';
  const guideAction = <Pressable ref={guideRef} accessibilityRole="button" accessibilityLabel="How check-ins work" onPress={() => setGuide(true)} style={({ pressed }) => ({ minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 16, backgroundColor: waiting ? pressed ? colors.primaryPressed : colors.primaryFill : pressed ? colors.pressed : 'transparent' })}>
    <Text variant="label" style={{ color: waiting ? colors.onPrimary : colors.primary }}>How check-ins work</Text>
  </Pressable>;
  return <>
    <View testID="program-welcome" style={{ borderRadius: 28, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 24, gap: spacing.base }}>
      <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text variant="bodySm" tone="primary">YOUR BEGINNING</Text>
      </View>
      <DawnArtwork compact />
      <View style={{ gap: spacing.sm }}>
        <Text variant="display" accessibilityRole="header">{waiting ? 'Ready when\nyou are.' : 'Make today\nyour Day 1.'}</Text>
        <Text tone="muted">{waiting ? 'Wait for your coach’s guidance, or choose to begin with a check-in today.' : 'A few honest answers about your day. A starting point to build on.'}</Text>
      </View>
      {waiting ? guideAction : null}
      <Button testID="home-today-action" label="Start my first check-in" variant={waiting ? 'secondary' : 'primary'} onPress={onStart} />
      {!waiting ? guideAction : null}
      <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, gap: 4 }}>
        <Text variant="label">{connected ? 'Your coach is connected' : coach?.kind === 'unassigned' ? 'Your coach will connect here' : 'Coach connection'}</Text>
        <Text variant="bodySm" tone="muted">{connected ? 'Your workout and meal plans appear as your coach assigns them.' : coach?.kind === 'unavailable' ? 'Coach details are unavailable right now. Pull down to refresh.' : 'You can begin check-ins before your coach connects, or wait for their guidance.'}</Text>
      </View>
    </View>
    <CheckInGuideSheet visible={guide} onClose={() => setGuide(false)} returnFocusRef={guideRef} />
  </>;
}
