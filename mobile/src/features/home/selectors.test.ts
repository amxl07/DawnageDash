import { buildWeekRecords, observedMean, recentRecordSummary, recentWeightSummary } from './selectors';
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

describe('Home progress endpoints', () => {
  it('compares the latest valid reporting date with the previous observation across gaps', () => {
    expect(recentWeightSummary([
      { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: '72.4' },
      { ...fixtureDailyCheckIn, date: '2026-09-16', morning_weight: 71 },
      { ...fixtureDailyCheckIn, date: '2026-08-01', morning_weight: 75 },
      { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: null },
      { ...fixtureDailyCheckIn, date: '2026-09-10', morning_weight: 73 },
      { ...fixtureDailyCheckIn, date: '2026-09-31', morning_weight: 69 },
      { ...fixtureDailyCheckIn, date: 'not-a-date', morning_weight: 68 },
    ], '2026-09-15')).toEqual({
      latest: { date: '2026-09-14', value: 72.4 },
      previous: { date: '2026-09-10', value: 73 },
    });
  });

  it.each([null, '', ' ', '72kg', 'NaN', Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 19.9, 400.1])(
    'does not use an unreportable weight (%s) as a progress endpoint', (morning_weight) => {
      expect(recentWeightSummary([
        { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: 72.4 },
        { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight },
      ], '2026-09-15')).toEqual({
        latest: { date: '2026-09-14', value: 72.4 },
        previous: null,
      });
    },
  );

  it('retains both allowed weight boundaries', () => {
    expect(recentWeightSummary([
      { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: 20 },
      { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: '400' },
    ], '2026-09-15')).toEqual({
      latest: { date: '2026-09-15', value: 400 },
      previous: { date: '2026-09-14', value: 20 },
    });
  });

  it('does not invent a value or comparison when no valid weight exists', () => {
    expect(recentWeightSummary([], '2026-09-15')).toBeNull();
    expect(recentWeightSummary([
      { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: null },
      { ...fixtureDailyCheckIn, date: '2026-09-16', morning_weight: 72.4 },
    ], '2026-09-15')).toBeNull();
  });

  it('never compares two observations assigned to the same reporting day', () => {
    expect(recentWeightSummary([
      { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: 72.4 },
      { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: 72.4 },
    ], '2026-09-15')?.previous).toBeNull();
  });
});
