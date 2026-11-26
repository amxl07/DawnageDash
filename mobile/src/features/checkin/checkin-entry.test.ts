import { resolveCheckInEntry } from './checkin-entry';

const today = '2026-09-24';
it('keeps an ordinary tab visit in the hub', () => {
  expect(resolveCheckInEntry({}, today)).toEqual({ destination: 'hub' });
});
it('hands an explicit legacy date to the focused editor', () => {
  expect(resolveCheckInEntry({ date: '2026-09-20', history: '1' }, today)).toEqual({ destination: 'editor', params: { date: '2026-09-20', history: '1' } });
});
it('opens an explicit edit request on the current local day', () => {
  expect(resolveCheckInEntry({ edit: '1' }, today)).toEqual({ destination: 'editor', params: { date: today } });
});
it.each(['bad-date', ['2026-09-20', '2026-09-21']])('preserves invalid date input for visible editor validation', (date) => {
  expect(resolveCheckInEntry({ date }, today)).toEqual({ destination: 'editor', params: { date } });
});
it('allows history without starting an editable draft', () => {
  expect(resolveCheckInEntry({ history: '1' }, today)).toEqual({ destination: 'hub', history: true });
});
