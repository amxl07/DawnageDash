import type { Permission } from 'react-native-health-connect';
import { finishHealthRead, HEALTH_FIELDS, HEALTH_UNAVAILABLE_MESSAGE, normalizeMeasurement, selectMorningWeight, type HealthField, type HealthIssue, type HealthMeasurement, type HealthReadResult, type HealthWindow } from './health-model';

export type HealthConnectClient = Pick<typeof import('react-native-health-connect'), 'getSdkStatus' | 'initialize' | 'requestPermission' | 'readRecords' | 'aggregateRecord'>;
export const HEALTH_CONNECT_READ_PERMISSIONS: Permission[] = ['Weight', 'Steps', 'Nutrition', 'Hydration'].map(recordType => ({ accessType: 'read', recordType } as Permission));
const recordFields = { Weight: ['morningWeight'], Steps: ['dailySteps'], Nutrition: ['calorieIntake', 'protein', 'carbs', 'fats'], Hydration: ['waterLiters'] } as const;

export async function readHealthConnectDay(hc: HealthConnectClient, window: HealthWindow, isCurrent = () => true): Promise<HealthReadResult> {
  const provider = 'Health Connect';
  const unavailable = (message: string): HealthReadResult => ({ provider, window, status: 'unavailable', measurements: [], issues: [], message, retryable: true });
  let status: number;
  try { status = await hc.getSdkStatus(); }
  catch (error) {
    // HC 4.1.3 can import successfully while its NativeModules fallback is a
    // throwing proxy. Only its exact missing-link error means this binary is
    // unavailable; actual provider/permission/query errors keep their own path.
    if (error instanceof Error && error.message.startsWith("The package 'react-native-health-connect' doesn't seem to be linked.")) {
      return { ...unavailable(HEALTH_UNAVAILABLE_MESSAGE), retryable: false };
    }
    throw error;
  }
  if (status !== 3) return unavailable(status === 2 ? 'Install or update Health Connect on this device, then retry.' : 'Health Connect is not available on this device. You can enter your check-in manually.');
  if (!isCurrent()) return unavailable('Health review was closed.');
  if (!await hc.initialize()) return unavailable('Health Connect could not start. Open the provider, then retry.');
  if (!isCurrent()) return unavailable('Health review was closed.');
  const permissions = await hc.requestPermission(HEALTH_CONNECT_READ_PERMISSIONS);
  const granted = new Set(permissions.filter(p => p.accessType === 'read').map(p => p.recordType));
  const measurements: HealthMeasurement[] = [];
  const issues: HealthIssue[] = [];
  const timeRangeFilter = { operator: 'between' as const, startTime: window.start.toISOString(), endTime: window.end.toISOString() };
  const add = (field: HealthField, raw: unknown, origins: string[], nutrition = false) => {
    if (!origins.length) { issues.push({ field, kind: 'empty', message: 'No accessible records for this day.' }); return; }
    // HC 4.1.3 serializes missing nutrition as zero, even with real meal origins.
    if (nutrition && raw === 0) { issues.push({ field, kind: 'ambiguous-zero', message: 'Health Connect cannot distinguish a missing nutrient from zero. Enter a confirmed zero manually.' }); return; }
    const value = normalizeMeasurement(field, raw);
    if (value === null) issues.push({ field, kind: 'invalid', message: 'No valid total within the check-in range. Check the source or enter manually.' });
    else measurements.push({ field, value, sources: origins });
  };
  if (isCurrent()) await Promise.all((Object.keys(recordFields) as (keyof typeof recordFields)[]).map(async recordType => {
    const fields = recordFields[recordType];
    if (!granted.has(recordType)) { fields.forEach(field => issues.push({ field, kind: 'denied', message: 'Read access is off for this measurement.' })); return; }
    try {
      if (recordType === 'Weight') {
        let pageToken: string | undefined;
        const seenTokens = new Set<string>();
        do {
          const page = await hc.readRecords('Weight', { timeRangeFilter: { ...timeRangeFilter, endTime: window.morningEnd.toISOString() }, ascendingOrder: false, pageSize: 1000, ...(pageToken ? { pageToken } : {}) });
          const weight = selectMorningWeight(page.records.map(r => ({ value: r.weight?.inKilograms, time: new Date(r.time), sources: r.metadata?.dataOrigin ? [r.metadata.dataOrigin] : [provider] })), window);
          if (weight) { measurements.push(weight); return; }
          pageToken = page.pageToken ?? undefined;
          if (pageToken && seenTokens.has(pageToken)) throw new Error('Repeated page');
          if (pageToken) seenTokens.add(pageToken);
        } while (pageToken && isCurrent());
        issues.push({ field: 'morningWeight', kind: 'empty', message: 'No accessible valid weight observation before local noon.' });
      } else if (recordType === 'Steps') {
        const total = await hc.aggregateRecord({ recordType, timeRangeFilter });
        const origins = total.dataOrigins ?? [];
        const hasRecords = total.COUNT_TOTAL !== 0 || !origins.length || (await hc.readRecords('Steps', { timeRangeFilter, pageSize: 1 })).records.length > 0;
        add('dailySteps', total.COUNT_TOTAL, hasRecords ? origins : []);
      } else if (recordType === 'Hydration') {
        const total = await hc.aggregateRecord({ recordType, timeRangeFilter });
        const origins = total.dataOrigins ?? [];
        const hasRecords = total.VOLUME_TOTAL?.inLiters !== 0 || !origins.length || (await hc.readRecords('Hydration', { timeRangeFilter, pageSize: 1 })).records.length > 0;
        add('waterLiters', total.VOLUME_TOTAL?.inLiters, hasRecords ? origins : []);
      } else {
        const total = await hc.aggregateRecord({ recordType, timeRangeFilter });
        add('calorieIntake', total.ENERGY_TOTAL?.inKilocalories, total.dataOrigins ?? [], true);
        add('protein', total.PROTEIN_TOTAL?.inGrams, total.dataOrigins ?? [], true);
        add('carbs', total.TOTAL_CARBOHYDRATE_TOTAL?.inGrams, total.dataOrigins ?? [], true);
        add('fats', total.TOTAL_FAT_TOTAL?.inGrams, total.dataOrigins ?? [], true);
      }
    } catch { fields.forEach(field => issues.push({ field, kind: 'error', message: 'This measurement could not be read. Access may have changed or this date may be outside the accessible history. Retry or enter it manually.' })); }
  }));
  // Preserve the form's familiar order even when native reads finish out of order.
  measurements.sort((a, b) => HEALTH_FIELDS.indexOf(a.field) - HEALTH_FIELDS.indexOf(b.field));
  return finishHealthRead(provider, window, measurements, issues, 'No accessible records for this date. Check your source apps, permissions and accessible history, or enter values manually.');
}
