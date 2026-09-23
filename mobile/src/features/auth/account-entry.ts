export const VERIFICATION_RESEND_COOLDOWN_MS = 60_000;

type AuthError = { message: string };

type SignUpInput = {
  email: string;
  password: string;
  options: { data: { full_name: string; role: 'client' } };
};

type ResendInput = { type: 'signup'; email: string };

export type AccountAuthClient = {
  signUp: (input: SignUpInput) => PromiseLike<{
    data: { session: unknown | null };
    error: AuthError | null;
  }>;
  resend: (input: ResendInput) => PromiseLike<{
    data: unknown;
    error: AuthError | null;
  }>;
};

export type AccountEntryValues = {
  fullName: string;
  email: string;
  password: string;
};

export type AccountEntryErrors = Partial<Record<keyof AccountEntryValues, string>>;

export type AccountEntryResult =
  | { kind: 'invalid'; errors: AccountEntryErrors }
  | { kind: 'error'; message: string }
  | { kind: 'verification-required'; email: string }
  | { kind: 'authenticated' };

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateAccountEntry(values: AccountEntryValues): AccountEntryErrors {
  const errors: AccountEntryErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Please enter your full name.';
  if (!validEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

/** Turns provider errors into copy that is safe and useful in the account UI. */
export function friendlyAuthError(error: unknown): string {
  const message = typeof error === 'string'
    ? error
    : typeof (error as { message?: unknown } | null)?.message === 'string'
      ? (error as { message: string }).message
      : '';
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return "That email or password doesn't match.";
  if (normalized.includes('email not confirmed')) return 'Please confirm your email first — check your inbox.';
  if (normalized.includes('already registered') || normalized.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (
    normalized.includes('rate limit') ||
    normalized.includes('security purposes') ||
    normalized.includes('too many requests')
  ) {
    return 'Please wait a moment before requesting another email.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'Check your connection and try again.';
  }
  return 'We couldn’t complete that request. Please try again.';
}

export async function submitAccountEntry(
  auth: AccountAuthClient,
  values: AccountEntryValues,
): Promise<AccountEntryResult> {
  const errors = validateAccountEntry(values);
  if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };

  const email = values.email.trim();
  try {
    const { data, error } = await auth.signUp({
      email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          role: 'client',
        },
      },
    });
    if (error) return { kind: 'error', message: friendlyAuthError(error) };
    return data.session
      ? { kind: 'authenticated' }
      : { kind: 'verification-required', email };
  } catch (error) {
    return { kind: 'error', message: friendlyAuthError(error) };
  }
}

export type VerificationRequestGate = {
  inFlight: boolean;
  retryAt: number;
};

export function createVerificationRequestGate(retryAt = 0): VerificationRequestGate {
  return { inFlight: false, retryAt };
}

export type VerificationRequestResult =
  | { kind: 'locked' }
  | { kind: 'cooldown'; retryAt: number }
  | { kind: 'error'; message: string }
  | { kind: 'sent'; retryAt: number };

export async function requestVerificationEmail(
  auth: AccountAuthClient,
  email: string,
  gate: VerificationRequestGate,
  now = Date.now(),
): Promise<VerificationRequestResult> {
  if (gate.inFlight) return { kind: 'locked' };
  if (now < gate.retryAt) return { kind: 'cooldown', retryAt: gate.retryAt };

  gate.inFlight = true;
  try {
    const { error } = await auth.resend({ type: 'signup', email: email.trim() });
    if (error) return { kind: 'error', message: friendlyAuthError(error) };
    gate.retryAt = now + VERIFICATION_RESEND_COOLDOWN_MS;
    return { kind: 'sent', retryAt: gate.retryAt };
  } catch (error) {
    return { kind: 'error', message: friendlyAuthError(error) };
  } finally {
    gate.inFlight = false;
  }
}
