import {
  CHECK_IN_STAGE_META,
} from './checkin-presentation';

describe('check-in presentation', () => {
  it('names the daily check-in groups', () => {
    expect(CHECK_IN_STAGE_META.readiness.title).toBe('Morning');
    expect(CHECK_IN_STAGE_META.recovery.title).toBe('Your day');
    expect(CHECK_IN_STAGE_META.adherence.title).toBe('Training & nutrition');
    expect(CHECK_IN_STAGE_META.finish.title).toBe('Review');
  });
});
