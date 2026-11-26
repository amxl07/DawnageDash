import { useState, type RefObject } from 'react';
import { View } from 'react-native';

import { CheckInRatingScale } from '@/components/checkin/CheckInRatingScale';
import { Button, Sheet, SheetScrollView, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

/** Practice stays entirely inside this component; it has no editor or persistence access. */
export function CheckInGuideSheet({ visible, onClose, returnFocusRef }: {
  visible: boolean; onClose: () => void; returnFocusRef: RefObject<View | null>;
}) {
  const { colors } = useTheme();
  const [energy, setEnergy] = useState<number | null>(null);
  return <Sheet role="detail" heightRatio={0.85} visible={visible} onClose={onClose} title="Your daily check-in" returnFocusRef={returnFocusRef}>
    <SheetScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="h1">A small pause. A useful picture.</Text>
        <Text tone="muted">Tell your coach how your day went. Follow the check-in time you agree on, and answer for the date shown.</Text>
      </View>
      <View style={{ backgroundColor: colors.primarySoft, borderRadius: 24, padding: 20, gap: spacing.md }}>
        <Text variant="label" tone="primary">Practice — nothing is saved</Text>
        <Text variant="h2">How was your energy?</Text>
        <CheckInRatingScale label="Practice energy" lowLabel="Exhausted" highLabel="Very energetic" value={energy} onChange={setEnergy} accessibilityMode="options" optionTestIDPrefix="practice-energy" />
        <Text variant="bodySm" tone="muted">Choose what feels closest.</Text>
      </View>
      {[
        ['01', 'How you felt', 'Rate energy and stress. There are no perfect answers.'],
        ['02', 'How you recovered', 'Sleep means the night before the selected day. Record your weight, calories, water, steps and macros each day. All check-in fields are required.'],
        ['03', 'How your day went', 'Record training and nutrition, then review your answers. Log individual workout sets in your workout session.'],
      ].map(([number, title, detail]) => <View key={number} style={{ flexDirection: 'row', gap: spacing.base }}>
        <Text variant="label" tone="primary" numeric>{number}</Text>
        <View style={{ flex: 1, gap: spacing.xs }}><Text variant="h2">{title}</Text><Text variant="bodySm" tone="muted">{detail}</Text></View>
      </View>)}
      <Button label="Got it" onPress={onClose} />
    </SheetScrollView>
  </Sheet>;
}
