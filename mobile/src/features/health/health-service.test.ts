import { loadHealthReader } from './health-service';
import { readHealthConnectDay, type HealthConnectClient } from './healthconnect-reader';
import { healthDayWindow } from './health-model';
const window = healthDayWindow('2026-09-24', new Date(2026, 8, 25));
it.each([['web', false], ['ios', true], ['android', true]])('does not load native runtime on %s, store client=%s', async (os, storeClient) => {
  const load = jest.fn();
  const reader = loadHealthReader({ os: os as string, storeClient: storeClient as boolean, load });
  const result = await reader(window, () => true);
  expect(load).not.toHaveBeenCalled(); expect(result.status).toBe('unavailable');
});
it('identifies a missing linked native module without calling it denied access', async () => {
  const reader = loadHealthReader({ os: 'ios', storeClient: false, load: async () => { throw new Error('Missing native module'); } });
  const result = await reader(window, () => true);
  expect(result.status).toBe('unavailable'); expect(result.message).toBe('Health import is unavailable in this version of Dawnage. Continue entering values manually.');
});
it('serializes native requests and drops a cancelled queued request before loading it', async () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const native = jest.fn(async () => { await wait; return { status: 'empty' as const, provider: 'Health', window, measurements: [], issues: [] }; });
  const load = jest.fn(async () => native);
  const read = loadHealthReader({ os: 'ios', storeClient: false, load });
  const first = read(window, () => true);
  let active = true;
  const second = read(window, () => active);
  await Promise.resolve(); await Promise.resolve(); active = false; release(); await Promise.all([first, second]);
  expect(load).toHaveBeenCalledTimes(1); expect(native).toHaveBeenCalledTimes(1);
});

it('reports an unlinked HC binary when module loading succeeds but the first native accessor throws', async () => {
  const nativeProxy = new Proxy({} as { getSdkStatus: () => Promise<number> }, { get() {
    throw new Error("The package 'react-native-health-connect' doesn't seem to be linked. Make sure: \n\n- You rebuilt the app after installing the package\n- You are not using Expo Go\n");
  } });
  const initialize = jest.fn();
  const requestPermission = jest.fn();
  const client = { getSdkStatus: () => nativeProxy.getSdkStatus(), initialize, requestPermission } as unknown as HealthConnectClient;
  const reader = loadHealthReader({ os: 'android', storeClient: false, load: async () => (day, active) => readHealthConnectDay(client, day, active) });
  const result = await reader(window, () => true);
  expect(result.status).toBe('unavailable');
  expect(result.retryable).toBe(false);
  expect(result.message).toBe('Health import is unavailable in this version of Dawnage. Continue entering values manually.');
  expect(initialize).not.toHaveBeenCalled();
  expect(requestPermission).not.toHaveBeenCalled();
});
it.each(['provider', 'permission'])('does not classify a real HC %s failure as an unlinked binary', async failure => {
  const error = new Error(failure === 'provider' ? 'Provider service is unavailable' : 'Permission request failed');
  const client = {
    getSdkStatus: async () => { if (failure === 'provider') throw error; return 3; },
    initialize: async () => true,
    requestPermission: async () => { throw error; },
  } as unknown as HealthConnectClient;
  const reader = loadHealthReader({ os: 'android', storeClient: false, load: async () => (day, active) => readHealthConnectDay(client, day, active) });
  await expect(reader(window, () => true)).rejects.toBe(error);
});
