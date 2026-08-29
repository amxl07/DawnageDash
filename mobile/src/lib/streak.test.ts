import type { ProcessedCheckIn } from './checkin-utils';
import { buildWeekStrip } from './streak';

function checkIn(dateString: string): ProcessedCheckIn {
  const [year, month, day] = dateString.split('-').map(Number);
  return {
    date: new Date(year, (month ?? 1) - 1, day),
    dateString,
    dayNumber: 1,
    status: 'done',
  };
}

describe('buildWeekStrip', () => {
  it('marks today even when today is already complete', () => {
    const today = new Date(2026, 7, 26, 12);
    const result = buildWeekStrip([checkIn('2026-08-26')], today);

    expect(result.find((day) => day.dateString === '2026-08-26')).toMatchObject({
      isToday: true,
      state: 'done',
    });
  });

  it('marks an uncompleted injected today as pending', () => {
    const result = buildWeekStrip([], new Date(2026, 7, 26, 12));

    expect(result.find((day) => day.dateString === '2026-08-26')).toMatchObject({
      isToday: true,
      state: 'today-pending',
    });
  });

  it('marks an earlier uncompleted day as missed', () => {
    const result = buildWeekStrip([], new Date(2026, 7, 26, 12));

    expect(result.find((day) => day.dateString === '2026-08-25')).toMatchObject({
      isToday: false,
      state: 'missed',
    });
  });

  it('marks a later day as disabled future', () => {
    const result = buildWeekStrip([], new Date(2026, 7, 26, 12));

    expect(result.find((day) => day.dateString === '2026-08-27')).toMatchObject({
      isToday: false,
      state: 'future',
    });
  });

  it('derives Monday-through-Sunday bounds from the injected date across a year boundary', () => {
    const result = buildWeekStrip([], new Date(2027, 0, 1, 12));

    expect(result.map((day) => day.dateString)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
    expect(result[4]).toMatchObject({ isToday: true, state: 'today-pending' });
  });
});
