import { router } from 'expo-router';
import { SafeAreaView, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { PublicRouteBoundary } from '@/session/public-route-boundary';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function WelcomeScreen() {
  const { enterDemo } = useSession();
  const { colors, spacing } = useTheme();
  const startDemo = async () => {
    await enterDemo();
    router.replace('/(tabs)');
  };

  return (
    <PublicRouteBoundary>
      <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', padding: spacing.lg }}>
          <View style={{ gap: spacing.md, paddingTop: spacing.xxl }}>
            <AppText tone="muted" variant="caption">DAWNAGE / DAILY HEALTH</AppText>
            <AppText variant="display">A clearer rhythm for your day.</AppText>
            <AppText tone="muted">Explore a private demo or bring your own compatible fitness server.</AppText>
          </View>
          <Surface elevated style={{ gap: spacing.md }}>
            <AppText variant="title">Start where you are</AppText>
            <AppButton onPress={startDemo}>Explore the demo</AppButton>
            <AppButton onPress={() => router.push('/connect')} tone="secondary">Connect my server</AppButton>
          </Surface>
        </View>
      </SafeAreaView>
    </PublicRouteBoundary>
  );
}
