import type { DatedValue } from './types';

export type PlotPoint = {
  date: string;
  value: number;
  x: number;
  y: number;
};

type PlotBounds = {
  width: number;
  height: number;
  insetX: number;
  insetY: number;
  min: number;
  max: number;
  fromDate?: string;
  toDate?: string;
};

const DAY_MS = 86_400_000;

function dateDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function buildTimeSeriesGeometry(
  observations: DatedValue[],
  bounds: PlotBounds,
): { points: PlotPoint[]; segments: PlotPoint[][] } {
  if (!observations.length) return { points: [], segments: [] };

  const dates = observations.map((observation) => dateDay(observation.date));
  const firstDay = bounds.fromDate ? dateDay(bounds.fromDate) : Math.min(...dates);
  const lastDay = bounds.toDate ? dateDay(bounds.toDate) : Math.max(...dates);
  const span = lastDay - firstDay;
  const plotWidth = Math.max(0, bounds.width - bounds.insetX * 2);
  const plotHeight = Math.max(0, bounds.height - bounds.insetY * 2);
  const valueRange = bounds.max - bounds.min;
  const points: PlotPoint[] = [];
  const segments: PlotPoint[][] = [];
  let segment: PlotPoint[] = [];

  observations.forEach((observation, index) => {
    if (observation.value === null || !Number.isFinite(observation.value)) {
      if (segment.length) segments.push(segment);
      segment = [];
      return;
    }
    const x = span
      ? bounds.insetX + ((dates[index] - firstDay) / span) * plotWidth
      : bounds.width / 2;
    const y = valueRange
      ? bounds.insetY + ((bounds.max - observation.value) / valueRange) * plotHeight
      : bounds.height / 2;
    const point = { date: observation.date, value: observation.value, x, y };
    points.push(point);
    segment.push(point);
  });
  if (segment.length) segments.push(segment);
  return { points, segments };
}

export function pathForPoints(points: PlotPoint[]): string {
  return points
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
    .join(' ');
}

export function nearestDatedPointIndex(points: PlotPoint[], x: number): number {
  if (!points.length) return -1;
  let nearest = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (Math.abs(points[index].x - x) < Math.abs(points[nearest].x - x)) nearest = index;
  }
  return nearest;
}
