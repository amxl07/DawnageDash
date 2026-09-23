import { legacyLogsDestination, resolveTrainingView } from './training-navigation';

describe('training navigation contracts', () => {
  it('opens Training on Plan unless History is explicitly requested', () => {
    expect(resolveTrainingView(undefined)).toBe('plan');
    expect(resolveTrainingView('plan')).toBe('plan');
    expect(resolveTrainingView('history')).toBe('history');
    expect(resolveTrainingView(['history', 'plan'])).toBe('history');
    expect(resolveTrainingView('nutrition')).toBe('plan');
  });

  it('moves the legacy Logs route to History without dropping workout recovery identity', () => {
    expect(legacyLogsDestination({
      date: '2026-09-10',
      logId: 'log-7',
      outboxId: 'user-1:2026-09-10',
      ignored: 'value',
    })).toEqual({
      pathname: '/(app)/(tabs)/plans',
      params: {
        view: 'history',
        date: '2026-09-10',
        logId: 'log-7',
        outboxId: 'user-1:2026-09-10',
      },
    });
  });
});
