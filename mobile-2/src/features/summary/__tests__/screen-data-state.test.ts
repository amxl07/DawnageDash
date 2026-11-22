import { getOfflineColdStartState } from '@/features/summary/screen-data-state';

describe('getOfflineColdStartState', () => {
  it('marks an offline query without cached data as unavailable instead of loading', () => {
    expect(getOfflineColdStartState({ hasData: false, isOnline: false, mode: 'connected' })).toBe('unavailable');
  });

  it('keeps cached offline data renderable', () => {
    expect(getOfflineColdStartState({ hasData: true, isOnline: false, mode: 'connected' })).toBe('data');
  });

  it('does not block the local demo while offline', () => {
    expect(getOfflineColdStartState({ hasData: false, isOnline: false, mode: 'demo' })).toBe('data');
  });

  it('marks connected Insights without any cached days as unavailable offline', () => {
    expect(getOfflineColdStartState({ hasData: false, isOnline: false, mode: 'connected' })).toBe('unavailable');
  });
});
