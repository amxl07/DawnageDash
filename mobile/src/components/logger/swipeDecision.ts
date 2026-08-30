export type SwipeDirection = 'previous' | 'next' | 'stay';

export type SwipeDecisionInput = {
  translationX: number;
  velocityX: number;
  width: number;
  canPrev: boolean;
  canNext: boolean;
};

type SwipeResistanceInput = Pick<SwipeDecisionInput, 'translationX' | 'canPrev' | 'canNext'> & {
  startX: number;
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

export function applySwipeResistance({
  startX,
  translationX,
  canPrev,
  canNext,
}: SwipeResistanceInput): number {
  'worklet';
  const candidateX = startX + translationX;
  const atEdge = (candidateX > 0 && !canPrev) || (candidateX < 0 && !canNext);
  return atEdge ? candidateX * 0.25 : candidateX;
}
