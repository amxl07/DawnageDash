import { AlertCircle } from 'lucide-react-native';
import { View } from 'react-native';

import { iconSize, spacing, useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  title?: string;
  /** Say what to do next, not the raw error code. */
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "That didn't load",
  message = 'Check your connection and try again.',
  onRetry,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
      <AlertCircle size={iconSize.xl} color={colors.primary} strokeWidth={2} accessible={false} />
      <Text variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? (
        <Button
          label="Retry"
          variant="secondary"
          onPress={onRetry}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </View>
  );
}
