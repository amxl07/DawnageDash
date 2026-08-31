import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { StatusBanner } from '@/components/ui/status-banner';
import { useSession } from '@/session/session-context';
import { PublicRouteBoundary } from '@/session/public-route-boundary';
import { useTheme } from '@/theme/theme';

export default function SignInScreen() {
  const { savedServerUrl, signIn } = useSession();
  const { colors, radii, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not sign you in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicRouteBoundary>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.background, flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, gap: spacing.lg, padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.sm }}>
            <AppText variant="title">Welcome back</AppText>
            <AppText tone="muted">Signing in to {savedServerUrl ?? 'your server'}.</AppText>
          </View>
          <View style={{ gap: spacing.sm }}>
            <AppText style={{ fontWeight: '700' }}>Email</AppText>
            <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }} value={email} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <AppText style={{ fontWeight: '700' }}>Password</AppText>
            <TextInput accessibilityLabel="Password" autoComplete="password" onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.muted} secureTextEntry style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }} value={password} />
          </View>
          {error ? <StatusBanner tone="danger">{error}</StatusBanner> : null}
          <AppButton disabled={!email || !password} loading={submitting} onPress={submit}>Sign in</AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </PublicRouteBoundary>
  );
}
