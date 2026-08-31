import { getQueryNetworkMode } from '@/query/query-network-mode';

describe('getQueryNetworkMode', () => {
  it('runs local demo queries even when the device is offline', () => {
    expect(getQueryNetworkMode('demo')).toBe('always');
  });

  it('pauses connected server queries while offline', () => {
    expect(getQueryNetworkMode('connected')).toBe('online');
  });
});
