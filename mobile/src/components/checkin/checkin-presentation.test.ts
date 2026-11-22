import {
  CHECK_IN_DAILY_PROMPTS,
  CHECK_IN_STAGE_META,
  getCheckInDailyPrompt,
} from './checkin-presentation';

describe('check-in presentation', () => {
  it('returns stable supplemental copy for the same local date', () => {
    expect(getCheckInDailyPrompt('2026-08-31')).toBe(getCheckInDailyPrompt('2026-08-31'));
    expect(CHECK_IN_DAILY_PROMPTS).toContain(getCheckInDailyPrompt('2026-08-31'));
  });

  it('cycles deterministically without changing stage names', () => {
    expect(new Set(Array.from({ length: 14 }, (_, offset) =>
      getCheckInDailyPrompt(`2026-09-${String(offset + 1).padStart(2, '0')}`),
    )).size).toBeGreaterThan(1);
    expect(CHECK_IN_STAGE_META.readiness.title).toBe('Readiness');
    expect(CHECK_IN_STAGE_META.recovery.title).toBe('Recovery');
    expect(CHECK_IN_STAGE_META.adherence.title).toBe('Training & nutrition');
    expect(CHECK_IN_STAGE_META.finish.title).toBe('Review');
  });
});
