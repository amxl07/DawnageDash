export type SwipeDirection = 'previous' | 'next' | 'stay';

export type SwipeDecisionInput = {
  translationX: number;
  velocityX: number;
  width: number;
  canPrev: boolean;
  canNext: boolean;
};

export function projectSwipe(translationX: number, velocityX: number): number {
  'worklet';
  return translationX + velocityX * 0.18;
}

export function decideSwipe({
  translationX,
  velocityX,
  width,
  canPrev,
  canNext,
}: SwipeDecisionInput): SwipeDirection {
  'worklet';
  const projectedX = projectSwipe(translationX, velocityX);
  const threshold = Math.max(60, width * 0.18);

  if (Math.abs(projectedX) < threshold) return 'stay';
  if (projectedX < 0) return canNext ? 'next' : 'stay';
  return canPrev ? 'previous' : 'stay';
}
