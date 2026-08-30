import { calculatePlates } from './plate-calculator';

describe('calculatePlates', () => {
  it('calculates plates per side for a metric barbell', () => {
    expect(calculatePlates(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({
      platesPerSide: [25, 15],
      remainderKg: 0,
    });
  });

  it('reports an unreachable remainder without rounding the requested load', () => {
    expect(calculatePlates(63, 20, [20, 10, 5, 2.5, 1.25])).toEqual({
      platesPerSide: [20, 1.25],
      remainderKg: 0.5,
    });
  });

  it('uses scaled decimal units without skipping an exactly fitting plate', () => {
    expect(calculatePlates(65.1, 20.1, [20, 10, 5, 2.5, 1.25])).toEqual({
      platesPerSide: [20, 2.5],
      remainderKg: 0,
    });
  });

  it('uses positive plate pairs in descending order', () => {
    expect(calculatePlates(100, 20, [0, 5, 25, 10, 20])).toEqual({
      platesPerSide: [25, 10, 5],
      remainderKg: 0,
    });
  });

  it.each([
    [Number.NaN, 20, [20]],
    [100, Number.POSITIVE_INFINITY, [20]],
    [-1, 20, [20]],
    [100, -20, [20]],
    [100, 20, [Number.NaN]],
    [100, 20, [-5]],
  ])('rejects non-finite or negative inputs', (target, bar, pairs) => {
    expect(() => calculatePlates(target, bar, pairs)).toThrow(RangeError);
  });
});
