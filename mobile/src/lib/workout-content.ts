/**
 * workout_logs.content tolerates THREE historical shapes (contract §workout_logs):
 *   1. current: [{ exercise, sets: [{ setNumber, reps, weight, rpe }] }]
 *   2. legacy object: [{ Exercise, Sets, Reps, Weight, Duration, Rest, VideoLink }]
 *   3. plain strings inside the array, or a non-JSON string entirely
 * The history renderer must survive all three without crashing.
 */

export type LoggedSet = {
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  completed: boolean;
  duration?: string;
  kind?: 'warmup' | 'work';
};

export type ParsedExercise = {
  name: string;
  /** Present for the current format. */
  sets: LoggedSet[];
  /** Present for the legacy object format. */
  legacy?: { sets?: string; reps?: string; weight?: string; duration?: string; rest?: string };
  raw?: string;
};

export type ParsedContent =
  | { kind: 'exercises'; exercises: ParsedExercise[]; version?: 2; planDayNumber?: number | null }
  | { kind: 'text'; text: string };

export type WorkoutContentV2 = {
  version: 2;
  planDayNumber: number | null;
  exercises: ParsedExercise[];
};

const str = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  try {
    return String(v);
  } catch {
    return '';
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFilled = (value: string): boolean => value.trim() !== '';

const textFor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string' ? serialized : str(value);
  } catch {
    return str(value);
  }
};

function parseSet(value: unknown, index: number, version: 2 | undefined): LoggedSet {
  if (!isRecord(value)) {
    return { setNumber: index + 1, reps: '', weight: '', rpe: '', completed: false };
  }

  const reps = str(value.reps);
  const weight = str(value.weight);
  const explicitCompletion = value.completed === true;
  const completed = version === 2 ? explicitCompletion : explicitCompletion || (isFilled(reps) && isFilled(weight));
  const setNumber = typeof value.setNumber === 'number' && Number.isFinite(value.setNumber) ? value.setNumber : index + 1;
  const kind = value.kind === 'warmup' || value.kind === 'work' ? value.kind : undefined;
  const duration = value.duration === undefined || value.duration === null ? undefined : str(value.duration);

  return { setNumber, reps, weight, rpe: str(value.rpe), completed, ...(duration === undefined ? {} : { duration }), ...(kind === undefined ? {} : { kind }) };
}

function parseExercises(entries: unknown[], version?: 2): ParsedExercise[] {
  return entries.map((entry, idx) => {
    if (!isRecord(entry)) {
      return { name: str(entry) || `Exercise ${idx + 1}`, sets: [], raw: str(entry) };
    }

    const name = str(entry.Exercise || entry.exercise || entry.name) || `Exercise ${idx + 1}`;
    if (Array.isArray(entry.sets)) {
      return { name, sets: entry.sets.map((set, index) => parseSet(set, index, version)) };
    }

    return {
      name,
      sets: [],
      legacy: {
        sets: str(entry.Sets ?? entry.sets),
        reps: str(entry.Reps ?? entry.reps),
        weight: str(entry.Weight ?? entry.weight),
        duration: str(entry.Duration ?? entry.duration),
        rest: str(entry.Rest ?? entry.rest),
      },
    };
  });
}

export function serializeWorkoutContent(input: Omit<WorkoutContentV2, 'version'>): string {
  return JSON.stringify({ version: 2, ...input });
}

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

  if (isRecord(parsed) && parsed.version === 2 && Array.isArray(parsed.exercises)) {
    return {
      kind: 'exercises',
      version: 2,
      planDayNumber: typeof parsed.planDayNumber === 'number' && Number.isFinite(parsed.planDayNumber) ? parsed.planDayNumber : null,
      exercises: parseExercises(parsed.exercises, 2),
    };
  }

  if (!Array.isArray(parsed)) return { kind: 'text', text: textFor(parsed) };

  return { kind: 'exercises', exercises: parseExercises(parsed) };
}

const finiteNumber = (value: string): number | null => {
  if (!isFilled(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Σ weight × reps over completed sets where both values are finite numbers. */
export function totalVolume(exercises: ParsedExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      const w = finiteNumber(s.weight);
      const r = finiteNumber(s.reps);
      if (s.completed && w !== null && r !== null) total += w * r;
    }
  }
  return Math.round(total);
}

export function countSets(exercises: ParsedExercise[]): number {
  return exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0);
}

type MetricSet = Pick<LoggedSet, 'reps' | 'weight'> & Partial<Pick<LoggedSet, 'completed'>>;

const isCompletedMetricSet = (set: MetricSet): boolean =>
  set.completed === true || (set.completed === undefined && isFilled(set.reps) && isFilled(set.weight));

export function maxWeightFor(sets: MetricSet[]): number {
  return sets.reduce((max, s) => {
    const w = finiteNumber(s.weight);
    return isCompletedMetricSet(s) && w !== null && w > max ? w : max;
  }, 0);
}
