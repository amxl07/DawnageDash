import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { StatusBanner } from '@/components/ui/status-banner';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function ConnectScreen() {
  const { saveServer } = useSession();
  const { colors, radii, spacing } = useTheme();
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const validate = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveServer(serverUrl);
      router.replace('/sign-in');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not validate that server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: spacing.lg, padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">Your server, your data.</AppText>
          <AppText tone="muted">Enter the full address of your compatible server. We will check it before you sign in.</AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <AppText style={{ fontWeight: '700' }}>Server address</AppText>
          <TextInput
            accessibilityLabel="Server address"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setServerUrl}
            placeholder="https://fitness.example"
            placeholderTextColor={colors.muted}
            style={{ backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }}
            value={serverUrl}
          />
          {error ? <StatusBanner tone="danger">{error}</StatusBanner> : null}
        </View>
        <AppButton loading={saving} onPress={validate}>Check server</AppButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
