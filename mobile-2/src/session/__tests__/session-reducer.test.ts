import {
  initialSessionState,
  sessionReducer,
} from '@/session/session-context';

describe('sessionReducer', () => {
  it('finishes restoration with the persisted session and saved server', () => {
    const nextState = sessionReducer(initialSessionState, {
      savedServerUrl: 'https://fitness.example',
      session: {
        email: 'member@example.com',
        mode: 'connected',
        serverUrl: 'https://fitness.example',
        token: 'token-123',
      },
      type: 'restored',
    });

    expect(nextState).toEqual({
      restoreStatus: 'ready',
      savedServerUrl: 'https://fitness.example',
      session: {
        email: 'member@example.com',
        mode: 'connected',
        serverUrl: 'https://fitness.example',
        token: 'token-123',
      },
    });
  });

  it('starts a demo session without clearing the configured server', () => {
    const nextState = sessionReducer(
      {
        restoreStatus: 'ready',
        savedServerUrl: 'https://fitness.example',
        session: null,
      },
      { type: 'demo-entered' },
    );

    expect(nextState).toEqual({
      restoreStatus: 'ready',
      savedServerUrl: 'https://fitness.example',
      session: { email: 'demo@dawnage.local', mode: 'demo' },
    });
  });

  it('preserves a user transition when restoration finishes late', () => {
    const afterEnteringDemo = sessionReducer(initialSessionState, { type: 'demo-entered' });

    const nextState = sessionReducer(afterEnteringDemo, {
      savedServerUrl: 'https://fitness.example',
      session: {
        email: 'member@example.com',
        mode: 'connected',
        serverUrl: 'https://fitness.example',
        token: 'token-123',
      },
      type: 'restored',
    });

    expect(nextState).toEqual({
      restoreStatus: 'ready',
      savedServerUrl: null,
      session: { email: 'demo@dawnage.local', mode: 'demo' },
    });
  });

  it('sets the authenticated connected session after sign-in', () => {
    const nextState = sessionReducer(
      {
        restoreStatus: 'ready',
        savedServerUrl: 'https://fitness.example',
        session: null,
      },
      {
        session: {
          email: 'member@example.com',
          mode: 'connected',
          serverUrl: 'https://fitness.example',
          token: 'token-123',
        },
        type: 'connected',
      },
    );

    expect(nextState.session).toEqual({
      email: 'member@example.com',
      mode: 'connected',
      serverUrl: 'https://fitness.example',
      token: 'token-123',
    });
  });

  it('clears the session while preserving the last validated server', () => {
    const nextState = sessionReducer(
      {
        restoreStatus: 'ready',
        savedServerUrl: 'https://fitness.example',
        session: {
          email: 'member@example.com',
          mode: 'connected',
          serverUrl: 'https://fitness.example',
          token: 'token-123',
        },
      },
      { type: 'signed-out' },
    );

    expect(nextState).toEqual({
      restoreStatus: 'ready',
      savedServerUrl: 'https://fitness.example',
      session: null,
    });
  });
});
