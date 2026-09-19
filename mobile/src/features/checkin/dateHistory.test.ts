import { processCheckInHistory } from '@/lib/checkin-utils';
import { buildCheckInDateHistory, localCheckInDays } from './dateHistory';
import { EMPTY_FORM, toPayload } from './model';
import type { CheckInOutboxItem } from './checkInOutbox';
const today = new Date(2026, 8, 16);
it('exposes queued and blocked first-use days without any server rows', () => {
  const rows = buildCheckInDateHistory([], [{ date: '2026-09-10', status: 'queued' }, { date: '2026-08-01', status: 'blocked' }], today);
  expect(rows.map(({ dateString, inRange, label }) => ({ dateString, inRange, label }))).toEqual([
    { dateString: '2026-09-10', inRange: true, label: 'Saved on this device · waiting to sync' },
    { dateString: '2026-08-01', inRange: true, label: 'Saved on this device · needs attention' },
  ]);
});
it('enables queued backfill before the first server record without enabling other older dates', () => {
  const processed = processCheckInHistory([{ ...toPayload(EMPTY_FORM, '2026-09-14'), id: 'server', user_id: 'u' }]);
  const original = JSON.stringify(processed);
  const rows = buildCheckInDateHistory(processed, [{ date: '2026-09-10', status: 'queued' }, { date: '2025-01-01', status: 'blocked' }], today);
  expect(rows.find((row) => row.dateString === '2026-09-10')).toMatchObject({ inRange: true, label: expect.stringContaining('waiting to sync') });
  expect(rows.find((row) => row.dateString === '2026-09-09')?.inRange).toBe(false);
  expect(rows.find((row) => row.dateString === '2025-01-01')?.inRange).toBe(true);
  expect(JSON.stringify(processed)).toBe(original);
});
it('ignores malformed/future local metadata and keeps the newest local delivery identity', () => {
  expect(buildCheckInDateHistory([], [{ date: '2026-02-30', status: 'queued' }, { date: '2026-09-17', status: 'queued' }], today)).toEqual([]);
  const intent = { payload: toPayload(EMPTY_FORM, '2026-09-10'), failure: { retryable: false, kind: 'permission' } } as CheckInOutboxItem;
  expect(localCheckInDays([intent])).toEqual([{ date: '2026-09-10', status: 'blocked' }]);
});
