import { checkInCompletionDestination } from './completion-next-step';

const current = { date: '2026-09-20', today: '2026-09-20', status: 'synced' as const, assignedPlanReady: true, localReady: true, hasRecovery: false };

it('offers the assigned plan only after a current check-in is confirmed', () => {
  expect(checkInCompletionDestination(current)).toBe('training');
});
it.each([
  { date: '2026-09-19' }, { status: 'queued' as const },
  { assignedPlanReady: false }, { localReady: false }, { hasRecovery: true },
])('keeps the recovery-aware Home destination for %o', (patch) => {
  expect(checkInCompletionDestination({ ...current, ...patch })).toBe('home');
});
