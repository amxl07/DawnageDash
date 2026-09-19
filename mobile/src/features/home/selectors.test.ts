import { buildWeekRecords, observedMean, recentRecordSummary } from './selectors';
import { fixtureDailyCheckIn } from '@/testing/redesignFixtures';

describe('Today Brief selectors', () => {
  it('keeps missing observations distinct from a reported zero', () => {
    expect(observedMean([null, null])).toEqual({ value: null, samples: 0 });
    expect(observedMean([0, null, 4, Number.NaN])).toEqual({ value: 2, samples: 2 });
  });

  it('overlays pending delivery once per date without inventing reported days', () => {
    expect(buildWeekRecords(['2026-09-14', '2026-09-15', '2026-09-16'], [
      { date: '2026-09-14', state: 'synced' },
      { date: '2026-09-15', state: 'synced' },
      { date: '2026-09-15', state: 'queued' },
    ])).toEqual([
      { date: '2026-09-14', state: 'synced' },
      { date: '2026-09-15', state: 'queued' },
      { date: '2026-09-16', state: 'absent' },
    ]);
  });

  it('uses calendar coverage rather than the last seven records', () => {
    const summary = recentRecordSummary([
      { ...fixtureDailyCheckIn, date: '2026-08-01', sleep_hours: 1 },
      { ...fixtureDailyCheckIn, date: '2026-09-10', sleep_hours: '7' },
      { ...fixtureDailyCheckIn, date: '2026-09-14', sleep_hours: '8', morning_weight: 72 },
      { ...fixtureDailyCheckIn, date: '2026-09-15', sleep_hours: null, morning_weight: null },
      { ...fixtureDailyCheckIn, date: '2026-09-16', sleep_hours: 24 },
    ], '2026-09-15');
    expect(summary.sleep).toEqual({ value: 7.5, samples: 2 });
    expect(summary.from).toBe('2026-09-09');
    expect(summary.to).toBe('2026-09-15');
    expect(summary.latestWeight?.date).toBe('2026-09-14');
    expect(summary.weightPoints.slice(-3)).toEqual([
      { date: '2026-09-13', value: null },
      { date: '2026-09-14', value: 72 },
      { date: '2026-09-15', value: null },
    ]);
  });
});
