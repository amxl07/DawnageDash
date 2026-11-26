import { CircleCheck, Lock, Mail, User, UserRoundCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { DawnGlow, Logo } from '@/components/brand';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import {
  createVerificationRequestGate,
  friendlyAuthError,
  requestVerificationEmail,
  submitAccountEntry,
  validEmail,
  VERIFICATION_RESEND_COOLDOWN_MS,
  type AccountEntryErrors,
} from '@/features/auth/account-entry';
import { requestPasswordReset } from '@/lib/password-reset';
import { supabase } from '@/lib/supabase';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp' | 'forgot';
type Sent =
  | { kind: 'verification'; email: string }
  | { kind: 'reset'; email: string }
  | null;

export default function LoginScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [sent, setSent] = useState<Sent>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AccountEntryErrors>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendRetryAt, setResendRetryAt] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const submission = useRef(false);
  const requestGeneration = useRef(0);
  const verificationGate = useRef(createVerificationRequestGate());

  useEffect(() => {
    const message = formError || resendMessage || Object.values(fieldErrors).filter(Boolean).join(' ');
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [fieldErrors, formError, resendMessage]);

  useEffect(() => {
    if (sent?.kind !== 'verification' || resendRetryAt <= clockNow) return;
    const timer = setInterval(() => setClockNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [clockNow, resendRetryAt, sent?.kind]);

  const switchMode = (next: Mode) => {
    // Supabase can publish a session before its promise resolves. Keep one
    // session-changing request in flight across every account-entry mode.
    if (submission.current) return;
    requestGeneration.current += 1;
    setMode(next);
    setSent(null);
    setLoading(false);
    setResendLoading(false);
    setFormError(null);
    setFieldErrors({});
    setResendMessage(null);
    setPassword('');
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
  };

  const handleSignIn = async () => {
    if (submission.current) return;
    const errors: AccountEntryErrors = {};
    if (!validEmail(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    submission.current = true;
    const generation = ++requestGeneration.current;
    setLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (generation !== requestGeneration.current) return;
      if (error) throw error;
      // AuthLayout observes the session and performs the authenticated redirect.
    } catch (error) {
      if (generation === requestGeneration.current) setFormError(friendlyAuthError(error));
    } finally {
      if (generation === requestGeneration.current) {
        submission.current = false;
        setLoading(false);
      }
    }
  };

  const handleSignUp = async () => {
    if (submission.current) return;
    submission.current = true;
    const generation = ++requestGeneration.current;
    setLoading(true);
    setFormError(null);
    try {
      const result = await submitAccountEntry(supabase.auth, { fullName, email, password });
      if (generation !== requestGeneration.current) return;
      if (result.kind === 'invalid') {
        setFieldErrors(result.errors);
        if (result.errors.fullName) nameRef.current?.focus();
        else if (result.errors.email) emailRef.current?.focus();
        else passwordRef.current?.focus();
        return;
      }
      if (result.kind === 'error') {
        setFormError(result.message);
        return;
      }
      if (result.kind === 'authenticated') {
        setPassword('');
        // Supabase emitted a session; AuthLayout owns the redirect.
        return;
      }

      setEmail(result.email);
      setPassword('');
      const now = Date.now();
      const retryAt = now + VERIFICATION_RESEND_COOLDOWN_MS;
      verificationGate.current = createVerificationRequestGate(retryAt);
      setClockNow(now);
      setResendRetryAt(retryAt);
      setResendMessage(null);
      setSent({ kind: 'verification', email: result.email });
    } finally {
      if (generation === requestGeneration.current) {
        submission.current = false;
        setLoading(false);
      }
    }
  };

  const handleForgot = async () => {
    if (submission.current) return;
    if (!validEmail(email)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      emailRef.current?.focus();
      return;
    }

    submission.current = true;
    const generation = ++requestGeneration.current;
    setLoading(true);
    setFormError(null);
    try {
      const normalizedEmail = email.trim();
      const { error } = await requestPasswordReset(supabase.auth, normalizedEmail);
      if (generation !== requestGeneration.current) return;
      if (error) throw error;
      setEmail(normalizedEmail);
      setSent({ kind: 'reset', email: normalizedEmail });
    } catch (error) {
      if (generation === requestGeneration.current) setFormError(friendlyAuthError(error));
    } finally {
      if (generation === requestGeneration.current) {
        submission.current = false;
        setLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (sent?.kind !== 'verification') return;
    const generation = requestGeneration.current;
    setResendLoading(true);
    setResendMessage(null);
    const result = await requestVerificationEmail(
      supabase.auth,
      sent.email,
      verificationGate.current,
    );
    if (generation !== requestGeneration.current) return;
    if (result.kind === 'locked') return;
    if (result.kind === 'error') setResendMessage(result.message);
    if (result.kind === 'sent') {
      setResendRetryAt(result.retryAt);
      setClockNow(Date.now());
      setResendMessage('A new verification email is on its way.');
    }
    if (result.kind === 'cooldown') setResendRetryAt(result.retryAt);
    if (generation === requestGeneration.current) setResendLoading(false);
  };

  if (sent?.kind === 'verification') {
    const secondsRemaining = Math.max(0, Math.ceil((resendRetryAt - clockNow) / 1_000));
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DawnGlow height={300} />
        <Screen>
          <View style={{ paddingTop: spacing.xl, gap: spacing.xl }}>
            <Logo variant="wordmark" size={128} />
            <MotionReveal revision="verification" style={{ gap: spacing.lg }}>
              <View
                accessible
                accessibilityRole="summary"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mail size={iconSize.xl} color={colors.primary} strokeWidth={2} accessible={false} />
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text variant="h1" accessibilityRole="header">Verify your email</Text>
                <Text variant="body" tone="muted">
                  Open the link sent to <Text>{sent.email}</Text>, then return here.
                </Text>
              </View>
              {resendMessage ? (
                <Text
                  variant="bodySm"
                  tone={resendMessage.startsWith('A new') ? 'success' : 'destructive'}
                  accessibilityLiveRegion="polite"
                >
                  {resendMessage}
                </Text>
              ) : null}
              <View style={{ gap: spacing.sm }}>
                <Button
                  label={secondsRemaining > 0 ? `Resend in ${secondsRemaining}s` : 'Resend verification email'}
                  variant="secondary"
                  onPress={handleResend}
                  loading={resendLoading}
                  disabled={secondsRemaining > 0}
                  accessibilityHint="Requests another verification link for this email address"
                />
                <Button
                  label="Use a different email"
                  variant="ghost"
                  accessibilityHint="Returns to account creation. This does not edit the pending account."
                  disabled={loading}
                  onPress={() => switchMode('signUp')}
                />
                <Text variant="bodySm" tone="muted">A different email starts a new account request; it won&apos;t change this pending account.</Text>
                <Button label="Back to sign in" variant="ghost" disabled={loading} onPress={() => switchMode('signIn')} />
              </View>
              <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                Still waiting? Check spam or promotions.
              </Text>
            </MotionReveal>
          </View>
        </Screen>
      </View>
    );
  }

  if (sent?.kind === 'reset') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DawnGlow height={280} />
        <Screen>
          <View style={{ paddingTop: spacing['2xl'], gap: spacing.lg, alignItems: 'center' }}>
            <CircleCheck size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
            <Text variant="h1" accessibilityRole="header">Check your email</Text>
            <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
              We sent a password reset link to {sent.email}. Open it on this device to set a new password.
            </Text>
            <Button label="Back to sign in" disabled={loading} onPress={() => switchMode('signIn')} style={{ alignSelf: 'stretch' }} />
            <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
              Didn&apos;t get it? Check your spam folder.
            </Text>
          </View>
        </Screen>
      </View>
    );
  }

  const heading = mode === 'forgot' ? 'Reset your password.' : mode === 'signUp' ? 'Create your account.' : 'Welcome back.';


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DawnGlow height={340} />
        <Screen>
          <View style={{ paddingTop: spacing.base }}>
            <Logo variant="wordmark" size={128} />
          </View>

          <MotionReveal revision={mode} style={{ gap: spacing.xl }}>
            <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
              <Text variant="display" accessibilityRole="header" style={{ letterSpacing: -1 }}>{heading}</Text>
              {mode === 'forgot' ? <Text variant="body" tone="muted">Enter your email and we’ll send a reset link.</Text> : null}
            </View>

            {mode === 'signUp' ? (
              <Card
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                }}
              >
                <UserRoundCheck size={iconSize.lg} color={colors.primary} strokeWidth={2} accessible={false} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="label">Your pace, your start</Text>
                  <Text variant="bodySm" tone="muted">
                    Your coach can connect after you join. Day 1 begins with your first submitted daily check-in—start before assignment or wait for your coach.
                  </Text>
                </View>
              </Card>
            ) : null}

            <View style={{ gap: spacing.base }}>
              {formError ? (
                <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{formError}</Text>
              ) : null}

              {mode === 'signUp' ? (
                <Input
                  ref={nameRef}
                  label="Full name"
                  icon={User}
                  value={fullName}
                  editable={!loading}
                  onChangeText={(value) => {
                    setFullName(value);
                    if (fieldErrors.fullName) setFieldErrors((current) => ({ ...current, fullName: undefined }));
                  }}
                  error={fieldErrors.fullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  placeholder="Your full name"
                />
              ) : null}

              <Input
                ref={emailRef}
                testID="login-email"
                label="Email"
                icon={Mail}
                value={email}
                editable={!loading}
                onChangeText={updateEmail}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType={mode === 'forgot' ? 'send' : 'next'}
                onSubmitEditing={() => mode === 'forgot' ? handleForgot() : passwordRef.current?.focus()}
                placeholder="name@example.com"
              />

              {mode !== 'forgot' ? (
                <Input
                  ref={passwordRef}
                  testID="login-password"
                  label="Password"
                  icon={Lock}
                  password
                  value={password}
                  editable={!loading}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  error={fieldErrors.password}
                  hint={mode === 'signUp' ? 'At least 6 characters' : undefined}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                  returnKeyType="go"
                  onSubmitEditing={mode === 'signUp' ? handleSignUp : handleSignIn}
                  placeholder={mode === 'signUp' ? 'At least 6 characters' : 'Enter your password'}
                />
              ) : null}

              {mode === 'signIn' ? (
                <Button label="Forgot password?" variant="text" disabled={loading} onPress={() => switchMode('forgot')} />
              ) : null}

              <Button
                label={mode === 'signUp' ? 'Create my account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
                onPress={mode === 'signUp' ? handleSignUp : mode === 'forgot' ? handleForgot : handleSignIn}
                loading={loading}
              />


              <Button
                testID={mode === 'signIn' ? 'login-create-account' : undefined}
                label={
                  mode === 'signUp'
                    ? 'Already have an account? Sign in'
                    : mode === 'forgot'
                      ? 'Back to sign in'
                      : 'New to Dawnage? Create an account'
                }
                variant="ghost"
                disabled={loading}
                onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              />
            </View>
          </MotionReveal>
        </Screen>
      </View>
    </KeyboardAvoidingView>
  );
}
