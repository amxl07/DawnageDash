import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { Screen, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { HEALTH_ACCESS_EXPLANATION } from '@/features/health/health-review-sheet';

/** Public by design: Android's permission rationale must work before sign-in. */
export default function HealthAccessScreen() {
  const { colors } = useTheme();
  return <Screen archetype="child" includeTopSafeArea={false}>
    <Stack.Screen options={{ title: 'Health access', headerShown: true, headerTintColor: colors.foreground, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false }} />
    <View style={{ gap: spacing.lg }}>
      <Text variant="h1">Your health data, your choice</Text>
      <Text selectable>{HEALTH_ACCESS_EXPLANATION}</Text>
      <Text selectable>Allow only the measurements you want, or enter your check-in manually. Dawnage does not request background access.</Text>
      <Text selectable>Totals cover accessible records for your selected local day; today’s totals are partial. Missing records or declined access stay unanswered. Morning weight needs an observation before local noon. Food calories are intake, not calories burned.</Text>
      <Text selectable>Choose which values to use. Existing entries are replaced only when selected. Unselected entries stay unchanged.</Text>
      <Text variant="label">Change or remove access</Text>
      <Text selectable>{Platform.OS === 'ios' ? 'Apple Health → your profile → Apps → Dawnage.' : Platform.OS === 'android' ? 'Health Connect → App permissions → Dawnage.' : 'Open your device’s health app to manage Dawnage access.'} Turn off any measurement or revoke access altogether.</Text>
      <Text selectable>Revoking health access stops future reads. It does not remove values you previously added to Dawnage check-ins. Review or edit those check-ins separately in Dawnage.</Text>
    </View>
  </Screen>;
}
