import { finishHealthRead, normalizeMeasurement, selectMorningWeight, type HealthField, type HealthIssue, type HealthMeasurement, type HealthReadResult, type HealthWindow } from './health-model';

export type HealthKitClient = Pick<typeof import('@kingstinct/react-native-healthkit'), 'isHealthDataAvailable' | 'requestAuthorization' | 'queryQuantitySamples' | 'queryStatisticsCollectionForQuantity'>;
const TOTALS = [
  { field: 'dailySteps', identifier: 'HKQuantityTypeIdentifierStepCount', unit: 'count' },
  { field: 'calorieIntake', identifier: 'HKQuantityTypeIdentifierDietaryEnergyConsumed', unit: 'kcal' },
  { field: 'waterLiters', identifier: 'HKQuantityTypeIdentifierDietaryWater', unit: 'L' },
  { field: 'protein', identifier: 'HKQuantityTypeIdentifierDietaryProtein', unit: 'g' },
  { field: 'carbs', identifier: 'HKQuantityTypeIdentifierDietaryCarbohydrates', unit: 'g' },
  { field: 'fats', identifier: 'HKQuantityTypeIdentifierDietaryFatTotal', unit: 'g' },
] as const;
export const HEALTHKIT_READ_TYPES = ['HKQuantityTypeIdentifierBodyMass', ...TOTALS.map(t => t.identifier)] as const;
const empty = 'No accessible records. There may be no records for this date, or read access may be off or limited.';
const sourceNames = (sources: readonly { name: string; bundleIdentifier: string }[]) => sources.map(s => `${s.name} (${s.bundleIdentifier})`);

/** Runtime SDK loading lives in health-service; this module has only erased SDK types. */
export async function readHealthKitDay(hk: HealthKitClient, window: HealthWindow, isCurrent = () => true): Promise<HealthReadResult> {
  const provider = 'Apple Health';
  if (!hk.isHealthDataAvailable()) return { provider, window, status: 'unavailable', measurements: [], issues: [], message: 'Apple Health is not available on this device.' };
  // Completion is not evidence of read grants: HealthKit deliberately hides those.
  const completed = await hk.requestAuthorization({ toRead: HEALTHKIT_READ_TYPES, toShare: [] });
  if (!completed || !isCurrent()) return { provider, window, status: 'empty', measurements: [], issues: [], message: 'Access review was not completed. You can try again.', retryable: true };
  const measurements: HealthMeasurement[] = [];
  const issues: HealthIssue[] = [];
  const addIssue = (field: HealthField, kind: HealthIssue['kind'], message: string) => issues.push({ field, kind, message });
  const jobs = [
    (async () => {
      try {
        const samples = await hk.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { limit: 0, ascending: false, unit: 'kg', filter: { date: { startDate: window.start, endDate: window.morningEnd, strictStartDate: true, strictEndDate: true } } });
        const weight = selectMorningWeight(samples.map(s => ({ value: s.quantity, time: s.startDate, sources: s.sourceRevision?.source ? sourceNames([s.sourceRevision.source]) : [provider] })), window);
        if (weight) measurements.push(weight);
        else addIssue('morningWeight', 'empty', 'No accessible valid weight observation before local noon.');
      } catch { addIssue('morningWeight', 'error', 'Morning weight could not be read. Retry after unlocking your device.'); }
    })(),
    ...TOTALS.map(async ({ field, identifier, unit }) => {
      try {
        // Combined native daily statistics handle overlapping devices. Never add per-source totals.
        const buckets = await hk.queryStatisticsCollectionForQuantity(identifier, ['cumulativeSum'], window.start, { day: 1 }, { unit, filter: { date: { startDate: window.start, endDate: window.end } } });
        const bucket = buckets.find(s => s.startDate?.getTime() === window.start.getTime());
        const raw = bucket?.sumQuantity?.quantity;
        const value = normalizeMeasurement(field, raw);
        if (value !== null) measurements.push({ field, value, sources: bucket?.sources?.length ? sourceNames(bucket.sources) : [provider] });
        else addIssue(field, raw == null ? 'empty' : 'invalid', raw == null ? 'No accessible total for this day.' : 'The recorded total is outside the check-in range. Enter it manually after checking it.');
      } catch { addIssue(field, 'error', 'This total could not be read. Retry after unlocking your device.'); }
    }),
  ];
  await Promise.all(jobs);
  return finishHealthRead(provider, window, measurements, issues, empty);
}
