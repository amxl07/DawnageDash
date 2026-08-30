import { decideSwipe, projectSwipe } from './swipeDecision';

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
});
