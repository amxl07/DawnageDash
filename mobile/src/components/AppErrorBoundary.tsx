import { Component, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reportScreenError } from '@/lib/telemetry';
import { spacing, useTheme } from '@/theme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

function RecoveryScreen({ retry }: { retry: () => void }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}>
        <Card style={{ gap: spacing.lg }}>
          <Text variant="h1" accessibilityRole="header">Let’s try that again</Text>
          <Text tone="muted">This screen couldn’t open. Your saved drafts are still on this device.</Text>
          <Button label="Try again" onPress={retry} accessibilityHint="Reopens the app without clearing saved drafts" />
          <Text variant="caption" tone="muted">If this keeps happening, close and reopen Dawnage.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Remount failed screens without clearing auth, query data or durable drafts. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { reportScreenError(error); }
  render() {
    return this.state.failed
      ? <RecoveryScreen retry={() => this.setState({ failed: false })} />
      : this.props.children;
  }
}
