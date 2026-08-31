export type RulerMath = {
  min: number;
  max: number;
  step: number;
  pxPerStep: number;
  precision: number;
};

export function valueAfterRulerDrag(
  value: number | null,
  translationX: number,
  { min, max, step, pxPerStep, precision }: RulerMath,
): number | null {
  if (value === null) return null;
  const stepDelta = -Math.round(translationX / pxPerStep);
  const next = Math.min(max, Math.max(min, value + stepDelta * step));
  return Number(next.toFixed(precision));
}
