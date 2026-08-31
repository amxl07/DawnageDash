import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function IndexScreen() {
  const { restoreStatus, session } = useSession();
  const { colors } = useTheme();

  if (restoreStatus === 'restoring') {
    return <View accessibilityLabel="Restoring your session" style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  }

  return <Redirect href={session ? '/(tabs)' : '/welcome'} />;
}
