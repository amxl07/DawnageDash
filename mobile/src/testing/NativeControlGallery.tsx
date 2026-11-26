import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Input, OptionRow, SegmentedControl, Sheet, Text } from '@/components/ui';
import { InlineAction } from '@/components/ui/InlineAction';
import { ToolbarAction } from '@/components/ui/ToolbarAction';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { spacing, useTheme } from '@/theme';

/** Opt-in development harness. No demo route or production auth shortcut. */
export function NativeControlGallery() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState('plan');
  const [enabled, setEnabled] = useState(false);
  const [choice, setChoice] = useState('morning');
  const [sheet, setSheet] = useState(false);
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.content, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}>
      <Text variant="h1">Dawnage controls</Text>
      <Text tone="muted">Development comparison · system text size and appearance</Text>
      <Card style={{ gap: spacing.md }}>
        <Button label="Continue your check-in" onPress={() => setSheet(true)} />
        <Button label="Save changes" loading />
        <Button label="Unavailable action" disabled />
        <Button label="Review your record" variant="secondary" />
        <InlineAction label="View all history" onPress={() => setSheet(true)} />
        <ToolbarAction symbol="close" label="Close example" onPress={() => setSheet(false)} />
      </Card>
      <SegmentedControl label="Training view" value={view} onChange={setView} segments={[{ value: 'plan', label: 'Plan' }, { value: 'history', label: 'History' }]} />
      <Card style={{ gap: spacing.base }}>
        <Input label="Morning weight" keyboardType="decimal-pad" hint="Required · kg" />
        <Input label="A field that needs attention" error="Enter a valid value before continuing." />
        <SwitchRow label="Auto-start after a set" detail="Start the rest timer when you complete a set." value={enabled} onValueChange={setEnabled} />
      </Card>
      <View style={{ gap: spacing.sm }}>
        <Text variant="h2">Your preferred time</Text>
        {['morning', 'evening'].map((value) => <OptionRow key={value} label={value === 'morning' ? 'Morning' : 'Evening'} selected={choice === value} onPress={() => setChoice(value)} />)}
      </View>
      <Button label="Open a choice sheet" variant="secondary" onPress={() => setSheet(true)} />
    </ScrollView>
    <Sheet role="choice" title="Choose a time" visible={sheet} onClose={() => setSheet(false)}>
      <View style={{ gap: spacing.base, padding: spacing.base }}><Text>Short choices fit their content and remain scrollable at large text sizes.</Text><Button label="Done" onPress={() => setSheet(false)} /></View>
    </Sheet>
  </>;
}
