import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { CheckCircle, Lock } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { iconSize, spacing, useTheme } from '@/theme';

/**
 * Reached via the `dawnage://reset-password` deep link in the recovery email.
 *
 * Supabase sends the recovery tokens in the URL fragment. On native there is no
 * browser to parse it, so we extract them ourselves and call setSession — after
 * which supabase fires PASSWORD_RECOVERY and AuthContext flips the pending flag.
 */
function parseTokensFromUrl(url: string): { access: string; refresh: string } | null {
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access || !refresh) return null;
  return { access, refresh };
}

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { passwordRecoveryPending, setPasswordRecoveryPending, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const confirmRef = useRef<TextInput>(null);
  const initialUrl = Linking.useURL();

  useEffect(() => {
    if (!initialUrl) return;
    const tokens = parseTokensFromUrl(initialUrl);
    if (!tokens) return;
    supabase.auth
      .setSession({ access_token: tokens.access, refresh_token: tokens.refresh })
      .then(({ error }) => {
        if (error) setLinkError('That reset link has expired. Request a new one from the sign-in screen.');
        else setPasswordRecoveryPending(true);
      })
      .catch(() => setLinkError('That reset link could not be opened. Request a new one.'));
  }, [initialUrl, setPasswordRecoveryPending]);

  const handleReset = async () => {
    const errs: Record<string, string> = {};
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordRecoveryPending(false);
      // Web parity: sign out after a reset so the new password is used to log in.
      await signOut();
      setComplete(true);
    } catch (e) {
      setErrors({ password: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <Screen>
        <View style={{ paddingTop: spacing['2xl'], alignItems: 'center', gap: spacing.md }}>
          <CheckCircle size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
          <Text variant="h1">Password reset</Text>
          <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            Sign in with your new password.
          </Text>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: spacing.base, alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen>
        <View style={{ paddingTop: spacing.xl, gap: spacing.xs }}>
          <Text variant="h1">Set a new password</Text>
          <Text variant="bodySm" tone="muted">
            Choose something you haven&apos;t used before.
          </Text>
        </View>

        <Card style={{ marginTop: spacing.lg, gap: spacing.base }}>
          {linkError ? (
            <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
              {linkError}
            </Text>
          ) : null}

          <Input
            label="New password"
            icon={Lock}
            password
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <Input
            ref={confirmRef}
            label="Confirm new password"
            icon={Lock}
            password
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            returnKeyType="go"
            onSubmitEditing={handleReset}
          />
          <Button
            label="Update password"
            onPress={handleReset}
            loading={loading}
            disabled={!passwordRecoveryPending && !linkError ? false : Boolean(linkError)}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
