import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Direct imports of production adapters; no React Native or backend fixture setup.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL('../../../../src/' + specifier.slice(2) + '.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { parseMeasurementObservation, buildMeasurementSeries, measurementComparison } =
  await import('../../../../src/features/measurements/observations.ts');
const { recentRecordSummary } = await import('../../../../src/features/home/selectors.ts');

assert.equal(parseMeasurementObservation(null), null);
assert.equal(parseMeasurementObservation(''), null);
assert.equal(parseMeasurementObservation('0'), null);
assert.equal(parseMeasurementObservation('80.5'), 80.5);
const measurements = [
  { date: '2026-09-05', waist: 78 },
  { date: '2026-09-02', waist: null },
  { date: '2026-09-01', waist: 80 },
];
assert.deepEqual(buildMeasurementSeries(measurements, 'waist').map((point) => point.value), [80, null, 78]);
assert.deepEqual(measurementComparison(measurements, 'waist'), {
  baseline: { date: '2026-09-01', value: 80 }, latest: { date: '2026-09-05', value: 78 }, delta: -2,
});
assert.equal(measurementComparison([{ date: '2026-09-05', waist: null }, ...measurements], 'waist').delta, null);
const recent = recentRecordSummary([
  { date: '2026-09-15', morning_weight: null, sleep_hours: 0 },
  { date: '2026-09-14', morning_weight: 72.5, sleep_hours: 8 },
], '2026-09-15');
assert.equal(recent.latestWeight.value, 72.5);
assert.equal(recent.weightPoints.at(-1).value, null);
assert.equal(recent.sleep.value, 4);
assert.equal(recent.sleep.samples, 2);
console.log('Direct measurement/Home smoke: 11 assertions passed.');
