import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { TodayAction } from '@/lib/today-action';
import { spacing } from '@/theme';

export function TodayActionCard({
  action,
  onPress,
  testID,
}: {
  action: TodayAction;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Card style={{ gap: spacing.md }}>
      <View
        accessible
        accessibilityLabel={`${action.title}. ${action.detail}`}
        style={{ gap: spacing.xs }}
      >
        <Text variant="h2">{action.title}</Text>
        <Text variant="bodySm" tone="muted">
          {action.detail}
        </Text>
      </View>
      <Button
        testID={testID}
        label={action.title}
        onPress={onPress}
        accessibilityHint={action.detail}
      />
    </Card>
  );
}
