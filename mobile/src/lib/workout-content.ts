/**
 * workout_logs.content tolerates THREE historical shapes (contract §workout_logs):
 *   1. current: [{ exercise, sets: [{ setNumber, reps, weight, rpe }] }]
 *   2. legacy object: [{ Exercise, Sets, Reps, Weight, Duration, Rest, VideoLink }]
 *   3. plain strings inside the array, or a non-JSON string entirely
 * The history renderer must survive all three without crashing.
 */

export type LoggedSet = { setNumber: number; reps: string; weight: string; rpe: string };

export type ParsedExercise = {
  name: string;
  /** Present for the current format. */
  sets: LoggedSet[];
  /** Present for the legacy object format. */
  legacy?: { sets?: string; reps?: string; weight?: string; duration?: string; rest?: string };
  raw?: string;
};

export type ParsedContent =
  | { kind: 'exercises'; exercises: ParsedExercise[] }
  | { kind: 'text'; text: string };

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

export function parseWorkoutContent(content: unknown): ParsedContent {
  if (!content) return { kind: 'exercises', exercises: [] };

  let parsed: unknown = content;
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      // Not JSON at all — show it as plain text rather than crashing.
      return { kind: 'text', text: content };
    }
  }

  if (!Array.isArray(parsed)) {
    return { kind: 'text', text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed) };
  }

  const exercises: ParsedExercise[] = parsed.map((entry, idx) => {
    if (typeof entry !== 'object' || entry === null) {
      return { name: str(entry) || `Exercise ${idx + 1}`, sets: [], raw: str(entry) };
    }
    const e = entry as Record<string, unknown>;
    const name = str(e.Exercise || e.exercise || e.name) || `Exercise ${idx + 1}`;

    if (Array.isArray(e.sets)) {
      return {
        name,
        sets: (e.sets as Record<string, unknown>[]).map((s, i) => ({
          setNumber: typeof s.setNumber === 'number' ? s.setNumber : i + 1,
          reps: str(s.reps),
          weight: str(s.weight),
          rpe: str(s.rpe),
        })),
      };
    }

    return {
      name,
      sets: [],
      legacy: {
        sets: str(e.Sets ?? e.sets),
        reps: str(e.Reps ?? e.reps),
        weight: str(e.Weight ?? e.weight),
        duration: str(e.Duration ?? e.duration),
        rest: str(e.Rest ?? e.rest),
      },
    };
  });

  return { kind: 'exercises', exercises };
}

/** Σ weight × reps over sets where both parse as numbers. */
export function totalVolume(exercises: ParsedExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      const w = parseFloat(s.weight);
      const r = parseFloat(s.reps);
      if (Number.isFinite(w) && Number.isFinite(r)) total += w * r;
    }
  }
  return Math.round(total);
}

export function countSets(exercises: ParsedExercise[]): number {
  return exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.weight.trim() !== '' && s.reps.trim() !== '').length,
    0,
  );
}

export function maxWeightFor(sets: LoggedSet[]): number {
  return sets.reduce((max, s) => {
    const w = parseFloat(s.weight);
    return Number.isFinite(w) && w > max ? w : max;
  }, 0);
}
