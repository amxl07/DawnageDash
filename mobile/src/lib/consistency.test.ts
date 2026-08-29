import type { ProcessedCheckIn } from './checkin-utils';
import { buildConsistencyHistory } from './consistency';

function checkIn(
  dateString: string,
  workoutStatus?: string | null,
): ProcessedCheckIn {
  const [year, month, day] = dateString.split('-').map(Number);
  return {
    date: new Date(year, (month ?? 1) - 1, day),
    dateString,
    dayNumber: 1,
    status: 'done',
    originalCheckIn: workoutStatus === undefined ? undefined : {
      id: dateString,
      user_id: 'user',
      date: dateString,
      workout_status: workoutStatus,
    },
  };
}

describe('buildConsistencyHistory', () => {
  it('builds newest-first accessible history without future dates', () => {
    const processed = [
      checkIn('2026-08-29', 'done'),
      checkIn('2026-08-28', 'cardio'),
      checkIn('2026-08-27', 'rest'),
      checkIn('2026-08-26'),
    ];

    const result = buildConsistencyHistory(processed, new Date(2026, 7, 29), 8);

    expect(result[0]).toEqual(expect.objectContaining({
      dateString: '2026-08-29',
      level: 4,
      label: 'workout done',
    }));
    expect(result.every((item) => item.dateString <= '2026-08-29')).toBe(true);
    expect(result.map((item) => item.dateString)).toEqual([...result]
      .map((item) => item.dateString)
      .sort()
      .reverse());
  });

  it('preserves the status levels used by the visual grid', () => {
    const processed = [
      checkIn('2026-08-29', 'done'),
      checkIn('2026-08-28', 'cardio'),
      checkIn('2026-08-27', 'rest'),
      checkIn('2026-08-26'),
    ];

    const result = buildConsistencyHistory(processed, new Date(2026, 7, 29), 1);

    expect(result.slice(0, 4).map(({ level, label }) => ({ level, label }))).toEqual([
      { level: 4, label: 'workout done' },
      { level: 3, label: 'cardio' },
      { level: 2, label: 'rest day' },
      { level: 1, label: 'checked in, no training' },
    ]);
  });
});
