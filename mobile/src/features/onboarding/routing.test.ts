import { resolveAppGate } from './routing';

const client = { loading: false, recovery: false, session: true, role: 'client' as const, setupLoading: false, setupError: false, step: 3 };
it('never treats a failed setup read as a new account', () => {
  expect(resolveAppGate({ ...client, setupError: true, step: 0 })).toBe('setup-recovery');
});
it('gives password recovery priority over normal authenticated routing', () => {
  expect(resolveAppGate({ ...client, recovery: true })).toBe('password-recovery');
});
it('requires a known client role before rendering client routes', () => {
  expect(resolveAppGate({ ...client, role: null })).toBe('role-recovery');
  expect(resolveAppGate({ ...client, role: 'coach' })).toBe('client-only');
  expect(resolveAppGate({ ...client, role: 'admin' })).toBe('client-only');
});
it('routes only acknowledged milestones to Home', () => {
  expect(resolveAppGate({ ...client, step: 2 })).toBe('setup');
  expect(resolveAppGate(client)).toBe('home');
  expect(resolveAppGate({ ...client, session: false })).toBe('sign-in');
});
