import type { DatedValue, Series } from '@/components/charts/types';
import { isDateKeyStrict } from '@/lib/dates';
import type { MeasurementField } from '@/lib/measurement-validation';
import type { BodyMeasurement, Numeric } from '@/types/db';

export type MeasurementPoint = DatedValue;

export type MeasurementComparison = {
  baseline: { date: string; value: number } | null;
  latest: { date: string; value: number } | null;
  delta: number | null;
};

/** Mirrors the persisted measurement input contract without coercing absence to zero. */
export function parseMeasurementObservation(value: Numeric | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 20 && parsed <= 250 ? parsed : null;
}

/**
 * The measurements query is newest-first. The first row for a duplicate date is
 * therefore authoritative, including an explicit missing value from a later edit.
 */
export function buildMeasurementSeries(
  rows: BodyMeasurement[],
  field: MeasurementField,
): MeasurementPoint[] {
  const byDate = new Map<string, MeasurementPoint>();
  for (const row of rows) {
    if (!isDateKeyStrict(row.date) || byDate.has(row.date)) continue;
    byDate.set(row.date, {
      date: row.date,
      value: parseMeasurementObservation(row[field]),
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMeasurementChartSeries(
  rows: BodyMeasurement[],
  definition: {
    field: MeasurementField;
    name: string;
    color: string;
    dash?: number[];
  },
): Series & { id: MeasurementField; unit: 'cm' } {
  return {
    id: definition.field,
    name: definition.name,
    unit: 'cm',
    color: definition.color,
    dash: definition.dash,
    data: buildMeasurementSeries(rows, definition.field),
  };
}

export function measurementComparison(
  rows: BodyMeasurement[],
  field: MeasurementField,
): MeasurementComparison {
  const valid = buildMeasurementSeries(rows, field).filter(
    (point): point is { date: string; value: number } => point.value !== null,
  );
  const latest = valid.at(-1) ?? null;
  const baseline = valid[0] ?? null;
  if (!baseline || !latest || valid.length < 2) return { baseline: null, latest, delta: null };
  return { baseline, latest, delta: latest.value - baseline.value };
}
