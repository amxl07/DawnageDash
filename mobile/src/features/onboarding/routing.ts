export function resolveAppGate(input: {
  loading: boolean; recovery: boolean; session: boolean;
  role: 'client' | 'coach' | 'admin' | null;
  setupLoading: boolean; setupError: boolean; step: number;
}) {
  if (input.loading) return 'loading';
  if (input.recovery) return 'password-recovery';
  if (!input.session) return 'sign-in';
  if (!input.role) return 'role-recovery';
  if (input.role !== 'client') return 'client-only';
  if (input.setupLoading) return 'loading';
  if (input.setupError) return 'setup-recovery';
  return input.step < 3 ? 'setup' : 'home';
}
