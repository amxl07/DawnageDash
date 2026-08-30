import { ArrowLeft, ChevronDown, Lock, Mail, Phone, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import { DawnGlow, Logo } from '@/components/brand';
import { CountryPicker, type Country } from '@/components/auth/CountryPicker';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { HIT_SLOP_MIN, iconSize, radius, spacing, type, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp' | 'forgot';
type Sent = null | 'verification' | 'reset';

/** Supabase messages are for developers; these are for people. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return "That email or password doesn't match.";
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox.';
  if (m.includes('already registered')) return 'An account with this email already exists.';
  if (m.includes('network') || m.includes('fetch')) return 'Check your connection and try again.';
  return message;
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [step, setStep] = useState<1 | 2>(1);
  const [sent, setSent] = useState<Sent>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const reset = (next: Mode) => {
    setMode(next);
    setStep(1);
    setSent(null);
    setFormError(null);
    setFieldErrors({});
  };

  // ── confirmation screens ───────────────────────────────────────────────────
  if (sent) {
    const isVerification = sent === 'verification';
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DawnGlow />
        <Screen>
          <View style={{ paddingTop: spacing['2xl'], gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Mail size={iconSize.xl} color={colors.primary} strokeWidth={2} accessible={false} />
            <Text variant="h1">Check your email</Text>
            <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
              {isVerification
                ? `We've sent a verification link to ${email}. Confirm it to access your account.`
                : `We've sent a password reset link to ${email}. Open it on this device to set a new password.`}
            </Text>
          </View>
          <Button label="Back to sign in" onPress={() => reset('signIn')} />
          <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            Didn&apos;t get it? Check your spam folder.
          </Text>
          </View>
        </Screen>
      </View>
    );
  }

  // ── actions ────────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Please enter your full name.';
    if (!country) errs.country = 'Please select your country.';
    if (!phoneNumber.trim()) errs.phone = 'Please enter your phone number.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async () => {
    setLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // The (auth) layout redirects on session; nothing to do here.
    } catch (e) {
      setFormError(friendlyError((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    const errs: Record<string, string> = {};
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            // Web parity: stored as one combined string (Login.tsx:131).
            phone_number: `${countryCode}${phoneNumber}`,
            country: country?.country ?? '',
            role: 'client',
          },
        },
      });
      if (error) throw error;
      setSent('verification');
    } catch (e) {
      setFormError(friendlyError((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: 'Please enter your email address.' });
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'dawnage://reset-password',
      });
      if (error) throw error;
      setSent('reset');
    } catch (e) {
      setFormError(friendlyError((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === 'forgot'
      ? 'Reset password'
      : mode === 'signUp'
        ? step === 1
          ? "Let's get started"
          : 'Secure your account'
        : 'Welcome back';

  const subheading =
    mode === 'forgot'
      ? "Enter your email and we'll send you a reset link"
      : mode === 'signUp'
        ? step === 1
          ? 'Tell us a bit about yourself'
          : 'Create your credentials'
        : 'Enter your credentials to access your account';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DawnGlow />
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: spacing['2xl'] }}>
          {/* The mark carries the brand; the heading below carries the task. */}
          <Logo variant="lockup" size={196} />
        </View>

        <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing['2xl'] }}>
          <Text variant="h1">{heading}</Text>
          <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            {subheading}
          </Text>
        </View>

        <Card style={{ marginTop: spacing.lg, gap: spacing.base }}>
          {mode === 'forgot' ? (
            <>
              <Input
                label="Email"
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleForgot}
                placeholder="name@example.com"
              />
              <Button label="Send reset link" onPress={handleForgot} loading={loading} />
              <Button label="Back to sign in" variant="ghost" onPress={() => reset('signIn')} />
            </>
          ) : mode === 'signUp' && step === 1 ? (
            <>
              <Input
                label="Full name"
                icon={User}
                value={fullName}
                onChangeText={setFullName}
                error={fieldErrors.fullName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                placeholder="John Doe"
              />

              <View style={{ gap: spacing.xs }}>
                <Text variant="label" tone="muted">
                  Country
                </Text>
                <Pressable
                  onPress={() => setCountryOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Select country"
                  accessibilityValue={{ text: country?.country ?? 'None selected' }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minHeight: HIT_SLOP_MIN + 4,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: fieldErrors.country ? colors.destructive : colors.borderStrong,
                    backgroundColor: colors.elevated,
                  }}
                >
                  {country ? (
                    <>
                      <Text style={{ fontSize: 20 }}>{country.flag}</Text>
                      <Text style={{ flex: 1 }}>{country.country}</Text>
                      <Text tone="muted" numeric>
                        {country.code}
                      </Text>
                    </>
                  ) : (
                    <Text tone="muted" style={{ flex: 1 }}>
                      Select your country…
                    </Text>
                  )}
                  <ChevronDown size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                </Pressable>
                {fieldErrors.country ? (
                  <Text variant="bodySm" tone="primary">
                    {fieldErrors.country}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text variant="label" tone="muted">
                  Phone number
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 84,
                      justifyContent: 'center',
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.elevated,
                    }}
                  >
                    <TextInput
                      value={countryCode}
                      onChangeText={setCountryCode}
                      placeholder="+00"
                      placeholderTextColor={colors.mutedForeground}
                      accessibilityLabel="Country dial code"
                      keyboardType="phone-pad"
                      style={[type.body, { color: colors.foreground, textAlign: 'center' }]}
                    />
                  </View>
                  <Input
                    ref={phoneRef}
                    containerStyle={{ flex: 1 }}
                    label=""
                    icon={Phone}
                    value={phoneNumber}
                    onChangeText={(t) => setPhoneNumber(t.replace(/\D/g, ''))}
                    error={fieldErrors.phone}
                    keyboardType="phone-pad"
                    placeholder="Enter your number"
                  />
                </View>
                <Text variant="bodySm" tone="muted">
                  Used by your coach to contact you.
                </Text>
              </View>

              <Button
                label="Continue"
                onPress={() => {
                  if (validateStep1()) setStep(2);
                }}
              />
            </>
          ) : (
            <>
              <Input
                testID="login-email"
                label="Email"
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="name@example.com"
              />
              <Input
                ref={passwordRef}
                testID="login-password"
                label="Password"
                icon={Lock}
                password
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                returnKeyType={mode === 'signUp' ? 'next' : 'go'}
                onSubmitEditing={() =>
                  mode === 'signUp' ? confirmRef.current?.focus() : handleSignIn()
                }
                placeholder={mode === 'signUp' ? 'Create a password' : 'Enter your password'}
              />

              {mode === 'signUp' ? (
                <Input
                  ref={confirmRef}
                  label="Confirm password"
                  icon={Lock}
                  password
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={fieldErrors.confirmPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleSignUp}
                  placeholder="Re-enter password"
                />
              ) : (
                <Pressable
                  onPress={() => reset('forgot')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot your password?"
                  style={{ alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' }}
                >
                  <Text variant="bodySm" tone="primary">
                    Forgot?
                  </Text>
                </Pressable>
              )}

              {formError ? (
                <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                  {formError}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {mode === 'signUp' ? (
                  <Button
                    label="Back"
                    variant="secondary"
                    icon={<ArrowLeft size={iconSize.md} color={colors.primary} strokeWidth={2} />}
                    onPress={() => setStep(1)}
                    style={{ width: 110 }}
                  />
                ) : null}
                <Button
                  label={mode === 'signUp' ? 'Create my account' : 'Sign in'}
                  onPress={mode === 'signUp' ? handleSignUp : handleSignIn}
                  loading={loading}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </Card>

        {mode !== 'forgot' ? (
          <Button
            label={mode === 'signUp' ? 'Already have an account? Sign in' : 'New to Dawnage? Create an account'}
            variant="ghost"
            onPress={() => reset(mode === 'signUp' ? 'signIn' : 'signUp')}
            style={{ marginTop: spacing.base }}
          />
        ) : null}
      </Screen>
      </View>

      <CountryPicker
        visible={countryOpen}
        onClose={() => setCountryOpen(false)}
        selected={country}
        onSelect={(c) => {
          setCountry(c);
          setCountryCode(c.code);
          setFieldErrors((p) => ({ ...p, country: '' }));
        }}
      />
    </KeyboardAvoidingView>
  );
}
