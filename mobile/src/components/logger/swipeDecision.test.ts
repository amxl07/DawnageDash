import { applySwipeResistance, decideSwipe, projectSwipe } from './swipeDecision';

describe('swipeDecision', () => {
  it.each([
    [{ translationX: -20, velocityX: -900, width: 320, canPrev: true, canNext: true }, 'next'],
    [
      { translationX: 20, velocityX: 900, width: 320, canPrev: true, canNext: true },
      'previous',
    ],
    [{ translationX: -100, velocityX: -200, width: 320, canPrev: true, canNext: false }, 'stay'],
    [{ translationX: 15, velocityX: -700, width: 320, canPrev: true, canNext: true }, 'next'],
  ] as const)('resolves swipe intent', (input, expected) => {
    expect(decideSwipe(input)).toBe(expected);
  });

  it('projects velocity over 180 milliseconds', () => {
    expect(projectSwipe(15, -700)).toBe(-111);
  });

  it('stays when the projected distance is below the minimum threshold', () => {
    expect(
      decideSwipe({
        translationX: 59,
        velocityX: 0,
        width: 320,
        canPrev: true,
        canNext: true,
      }),
    ).toBe('stay');
  });

  it('uses a width-derived threshold on wide screens', () => {
    expect(
      decideSwipe({
        translationX: 100,
        velocityX: 0,
        width: 1000,
        canPrev: true,
        canNext: true,
      }),
    ).toBe('stay');
  });

  it('stays at an unavailable previous edge', () => {
    expect(
      decideSwipe({
        translationX: 100,
        velocityX: 0,
        width: 320,
        canPrev: false,
        canNext: true,
      }),
    ).toBe('stay');
  });

  it('lets an interrupted slide return freely before resisting an unavailable edge', () => {
    expect(
      applySwipeResistance({
        startX: -40,
        translationX: 40,
        canPrev: false,
        canNext: true,
      }),
    ).toBe(0);

    expect(
      applySwipeResistance({
        startX: -40,
        translationX: 80,
        canPrev: false,
        canNext: true,
      }),
    ).toBe(10);
  });

  it.each([
    ['preserves existing previous-edge overscroll', 20, 0, false, true, 20],
    ['follows inward movement from the previous edge', 20, -10, false, true, 10],
    ['follows inward movement through zero from the previous edge', 20, -30, false, true, -10],
    ['damps only new outward movement at the previous edge', 20, 20, false, true, 25],
    ['damps a previous-edge crossing from the allowed region', -20, 40, false, true, 5],
    ['preserves existing next-edge overscroll', -20, 0, true, false, -20],
    ['follows inward movement from the next edge', -20, 10, true, false, -10],
    ['follows inward movement through zero from the next edge', -20, 30, true, false, 10],
    ['damps only new outward movement at the next edge', -20, -20, true, false, -25],
    ['damps a next-edge crossing from the allowed region', 20, -40, true, false, -5],
  ] as const)(
    '%s',
    (_name, startX, translationX, canPrev, canNext, expected) => {
      expect(applySwipeResistance({ startX, translationX, canPrev, canNext })).toBe(expected);
    },
  );
});
