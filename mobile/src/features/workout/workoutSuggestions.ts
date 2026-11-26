import { parseWorkoutContent, type LoggedSet } from '@/lib/workout-content';

import type { WorkoutExercise, WorkoutSet } from './workoutReducer';

export type SetSuggestionValues = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'duration'>>;

export type SetSuggestion = {
  values: SetSuggestionValues;
  source: 'history' | 'prescription';
  date?: string;
};

export type HistoricalExercise = {
  date: string;
  tracking: WorkoutExercise['tracking'];
  sets: LoggedSet[];
};

export type ExerciseHistory = {
  byName: Record<string, HistoricalExercise[]>;
  names: string[];
};

export const normalizeExerciseName = (value: string) => value.trim().toLowerCase();

const finiteString = (value: string | undefined, minimum: number): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= minimum ? trimmed : undefined;
};

const positiveIntegerString = (value: string | undefined): string | undefined => {
  const candidate = finiteString(value, Number.MIN_VALUE);
  return candidate && Number.isInteger(Number(candidate)) ? candidate : undefined;
};

export function parseDurationPrescription(value: string | undefined): string | undefined {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const seconds = amount * (/^m(?:in(?:ute)?s?)?$/i.test(match[2]) ? 60 : 1);
  return Number.isFinite(seconds) && seconds > 0 ? String(Number(seconds.toFixed(2))) : undefined;
}

export function parseRepetitionPrescription(value: string | undefined): string | undefined {
  const match = value?.trim().match(/^(\d+)(?:\s*(?:-|–|—|to)\s*(\d+))?\s*(?:reps?)?$/i);
  if (!match) return undefined;
  const lower = Number(match[1]);
  const upper = match[2] ? Number(match[2]) : lower;
  return lower > 0 && upper >= lower ? String(lower) : undefined;
}

const normalizedKind = (set: Pick<LoggedSet, 'kind'> | Pick<WorkoutSet, 'kind'>) =>
  set.kind === 'warmup' ? 'warmup' : 'work';

function matchingCompletedSet(
  exercise: WorkoutExercise,
  setId: string,
  candidateSets: readonly LoggedSet[],
): LoggedSet | undefined {
  const currentIndex = exercise.sets.findIndex((set) => set.id === setId);
  if (currentIndex < 0) return undefined;
  const current = exercise.sets[currentIndex];
  const kind = normalizedKind(current);
  const ordinal = exercise.sets
    .slice(0, currentIndex + 1)
    .filter((set) => normalizedKind(set) === kind).length - 1;
  const candidate = candidateSets.filter((set) => normalizedKind(set) === kind)[ordinal];
  return candidate?.completed ? candidate : undefined;
}

function respectExplicitFields(set: WorkoutSet, suggestion: SetSuggestion): SetSuggestion | undefined {
  const explicit = new Set(set.explicitFields ?? []);
  const values = Object.fromEntries(
    Object.entries(suggestion.values).filter(([field]) => !explicit.has(field as keyof SetSuggestionValues)),
  ) as SetSuggestionValues;
  return Object.keys(values).length ? { ...suggestion, values } : undefined;
}

export function deriveSetSuggestion({
  exercise,
  setId,
  history = [],
  targetReps,
  targetDuration,
}: {
  exercise: WorkoutExercise;
  setId: string;
  history?: readonly HistoricalExercise[];
  targetReps?: string;
  targetDuration?: string;
}): SetSuggestion | undefined {
  const current = exercise.sets.find((set) => set.id === setId);
  if (!current) return undefined;
  for (const entry of history) {
    if (entry.tracking !== exercise.tracking) continue;
    const previous = matchingCompletedSet(exercise, setId, entry.sets);
    if (!previous) continue;
    if (exercise.tracking === 'duration') {
      const duration = finiteString(previous.duration, Number.MIN_VALUE);
      if (duration) return respectExplicitFields(current, { values: { duration }, source: 'history', date: entry.date });
      continue;
    }
    const reps = positiveIntegerString(previous.reps);
    if (!reps) continue;
    const weight = finiteString(previous.weight, 0);
    if (previous.weight.trim() && weight === undefined) continue;
    return respectExplicitFields(current, {
      values: { ...(weight === undefined ? {} : { weight }), reps },
      source: 'history',
      date: entry.date,
    });
  }

  const prescribed = exercise.tracking === 'duration'
    ? parseDurationPrescription(targetDuration)
    : parseRepetitionPrescription(targetReps);
  if (!prescribed) return undefined;
  const suggestion: SetSuggestion = exercise.tracking === 'duration'
    ? { values: { duration: prescribed }, source: 'prescription' }
    : { values: { reps: prescribed }, source: 'prescription' };
  return respectExplicitFields(current, suggestion);
}

export function applySetSuggestion(set: WorkoutSet, suggestion: SetSuggestionValues = {}): WorkoutSet {
  const explicit = new Set(set.explicitFields ?? []);
  return {
    ...set,
    weight: set.weight.trim() || explicit.has('weight') ? set.weight : suggestion.weight ?? set.weight,
    reps: set.reps.trim() || explicit.has('reps') ? set.reps : suggestion.reps ?? set.reps,
    duration: set.duration.trim() || explicit.has('duration') ? set.duration : suggestion.duration ?? set.duration,
  };
}

export function canCompleteSet(tracking: WorkoutExercise['tracking'], set: WorkoutSet): boolean {
  if (tracking === 'duration') {
    const duration = Number(set.duration.trim());
    return Number.isFinite(duration) && duration > 0;
  }
  const reps = Number(set.reps.trim());
  if (!Number.isInteger(reps) || reps <= 0) return false;
  if (!set.weight.trim()) return true;
  const weight = Number(set.weight.trim());
  return Number.isFinite(weight) && weight >= 0;
}

export function stepNumericValue({
  value,
  suggestion,
  amount,
  minimum = 0,
  precision = 0,
}: {
  value: string;
  suggestion?: string;
  amount: number;
  minimum?: number;
  precision?: number;
}): string {
  const current = value.trim() ? Number(value) : Number(suggestion ?? 0);
  const base = Number.isFinite(current) ? current : 0;
  const decimalPlaces = (candidate: string | undefined) => {
    const decimal = candidate?.trim().match(/^[-+]?\d+\.(\d+)$/)?.[1];
    return decimal?.length ?? 0;
  };
  const resolvedPrecision = Math.max(
    precision,
    decimalPlaces(value),
    decimalPlaces(suggestion),
    decimalPlaces(String(amount)),
  );
  const factor = 10 ** resolvedPrecision;
  const stepped = Math.max(minimum, Math.round((base + amount) * factor) / factor);
  return String(stepped);
}

export function buildExerciseHistory(rows: readonly { date: string; content: unknown }[]): ExerciseHistory {
  const byName: ExerciseHistory['byName'] = Object.create(null) as ExerciseHistory['byName'];
  const names: string[] = [];
  const seenNames = new Set<string>();
  for (const row of rows) {
    const parsed = parseWorkoutContent(row.content);
    if (parsed.kind !== 'exercises') continue;
    for (const exercise of parsed.exercises) {
      const key = normalizeExerciseName(exercise.name);
      if (!key) continue;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        names.push(exercise.name.trim());
      }
      if (!exercise.sets.length || !exercise.tracking) continue;
      (byName[key] ??= []).push({
        date: row.date,
        tracking: exercise.tracking,
        sets: exercise.sets,
      });
    }
  }
  return { byName, names };
}

type PlanExerciseNames = { name: string; substitutions?: readonly PlanExerciseNames[] };

export function collectPlanExerciseNames(days: readonly { exercises: readonly PlanExerciseNames[] }[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const visit = (exercise: PlanExerciseNames) => {
    const name = exercise.name.trim();
    const key = normalizeExerciseName(name);
    if (key && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
    exercise.substitutions?.forEach(visit);
  };
  days.forEach((day) => day.exercises.forEach(visit));
  return names;
}

export function suggestExerciseNames(query: string, candidates: readonly string[], limit = 6): string[] {
  const normalizedQuery = normalizeExerciseName(query);
  const seen = new Set<string>();
  const matches: string[] = [];
  for (const candidate of candidates) {
    const name = candidate.trim();
    const key = normalizeExerciseName(name);
    if (!key || seen.has(key) || (normalizedQuery && !key.includes(normalizedQuery))) continue;
    seen.add(key);
    matches.push(name);
    if (matches.length >= Math.max(0, limit)) break;
  }
  return matches;
}
