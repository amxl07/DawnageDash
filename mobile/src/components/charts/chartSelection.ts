export function nearestPlotDate(points: readonly { date: string; x: number }[], x: number): string | null {
  if (!Number.isFinite(x)) return null;
  let nearest: { date: string; x: number } | undefined;
  for (const point of points) {
    if (Number.isFinite(point.x) && (!nearest || Math.abs(point.x - x) < Math.abs(nearest.x - x))) nearest = point;
  }
  return nearest?.date ?? null;
}

/** A horizontal scrub must yield before the page commits to vertical scrolling. */
export const claimsChartGesture = (dx: number, dy: number) => Math.abs(dx) > 10 && Math.abs(dy) < 10;
