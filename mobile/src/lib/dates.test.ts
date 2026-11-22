import { calendarDaysEnding, isDateKeyStrict, localDateString, parseLocalDate } from './dates';

describe('local date helpers', () => {
  it('formats the device-local calendar date without UTC rollover', () => {
    const localDate = new Date(2026, 7, 29, 0, 30);

    expect(localDateString(localDate)).toBe('2026-08-29');
  });

  it('parses a date-only string at local midnight', () => {
    const parsed = parseLocalDate('2026-08-29');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(29);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it.each([
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-00-01', false],
    ['2026-01-00', false],
    ['2026-1-01', false],
    ['2026-01-1', false],
    ['2026-01-01T00:00:00', false],
  ])('strictly validates the calendar date %s', (value, expected) => {
    expect(isDateKeyStrict(value)).toBe(expected);
  });

  it('rejects invalid local dates instead of normalizing them into another month', () => {
    expect(() => parseLocalDate('2026-02-30')).toThrow(RangeError);
  });

  it('builds inclusive windows by local calendar day across the DST transition', () => {
    expect(calendarDaysEnding('2026-03-09', 3)).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
  });

  it('rejects invalid window endpoints and counts', () => {
    expect(() => calendarDaysEnding('2026-02-30', 3)).toThrow(RangeError);
    expect(() => calendarDaysEnding('2026-03-09', -1)).toThrow(RangeError);
    expect(() => calendarDaysEnding('2026-03-09', 1.5)).toThrow(RangeError);
  });
});
