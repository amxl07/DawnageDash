export type DemoSession = {
  email: 'demo@dawnage.local';
  mode: 'demo';
};

export type ConnectedSession = {
  email: string;
  mode: 'connected';
  serverUrl: string;
  token: string;
};

export type AppSession = DemoSession | ConnectedSession;

export type RestoreStatus = 'ready' | 'restoring';

export class MfaRequiredError extends Error {
  readonly code = 'mfa-required';

  constructor() {
    super('This account requires multi-factor authentication, which is not supported yet.');
    this.name = 'MfaRequiredError';
  }
}
