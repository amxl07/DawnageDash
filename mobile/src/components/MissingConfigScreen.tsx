import { View } from 'react-native';

import { missingEnvVars } from '@/lib/env';
import { spacing, useTheme } from '@/theme';
import { Card, Screen, Text } from './ui';

/**
 * Shown instead of the app when mobile/.env is absent, so a fresh clone gets a
 * readable instruction rather than a crash on a null Supabase client.
 */
export function MissingConfigScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <Screen scroll={false}>
        <Card style={{ gap: spacing.md }}>
          <Text variant="h1">Missing configuration</Text>
          <Text variant="bodySm" tone="muted">
            Create a file at <Text variant="bodySm">mobile/.env</Text> with these values, copied
            from the repo-root <Text variant="bodySm">.env</Text>:
          </Text>
          {missingEnvVars.map((name) => (
            <Text key={name} variant="bodySm" tone="primary">
              {name}
            </Text>
          ))}
          <Text variant="bodySm" tone="muted">
            Use the anon key only — never the service role key. Restart the dev server after
            editing.
          </Text>
        </Card>
      </Screen>
    </View>
  );
}
