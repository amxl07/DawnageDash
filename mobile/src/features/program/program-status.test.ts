import { resolveProgramStatus } from './program-status';

const empty = { today: '2026-09-20', startDate: null, checkInDates: [], pendingDates: [], ready: true };

it('keeps a new account unstarted until a check-in is submitted', () => {
  expect(resolveProgramStatus(empty)).toEqual({ kind: 'not-started' });
});
it('does not treat unavailable history as a new program', () => {
  expect(resolveProgramStatus({ ...empty, ready: false })).toEqual({ kind: 'unknown' });
});
it('keeps the first offline submission pending rather than confirming Day 1', () => {
  expect(resolveProgramStatus({ ...empty, pendingDates: ['2026-09-19'] })).toEqual({ kind: 'pending', date: '2026-09-19' });
});
it('uses the acknowledged start date even when the coach or records arrive later', () => {
  expect(resolveProgramStatus({ ...empty, startDate: '2026-09-15', checkInDates: ['2026-09-18'] })).toEqual({ kind: 'active', startDate: '2026-09-15', day: 6 });
});
it('recognizes existing check-ins even when the profile fallback is unavailable', () => {
  expect(resolveProgramStatus({ ...empty, checkInDates: ['2026-09-19', '2026-09-17'], ready: false })).toEqual({ kind: 'active', startDate: '2026-09-17', day: 4 });
});
it('does not invent a first day from an invalid or future profile date', () => {
  expect(resolveProgramStatus({ ...empty, startDate: '2026-02-30' })).toEqual({ kind: 'unknown' });
  expect(resolveProgramStatus({ ...empty, startDate: '2026-10-01' })).toEqual({ kind: 'unknown' });
});
