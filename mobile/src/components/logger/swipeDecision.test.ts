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
});
