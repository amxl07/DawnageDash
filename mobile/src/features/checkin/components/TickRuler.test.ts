import { valueAfterRulerDrag } from './rulerMath';

describe('valueAfterRulerDrag', () => {
  it('moves through exact steps and rounds away floating-point noise', () => {
    expect(valueAfterRulerDrag(72.5, -24, {
      min: 20, max: 400, step: 0.1, pxPerStep: 12, precision: 1,
    })).toBe(72.7);
    expect(valueAfterRulerDrag(72.5, 24, {
      min: 20, max: 400, step: 0.1, pxPerStep: 12, precision: 1,
    })).toBe(72.3);
  });

  it('clamps at both field boundaries', () => {
    const config = { min: 0, max: 20, step: 0.25, pxPerStep: 20, precision: 2 };
    expect(valueAfterRulerDrag(0.25, 200, config)).toBe(0);
    expect(valueAfterRulerDrag(19.75, -200, config)).toBe(20);
  });

  it('does not invent an initial value for an unanswered field', () => {
    expect(valueAfterRulerDrag(null, -60, {
      min: 0, max: 24, step: 0.5, pxPerStep: 24, precision: 1,
    })).toBeNull();
  });
});
