import {
  createVerificationRequestGate,
  requestVerificationEmail,
  submitAccountEntry,
  type AccountAuthClient,
} from './account-entry';

const validValues = {
  fullName: '  Maya Singh  ',
  email: '  maya@example.test  ',
  password: 'strong-enough',
};

function authClient(overrides: Partial<AccountAuthClient> = {}): AccountAuthClient {
  return {
    signUp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    resend: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    ...overrides,
  };
}

describe('submitAccountEntry', () => {
  it.each([
    [{ ...validValues, fullName: '  ' }, { fullName: 'Please enter your full name.' }],
    [{ ...validValues, email: 'not-an-email' }, { email: 'Enter a valid email address.' }],
    [{ ...validValues, password: 'short' }, { password: 'Password must be at least 6 characters.' }],
  ])('rejects invalid account details without contacting auth', async (values, expectedErrors) => {
    const auth = authClient();

    await expect(submitAccountEntry(auth, values)).resolves.toEqual({
      kind: 'invalid',
      errors: expectedErrors,
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('submits only durable account metadata and reports that verification is required', async () => {
    const auth = authClient();

    await expect(submitAccountEntry(auth, validValues)).resolves.toEqual({
      kind: 'verification-required',
      email: 'maya@example.test',
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'maya@example.test',
      password: 'strong-enough',
      options: { data: { full_name: 'Maya Singh', role: 'client' } },
    });
  });

  it('reports an authenticated signup when Supabase returns a session', async () => {
    const session = { access_token: 'session-token' };
    const auth = authClient({
      signUp: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    });

    await expect(submitAccountEntry(auth, validValues)).resolves.toEqual({
      kind: 'authenticated',
    });
  });
});

describe('requestVerificationEmail', () => {
  it('locks duplicate resend requests while the first request is unresolved', async () => {
    let finish!: (value: { data: { user: null; session: null }; error: null }) => void;
    const pending = new Promise<{ data: { user: null; session: null }; error: null }>((resolve) => {
      finish = resolve;
    });
    const auth = authClient({ resend: jest.fn().mockReturnValue(pending) });
    const gate = createVerificationRequestGate();

    const first = requestVerificationEmail(auth, 'maya@example.test', gate, 1_000);
    await expect(requestVerificationEmail(auth, 'maya@example.test', gate, 1_000)).resolves.toEqual({
      kind: 'locked',
    });
    expect(auth.resend).toHaveBeenCalledTimes(1);

    finish({ data: { user: null, session: null }, error: null });
    await expect(first).resolves.toEqual({ kind: 'sent', retryAt: 61_000 });
  });

  it('releases the request lock after an error so the person can retry', async () => {
    const resend = jest
      .fn()
      .mockResolvedValueOnce({ data: { user: null, session: null }, error: new Error('network unavailable') })
      .mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
    const auth = authClient({ resend });
    const gate = createVerificationRequestGate();

    await expect(requestVerificationEmail(auth, 'maya@example.test', gate, 1_000)).resolves.toEqual({
      kind: 'error',
      message: 'Check your connection and try again.',
    });
    await expect(requestVerificationEmail(auth, 'maya@example.test', gate, 2_000)).resolves.toEqual({
      kind: 'sent',
      retryAt: 62_000,
    });
    expect(resend).toHaveBeenCalledTimes(2);
  });

  it('blocks another backend request until the successful-send cooldown expires', async () => {
    const auth = authClient();
    const gate = createVerificationRequestGate();

    await requestVerificationEmail(auth, 'maya@example.test', gate, 1_000);

    await expect(requestVerificationEmail(auth, 'maya@example.test', gate, 31_000)).resolves.toEqual({
      kind: 'cooldown',
      retryAt: 61_000,
    });
    expect(auth.resend).toHaveBeenCalledTimes(1);
  });
});
