import { readHealthKitDay, type HealthKitClient } from './healthkit-reader';
import { readHealthConnectDay, type HealthConnectClient } from './healthconnect-reader';
import { healthDayWindow } from './health-model';
const window = healthDayWindow('2026-09-24', new Date(2026, 8, 25, 10));
const hk = (patch: object = {}) => ({
  isHealthDataAvailable: () => true,
  requestAuthorization: jest.fn(async () => true),
  queryQuantitySamples: jest.fn(async () => []),
  queryStatisticsCollectionForQuantity: jest.fn(async () => []), ...patch,
} as unknown as HealthKitClient);
const hc = (patch: object = {}) => ({
  getSdkStatus: async () => 3, initialize: async () => true,
  requestPermission: jest.fn(async () => [{ accessType: 'read', recordType: 'Steps' }, { accessType: 'read', recordType: 'Nutrition' }, { accessType: 'read', recordType: 'Hydration' }, { accessType: 'read', recordType: 'Weight' }]),
  aggregateRecord: jest.fn(async () => ({ dataOrigins: [] })),
  readRecords: jest.fn(async () => ({ records: [] })), ...patch,
} as unknown as HealthConnectClient);
it('Apple uses read-only dietary types and the combined native day bucket with requested units', async () => {
  const client = hk({ queryStatisticsCollectionForQuantity: jest.fn(async (id: string, _s: unknown, _a: unknown, _i: unknown, options: { unit: string }) => [{ startDate: new Date(2026, 8, 23), sumQuantity: { quantity: 9000 } }, { startDate: window.start, sumQuantity: { quantity: id.endsWith('DietaryWater') ? 1.5 : 100, unit: options.unit }, sources: [{ name: 'Watch', bundleIdentifier: 'test.watch' }] }]) });
  const result = await readHealthKitDay(client, window);
  expect(client.requestAuthorization).toHaveBeenCalledWith({ toRead: expect.arrayContaining(['HKQuantityTypeIdentifierDietaryEnergyConsumed']), toShare: [] });
  expect(JSON.stringify((client.requestAuthorization as jest.Mock).mock.calls)).not.toMatch(/Burned|ActiveEnergy|BasalEnergy/);
  expect(result.measurements.find(m => m.field === 'dailySteps')?.value).toBe(100);
  expect(result.measurements.find(m => m.field === 'waterLiters')?.value).toBe(1.5);
  expect(result.measurements[0].sources).toContain('Watch (test.watch)');
});
it('Apple dialog completion does not claim read access or turn empty records into zero', async () => {
  const result = await readHealthKitDay(hk(), window);
  expect(result.status).toBe('empty');
  expect(result.measurements).toEqual([]);
  expect(result.message).toMatch(/no records|read access/i);
});
it('keeps other Apple measurements when one native query fails', async () => {
  const client = hk({ queryStatisticsCollectionForQuantity: async (id: string) => { if (id.endsWith('StepCount')) throw Error('locked'); return [{ startDate: window.start, sumQuantity: { quantity: 0 }, sources: [] }]; } });
  const result = await readHealthKitDay(client, window);
  expect(result.measurements.some(m => m.field === 'protein' && m.value === 0)).toBe(true);
  expect(result.issues.some(i => i.field === 'dailySteps' && i.kind === 'error')).toBe(true);
});
it('Health Connect reads only granted types and preserves partial access', async () => {
  const client = hc({ requestPermission: async () => [{ recordType: 'Steps', accessType: 'read' }], aggregateRecord: jest.fn(async () => ({ COUNT_TOTAL: 3210, dataOrigins: ['fictional.phone'] })) });
  const result = await readHealthConnectDay(client, window);
  expect(client.aggregateRecord).toHaveBeenCalledTimes(1);
  expect(client.aggregateRecord).toHaveBeenCalledWith({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: window.start.toISOString(), endTime: window.end.toISOString() } });
  expect(client.readRecords).not.toHaveBeenCalled();
  expect(result.measurements).toEqual([{ field: 'dailySteps', value: 3210, sources: ['fictional.phone'] }]);
  expect(result.issues.some(i => i.kind === 'denied')).toBe(true);
});
it('normalizes kilocalories/litres/grams and omits HC ambiguous zero nutrition', async () => {
  const client = hc({ aggregateRecord: async ({ recordType }: { recordType: string }) => recordType === 'Nutrition' ? { dataOrigins: ['fictional.food'], ENERGY_TOTAL: { inKilocalories: 520, inCalories: 520000 }, PROTEIN_TOTAL: { inGrams: 0 }, TOTAL_CARBOHYDRATE_TOTAL: { inGrams: 70.4 }, TOTAL_FAT_TOTAL: { inGrams: 0 } } : recordType === 'Hydration' ? { dataOrigins: ['fictional.water'], VOLUME_TOTAL: { inLiters: 1.25 } } : { dataOrigins: [], COUNT_TOTAL: 0 } });
  const result = await readHealthConnectDay(client, window);
  expect(result.measurements).toEqual(expect.arrayContaining([{ field: 'calorieIntake', value: 520, sources: ['fictional.food'] }, { field: 'waterLiters', value: 1.25, sources: ['fictional.water'] }, { field: 'carbs', value: 70, sources: ['fictional.food'] }]));
  expect(result.measurements.some(m => ['protein', 'fats', 'dailySteps'].includes(m.field))).toBe(false);
  expect(result.issues.some(i => i.kind === 'ambiguous-zero')).toBe(true);
});
it('continues weight pagination past an invalid newest observation', async () => {
  const client = hc({ readRecords: jest.fn().mockResolvedValueOnce({ records: [{ time: new Date(2026, 8, 24, 11).toISOString(), weight: { inKilograms: 900 } }], pageToken: 'next' }).mockResolvedValueOnce({ records: [{ time: new Date(2026, 8, 24, 7).toISOString(), weight: { inKilograms: 74.3 }, metadata: { dataOrigin: 'fictional.scale' } }], pageToken: null }) });
  const result = await readHealthConnectDay(client, window);
  expect(result.measurements.find(m => m.field === 'morningWeight')).toEqual({ field: 'morningWeight', value: 74.3, observedAt: new Date(2026, 8, 24, 7), sources: ['fictional.scale'] });
  expect(client.readRecords).toHaveBeenCalledTimes(2);
});
it.each([1, 2])('honestly reports unavailable/update provider state %s without permission prompts', async status => {
  const client = hc({ getSdkStatus: async () => status }); const result = await readHealthConnectDay(client, window);
  expect(result.status).toBe('unavailable'); expect(client.requestPermission).not.toHaveBeenCalled();
  if (status === 2) expect(result.message).toMatch(/install|update/i);
});
it('represents declined Health Connect access without fabricated zeros', async () => {
  const client = hc({ requestPermission: async () => [] }); const result = await readHealthConnectDay(client, window);
  expect(result.status).toBe('denied'); expect(result.measurements).toEqual([]); expect(client.aggregateRecord).not.toHaveBeenCalled();
});
it('does not accept an HC zero aggregate without a real single-metric record', async () => {
  const client = hc({ requestPermission: async () => [{ accessType: 'read', recordType: 'Steps' }], aggregateRecord: async () => ({ COUNT_TOTAL: 0, dataOrigins: ['fictional.phone'] }), readRecords: async () => ({ records: [] }) });
  const result = await readHealthConnectDay(client, window);
  expect(result.measurements).toEqual([]);
});
it('can retain an HC recorded zero step count after verifying a sample exists', async () => {
  const client = hc({ requestPermission: async () => [{ accessType: 'read', recordType: 'Steps' }], aggregateRecord: async () => ({ COUNT_TOTAL: 0, dataOrigins: ['fictional.phone'] }), readRecords: async () => ({ records: [{ count: 0 }] }) });
  const result = await readHealthConnectDay(client, window);
  expect(result.measurements).toEqual([{ field: 'dailySteps', value: 0, sources: ['fictional.phone'] }]);
});
