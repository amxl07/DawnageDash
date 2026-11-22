import { resolveWorkoutEntry } from './workout-entry';
const ready = { explicitLogId: null, records: [], recordsFailed: false, draft: null, draftFailed: false, planReady: true, hasAssignedPlan: true };
it('refuses an explicit missing log even with another record and a plan', () => {
  expect(resolveWorkoutEntry({ ...ready, explicitLogId: 'requested', records: [{ id: 'other' }] })).toEqual({ kind: 'error', reason: 'missing-log' });
});
it('waits for the plan before seeding a new session', () => {
  expect(resolveWorkoutEntry({ ...ready, planReady: false })).toEqual({ kind: 'loading' });
});
it('requires a choice for multiple same-date rows', () => {
  expect(resolveWorkoutEntry({ ...ready, records: [{ id: 'a' }, { id: 'b' }] })).toEqual({ kind: 'choose-log', ids: ['a', 'b'] });
});
it('does not confuse unreadable storage with an absent draft', () => {
  expect(resolveWorkoutEntry({ ...ready, draftFailed: true })).toEqual({ kind: 'error', reason: 'draft-unreadable' });
});
it('keeps unresolved and failed remote inputs explicit', () => {
  expect(resolveWorkoutEntry({ ...ready, records: undefined })).toEqual({ kind: 'loading' });
  expect(resolveWorkoutEntry({ ...ready, records: undefined, recordsFailed: true })).toEqual({ kind: 'error', reason: 'unavailable' });
});
it('restores matching edits before a plan and never restores an unrelated explicit draft', () => {
  const draft = { workoutTitle: 'Local', exercises: [], savedAt: 1, selectedPlanId: '1', existingLogId: 'a' };
  expect(resolveWorkoutEntry({ ...ready, explicitLogId: 'a', records: [{ id: 'a' }], draft, planReady: false })).toEqual({ kind: 'ready', source: 'draft' });
  expect(resolveWorkoutEntry({ ...ready, explicitLogId: 'b', records: [{ id: 'b' }], draft })).toEqual({ kind: 'ready', source: 'server' });
});
