export type CalorieDatum = {
  consumed: number;
  goal: number;
};

export function getCalorieChartMaximum(data: CalorieDatum[]): number {
  return Math.max(
    1,
    ...data.map(({ consumed, goal }) => Math.max(consumed, goal)),
  );
}

export function getCalorieBarHeight(
  consumed: number,
  maximum: number,
  availableHeight: number,
): number {
  const scaledHeight = maximum > 0
    ? Math.round((Math.max(consumed, 0) / maximum) * availableHeight)
    : 0;

  return Math.min(Math.max(scaledHeight, 8), availableHeight);
}

export function getDatedCalorieAccessibilityLabel(
  date: string,
  consumed: number,
  goal: number,
  locale?: string,
): string {
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });

  return `${formattedDate}: ${Math.round(consumed)} calories; goal ${Math.round(goal)} calories`;
}
