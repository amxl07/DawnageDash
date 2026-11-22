/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render } from '@testing-library/react-native';
import LoginScreen from '../../../app/(auth)/login';

const mockSignUp = jest.fn();
const mockResend = jest.fn();
const mockSignIn = jest.fn();
const mockResetPassword = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  },
}));
jest.mock('@/lib/password-reset', () => ({
  requestPasswordReset: (...args: unknown[]) => mockResetPassword(...args),
}));
jest.mock('@/components/brand', () => ({ DawnGlow: () => null, Logo: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({
  MotionReveal: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  CircleCheck: () => null,
  Lock: () => null,
  Mail: () => null,
  User: () => null,
  UserRoundCheck: () => null,
}));
jest.mock('@/theme', () => {
  const tokens = jest.requireActual('@/theme/tokens');
  const colors = jest.requireActual('@/theme/colors').dark;
  return { ...tokens, useTheme: () => ({ colors, isDark: true, shadow: { card: {} } }) };
});
jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    // Native presses dispatch async work without waiting for its network response.
    Button: ({ label, onPress, disabled, loading, testID }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; testID?: string }) => (
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }} disabled={disabled || loading} onPress={() => { void onPress(); }}>
        <Text>{label}</Text>
      </Pressable>
    ),
    Card: View,
    Input: React.forwardRef(function MockInput({ label, error, ...props }: { label: string; error?: string } & Record<string, unknown>, ref: React.Ref<unknown>) {
      return <View><Text>{label}</Text><TextInput ref={ref} accessibilityLabel={label} {...props} />{error ? <Text>{error}</Text> : null}</View>;
    }),
    Screen: View,
    Text,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
  mockResend.mockResolvedValue({ data: { user: null, session: null }, error: null });
  mockSignIn.mockResolvedValue({ data: { session: null }, error: null });
  mockResetPassword.mockResolvedValue({ data: {}, error: null });
});

async function openCompletedSignup() {
  const view = await render(<LoginScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'New to Dawnage? Create an account' }));
  await fireEvent.changeText(view.getByLabelText('Full name'), 'Maya Singh');
  await fireEvent.changeText(view.getByLabelText('Email'), 'maya@example.test');
  await fireEvent.changeText(view.getByLabelText('Password'), 'strong-enough');
  await fireEvent.press(view.getByRole('button', { name: 'Create my account' }));
  return view;
}

it('keeps signup to name, email, and password and rejects malformed email before auth', async () => {
  const view = await render(<LoginScreen />);
  expect(view.getByTestId('login-create-account')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'New to Dawnage? Create an account' }));

  expect(view.getByLabelText('Full name')).toBeTruthy();
  expect(view.getByLabelText('Email')).toBeTruthy();
  expect(view.getByLabelText('Password')).toBeTruthy();
  expect(view.queryByLabelText('Confirm password')).toBeNull();
  expect(view.queryByLabelText('Phone number')).toBeNull();
  expect(view.queryByLabelText('Select country')).toBeNull();

  await fireEvent.changeText(view.getByLabelText('Full name'), 'Maya Singh');
  await fireEvent.changeText(view.getByLabelText('Email'), 'invalid');
  await fireEvent.changeText(view.getByLabelText('Password'), 'strong-enough');
  await fireEvent.press(view.getByRole('button', { name: 'Create my account' }));

  expect(view.getByText('Enter a valid email address.')).toBeTruthy();
  expect(mockSignUp).not.toHaveBeenCalled();
});

it('keeps non-sensitive account details available when changing an unverified email', async () => {
  const view = await openCompletedSignup();

  expect(view.getByText('Verify your email')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Use a different email' }));

  expect(view.getByLabelText('Full name').props.value).toBe('Maya Singh');
  expect(view.getByLabelText('Email').props.value).toBe('maya@example.test');
  expect(view.getByLabelText('Password').props.value).toBe('');
});

it('ignores a resend response after returning to signup with a different email', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(10_000);
  let finishResend!: (result: { data: { user: null; session: null }; error: null }) => void;
  mockResend.mockReturnValue(new Promise((resolve) => { finishResend = resolve; }));
  try {
    const view = await openCompletedSignup();
    await act(async () => { jest.advanceTimersByTime(60_000); });
    // Start the request without awaiting the intentionally deferred response.
    await fireEvent.press(view.getByRole('button', { name: 'Resend verification email' }));
    await fireEvent.press(view.getByRole('button', { name: 'Use a different email' }));

    await act(async () => {
      finishResend({ data: { user: null, session: null }, error: null });
      await Promise.resolve();
    });

    expect(view.getByText('Start with clarity.')).toBeTruthy();
    expect(view.queryByText('A new verification email is on its way.')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

it('does not show verification when signup returns an authenticated session', async () => {
  mockSignUp.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });
  const view = await openCompletedSignup();

  expect(view.queryByText('Verify your email')).toBeNull();
  expect(view.getByLabelText('Password').props.value).toBe('');
});

it('keeps account entry locked until an in-flight signup finishes', async () => {
  let finishSignup!: (result: { data: { session: null }; error: null }) => void;
  mockSignUp.mockReturnValue(new Promise((resolve) => { finishSignup = resolve; }));
  const view = await render(<LoginScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'New to Dawnage? Create an account' }));
  await fireEvent.changeText(view.getByLabelText('Full name'), 'Maya Singh');
  await fireEvent.changeText(view.getByLabelText('Email'), 'maya@example.test');
  await fireEvent.changeText(view.getByLabelText('Password'), 'strong-enough');
  // Keep signup pending while exercising the mode-change ownership boundary.
  await fireEvent.press(view.getByRole('button', { name: 'Create my account' }));

  expect(view.getByLabelText('Full name').props.editable).toBe(false);
  expect(view.getByLabelText('Email').props.editable).toBe(false);
  expect(view.getByLabelText('Password').props.editable).toBe(false);

  const switchToSignIn = view.getByRole('button', { name: 'Already have an account? Sign in' });
  expect(switchToSignIn.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(switchToSignIn);
  expect(view.getByText('Start with clarity.')).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
  expect(mockSignUp).toHaveBeenCalledTimes(1);

  await act(async () => {
    finishSignup({ data: { session: null }, error: null });
    await Promise.resolve();
  });

  expect(view.getByText('Verify your email')).toBeTruthy();
});

it('preserves the password-reset request and confirmation flow', async () => {
  const view = await render(<LoginScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Forgot password?' }));
  await fireEvent.changeText(view.getByLabelText('Email'), ' maya@example.test ');
  await fireEvent.press(view.getByRole('button', { name: 'Send reset link' }));

  expect(mockResetPassword).toHaveBeenCalledWith(expect.anything(), 'maya@example.test');
  expect(view.getByText('Check your email')).toBeTruthy();
  expect(view.getByText(/Open it on this device to set a new password/)).toBeTruthy();
});

it('shows resend failures and permits a retry after the failed request', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(10_000);
  mockResend
    .mockResolvedValueOnce({ data: { user: null, session: null }, error: new Error('network unavailable') })
    .mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
  try {
    const view = await openCompletedSignup();
    await act(async () => { jest.advanceTimersByTime(60_000); });

    await fireEvent.press(view.getByRole('button', { name: 'Resend verification email' }));
    expect(view.getByText('Check your connection and try again.')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Resend verification email' }));
    expect(mockResend).toHaveBeenCalledTimes(2);
    expect(view.getByText('A new verification email is on its way.')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});


it('prevents another account request while sign-in can still publish its session', async () => {
  let finishSignIn!: () => void;
  let publishedSession: string | null = null;
  mockSignIn.mockImplementation(() => new Promise<void>((resolve) => { finishSignIn = resolve; }).then(() => {
    publishedSession = 'original-account';
    return { data: { session: { user: { id: publishedSession } } }, error: null };
  }));
  const view = await render(<LoginScreen />);
  await fireEvent.changeText(view.getByLabelText('Email'), 'original@example.test');
  await fireEvent.changeText(view.getByLabelText('Password'), 'strong-enough');
  await fireEvent.press(view.getByRole('button', { name: /^Sign in$/ }));
  expect(publishedSession).toBeNull();
  const signup = view.getByRole('button', { name: 'New to Dawnage? Create an account' });
  expect(signup.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(signup);
  await fireEvent.press(view.getByRole('button', { name: /^Sign in$/ }));
  expect(view.queryByLabelText('Full name')).toBeNull();
  expect(mockSignUp).not.toHaveBeenCalled();
  expect(mockSignIn).toHaveBeenCalledTimes(1);
  await act(async () => { finishSignIn(); });
  expect(publishedSession).toBe('original-account');
});
