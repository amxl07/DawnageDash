export type PlateCalculation = {
  platesPerSide: number[];
  remainderKg: number;
};

const validateNonnegativeFinite = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite nonnegative number.`);
  }
};

const MAX_DECIMAL_PLACES = 6;

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const fractionDigits = coefficient.split('.')[1]?.length ?? 0;
  const exponent = exponentText ? Number(exponentText) : 0;
  return Math.max(0, fractionDigits - exponent);
}

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
  const precision = Math.max(decimalPlaces(targetKg), decimalPlaces(barKg), ...pairs.map(decimalPlaces));
  if (precision > MAX_DECIMAL_PLACES) {
    throw new RangeError(`Loads support at most ${MAX_DECIMAL_PLACES} decimal places.`);
  }
  const scale = 10 ** precision;
  const toUnits = (value: number, label: string) => {
    const units = Math.round(value * scale);
    if (!Number.isSafeInteger(units)) {
      throw new RangeError(`${label} is outside the supported range.`);
    }
    return units;
  };
  const targetUnits = toUnits(targetKg, 'Target load');
  const barUnits = toUnits(barKg, 'Bar load');
  const platesPerSide: number[] = [];
  let remainingTotalUnits = targetUnits - barUnits;

  for (const plate of pairs) {
    const pairUnits = toUnits(plate * 2, 'Plate pair');
    const pairCount = Math.floor(remainingTotalUnits / pairUnits);
    for (let count = 0; count < pairCount; count += 1) {
      platesPerSide.push(plate);
    }
    remainingTotalUnits -= pairCount * pairUnits;
  }

  return {
    platesPerSide,
    remainderKg: remainingTotalUnits / scale,
  };
}
