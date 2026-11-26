import { activityContent, canUseNativeSurfaces, nativeSurfaceLinks, workoutIsLive } from './model';

it.each(['dawnage', 'dawnage-dev', 'dawnage-preview'])('uses the configured %s scheme and existing gated routes', (scheme) => {
  expect(nativeSurfaceLinks(scheme)).toEqual({ checkIn: `${scheme}:///daily-check-in`, training: `${scheme}:///plans`, workout: `${scheme}:///logger` });
});
it('does not assume production when configuration is absent or malformed', () => {
  expect(nativeSurfaceLinks(undefined)).toBeNull();
  expect(nativeSurfaceLinks(['dawnage-dev', 'another-app'])?.training).toBe('dawnage-dev:///plans');
  expect(nativeSurfaceLinks('https://elsewhere')).toBeNull();
});
it('only starts for a current unsaved workout, never a saved or queued log', () => {
  const input = { date: '2026-09-25', today: '2026-09-25', ready: true, existingLogId: null, outboxId: undefined, delivery: 'idle', source: 'draft' };
  expect(workoutIsLive(input)).toBe(true);
  for (const change of [{ date: '2026-09-24' }, { existingLogId: 'saved' }, { outboxId: 'queued' }, { delivery: 'queued' }, { source: 'server' }, { ready: false }]) expect(workoutIsLive({ ...input, ...change })).toBe(false);
});
it('keeps only generic set progress and exact rest timestamps in native content', () => {
  const payload = activityContent({ exerciseIndex: 1, exerciseCount: 4, completedSets: 3, totalSets: 12 }, { endsAt: 91_000, pausedRemainingMs: null }, 1_000);
  expect(payload.props).toEqual({ exercise: 2, exerciseCount: 4, completedSets: 3, totalSets: 12, restEndsAt: 91_000, restStartedAt: 1_000, pausedRemainingMs: null });
  expect(payload.staleDate.getTime()).toBe(91_000);
});
it('never emits a negative running timer and expires unattended session claims', () => {
  const state = { exerciseIndex: 0, exerciseCount: 1, completedSets: 0, totalSets: 1 };
  expect(activityContent(state, { endsAt: 999, pausedRemainingMs: null }, 1_000).props.restEndsAt).toBeNull();
  const paused = activityContent(state, { endsAt: null, pausedRemainingMs: 600 }, 1_000);
  expect(paused.props.pausedRemainingMs).toBe(600);
  expect(paused.staleDate.getTime()).toBe(901_000);
});
it.each([
  ['ios', '16.2', false, true, true], ['ios', '16.1', false, true, false],
  ['ios', '26.0', true, true, false], ['ios', '26.0', false, false, false],
  ['android', 36, false, true, false], ['web', '26', false, true, false],
] as const)('guards platform %s / %s / Expo Go %s / binary %s', (platform, version, expoGo, binary, expected) => {
  expect(canUseNativeSurfaces({ platform, version, expoGo, binary })).toBe(expected);
});
