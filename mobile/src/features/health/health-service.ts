import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { HEALTH_UNAVAILABLE_MESSAGE, type HealthReadResult, type HealthWindow } from './health-model';
import { readHealthKitDay } from './healthkit-reader';
import { readHealthConnectDay } from './healthconnect-reader';

type Reader = (window: HealthWindow, isCurrent: () => boolean) => Promise<HealthReadResult>;
type Environment = { os: string; storeClient: boolean; load: (os: string) => Promise<Reader> };
// Health Connect owns shared native permission launchers. A dismissed JS sheet
// cannot cancel that dialog, so all later requests wait for it to settle.
let nativeQueue: Promise<unknown> = Promise.resolve();
export function loadHealthReader(environment: Environment): Reader {
  return (window, isCurrent) => {
    const unavailable = (message: string): HealthReadResult => ({ status: 'unavailable', provider: environment.os === 'ios' ? 'Apple Health' : environment.os === 'android' ? 'Health Connect' : 'Health', window, measurements: [], issues: [], message });
    if (!['ios', 'android'].includes(environment.os)) return Promise.resolve(unavailable(HEALTH_UNAVAILABLE_MESSAGE));
    if (environment.storeClient) return Promise.resolve(unavailable(HEALTH_UNAVAILABLE_MESSAGE));
    const operation = nativeQueue.then(async () => {
      if (!isCurrent()) return unavailable('Health review was closed.');
      let read: Reader;
      try { read = await environment.load(environment.os); }
      catch { return unavailable(HEALTH_UNAVAILABLE_MESSAGE); }
      if (!isCurrent()) return unavailable('Health review was closed.');
      // Query/permission errors remain retryable read errors, not missing-module claims.
      return read(window, isCurrent);
    });
    // Retain only completion in the global queue, never a fulfilled health result.
    nativeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  };
}
export const readHealthDay = loadHealthReader({
  os: Platform.OS,
  storeClient: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  load: async os => {
    if (os === 'ios') {
      const client = await import('@kingstinct/react-native-healthkit');
      return (window, isCurrent) => readHealthKitDay(client, window, isCurrent);
    }
    const client = await import('react-native-health-connect');
    return (window, isCurrent) => readHealthConnectDay(client, window, isCurrent);
  },
});
