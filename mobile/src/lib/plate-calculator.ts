export type PlateCalculation = {
  platesPerSide: number[];
  remainderKg: number;
};

const validateNonnegativeFinite = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite nonnegative number.`);
  }
};

export function calculatePlates(
  targetKg: number,
  barKg: number,
  availablePairs: number[],
): PlateCalculation {
  validateNonnegativeFinite(targetKg, 'Target load');
  validateNonnegativeFinite(barKg, 'Bar load');
  availablePairs.forEach((pair) => validateNonnegativeFinite(pair, 'Plate pair'));
  if (targetKg < barKg) {
    throw new RangeError('Target load must be at least the bar load.');
  }

  const pairs = [...new Set(availablePairs.filter((pair) => pair > 0))].sort((a, b) => b - a);
  const platesPerSide: number[] = [];
  let remainingPerSide = (targetKg - barKg) / 2;

  for (const plate of pairs) {
    while (remainingPerSide + Number.EPSILON >= plate) {
      platesPerSide.push(plate);
      remainingPerSide -= plate;
    }
  }

  return {
    platesPerSide,
    remainderKg: Math.max(0, Number((remainingPerSide * 2).toFixed(12))),
  };
}
