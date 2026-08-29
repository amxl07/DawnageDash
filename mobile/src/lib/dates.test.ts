import { localDateString, parseLocalDate } from './dates';

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
});
