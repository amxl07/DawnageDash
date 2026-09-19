import assert from 'node:assert/strict';
import { buildTimeSeriesGeometry, nearestDatedPointIndex } from '../../../../src/components/charts/timeSeries.ts';

// A lightweight direct smoke check when the full React Native runner is unavailable.
const bounds = { width: 320, height: 100, insetX: 10, insetY: 10, min: 70, max: 80 };
const result = buildTimeSeriesGeometry([
  { date: '2026-09-01', value: 75 },
  { date: '2026-09-02', value: null },
  { date: '2026-09-05', value: 73 },
], bounds);
assert.equal(result.points.length, 2);
assert.equal(result.segments.length, 2);
assert.equal(result.points[0].x, 10);
assert.equal(result.points[1].x, 310);
assert.equal(nearestDatedPointIndex(result.points, 300), 1);
const irregular = buildTimeSeriesGeometry([
  { date: '2026-09-01', value: 75 },
  { date: '2026-09-02', value: 74 },
  { date: '2026-09-05', value: 73 },
], bounds);
assert.equal(irregular.points[1].x, 85);
const invalid = buildTimeSeriesGeometry([
  { date: '2026-09-01', value: Number.NaN },
  { date: '2026-09-02', value: Infinity },
  { date: '2026-09-05', value: 73 },
], bounds);
assert.equal(invalid.points.length, 1);
assert.equal(invalid.points[0].value, 73);
const sharedBounds = { ...bounds, fromDate: '2026-09-01', toDate: '2026-09-05' };
const shorter = buildTimeSeriesGeometry([{ date: '2026-09-02', value: 74 }], sharedBounds);
assert.equal(shorter.points[0].x, irregular.points[1].x);
assert.ok(shorter.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
console.log('Direct dated-geometry smoke: 10 assertions passed.');
