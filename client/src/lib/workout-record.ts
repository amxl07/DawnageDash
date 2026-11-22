/** A display projection is never the source of truth for saving a workout. */
export type WorkoutRecordSet = {
  id: string;
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  duration: string;
  kind: 'warmup' | 'work';
  completed: boolean | null;
};

export type WorkoutRecordExercise = {
  id: string;
  name: string;
  tracking: 'weight-reps' | 'duration';
  sets: WorkoutRecordSet[];
  summary?: string;
  videoUrl?: string;
};

export type WorkoutRecord = {
  format: 'v2' | 'legacy' | 'unsupported' | 'text';
  editable: boolean;
  reason?: string;
  original: unknown;
  exercises: WorkoutRecordExercise[];
  text?: string;
  planDayNumber?: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const scalar = (value: unknown) => value == null || typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));

const text = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value) ?? ''; } catch { return ''; }
};

const readValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const exerciseName = (entry: Record<string, unknown>) => text(entry.name ?? entry.exercise ?? entry.Exercise);
const sourceEntries = (original: unknown): unknown[] => Array.isArray(original)
  ? original : record(original) && Array.isArray(original.exercises) ? original.exercises
    : record(original) && ('Exercise' in original || 'exercise' in original || 'name' in original) ? [original] : [];

function understoodExercise(entry: unknown, v2: boolean): boolean {
  if (!record(entry) || !exerciseName(entry).trim() || !Array.isArray(entry.sets)) return false;
  if (!scalar(entry.name) || !scalar(entry.exercise) || !scalar(entry.Exercise)) return false;
  if (entry.tracking !== undefined && entry.tracking !== 'duration' && entry.tracking !== 'weight-reps') return false;
  if (v2 && entry.tracking !== 'duration' && entry.tracking !== 'weight-reps') return false;
  return entry.sets.every(set => record(set) &&
    ['reps', 'weight', 'rpe', 'duration'].every(field => scalar(set[field])) &&
    (set.kind === undefined || set.kind === 'warmup' || set.kind === 'work') &&
    (set.setNumber === undefined || (typeof set.setNumber === 'number' && Number.isInteger(set.setNumber) && set.setNumber > 0)) &&
    (v2 ? typeof set.completed === 'boolean' : set.completed === undefined || typeof set.completed === 'boolean'));
}

export function readWorkoutRecord(input: unknown): WorkoutRecord {
  const original = readValue(input);
  const version = record(original) ? original.version : undefined;
  const format: WorkoutRecord['format'] = version === 2 ? 'v2'
    : Array.isArray(original) ? 'legacy' : typeof original === 'string' || original == null ? 'text' : 'unsupported';
  const entries = sourceEntries(original);
  const editable = (format === 'legacy' || format === 'v2') && entries.every(entry => understoodExercise(entry, format === 'v2')) &&
    (format !== 'v2' || (record(original) && Array.isArray(original.exercises)));
  const exercises = entries.map((entry, index): WorkoutRecordExercise => {
    const id = `exercise-${index + 1}`;
    if (!record(entry)) return { id, name: text(entry) || `Exercise ${index + 1}`, tracking: 'weight-reps', sets: [], summary: text(entry) };
    const sets = Array.isArray(entry.sets) ? entry.sets.map((raw, setIndex): WorkoutRecordSet => {
      const set = record(raw) ? raw : {};
      const reps = text(set.reps), weight = text(set.weight);
      const explicit = typeof set.completed === 'boolean' ? set.completed : null;
      return {
        id: `${id}-set-${setIndex + 1}`,
        setNumber: typeof set.setNumber === 'number' && Number.isFinite(set.setNumber) ? set.setNumber : setIndex + 1,
        reps, weight, rpe: text(set.rpe), duration: text(set.duration),
        kind: set.kind === 'warmup' ? 'warmup' : 'work',
        completed: format === 'v2' ? explicit : format === 'legacy' ? explicit : null,
      };
    }) : [];
    const tracking = entry.tracking === 'duration' ||
      (entry.tracking === undefined && sets.some(set => set.duration) && !sets.some(set => set.reps || set.weight)) ? 'duration' : 'weight-reps';
    const summary = Array.isArray(entry.sets) ? undefined : [
      ['Sets', entry.Sets ?? entry.sets], ['Reps', entry.Reps ?? entry.reps],
      ['Weight', entry.Weight ?? entry.weight], ['Duration', entry.Duration ?? entry.duration], ['Rest', entry.Rest ?? entry.rest],
    ].filter(([, value]) => value != null && text(value).trim()).map(([label, value]) => `${label}: ${text(value)}`).join(' · ');
    const video = entry.VideoLink ?? entry.videoLink;
    const videoUrl = typeof video === 'string' && /^https?:\/\//i.test(video) ? video : undefined;
    return { id, name: exerciseName(entry) || `Exercise ${index + 1}`, tracking, sets, ...(summary ? { summary } : {}), ...(videoUrl ? { videoUrl } : {}) };
  });
  return {
    format, editable, original, exercises,
    ...(!editable ? { reason: format === 'text' ? 'This workout is a saved note. Structured editing is unavailable.'
      : 'This workout uses a format that cannot be safely edited here. Its original contents are preserved.' } : {}),
    ...(!entries.length && !editable ? { text: text(original) } : {}),
    ...(record(original) && typeof original.planDayNumber === 'number' ? { planDayNumber: original.planDayNumber } : {}),
  };
}

/** Patch only edited values into the original structure, preserving all other facts. */
export function serializeWorkoutRecord(document: WorkoutRecord, exercises: WorkoutRecordExercise[]): string {
  if (!document.editable) throw new Error('This workout is read-only.');
  const baseline = readWorkoutRecord(document.original);
  if (!baseline.editable || exercises.length !== baseline.exercises.length) throw new Error('The workout structure changed. Reload it before saving.');
  const original = JSON.parse(JSON.stringify(document.original)) as unknown;
  const entries = sourceEntries(original) as Record<string, unknown>[];
  exercises.forEach((exercise, index) => {
    const before = baseline.exercises[index];
    if (exercise.id !== before.id || exercise.name !== before.name || exercise.tracking !== before.tracking || exercise.sets.length !== before.sets.length) {
      throw new Error('Exercise structure changes are unavailable for an existing workout.');
    }
    const rawSets = entries[index].sets as Record<string, unknown>[];
    exercise.sets.forEach((set, setIndex) => {
      const previous = before.sets[setIndex];
      if (set.id !== previous.id || set.setNumber !== previous.setNumber || set.kind !== previous.kind || set.completed !== previous.completed) {
        throw new Error('Set structure or completion changed. Reload it before saving.');
      }
      for (const field of ['reps', 'weight', 'rpe', 'duration'] as const) {
        if (set[field] === previous[field]) continue;
        const value = set[field].trim();
        const number = Number(value);
        if (value && (!Number.isFinite(number) || number < 0 || (field === 'reps' && !Number.isInteger(number)))) {
          throw new Error(`Enter a valid ${field} value.`);
        }
        if (set.completed && ((exercise.tracking === 'duration' && field === 'duration') ||
          (exercise.tracking === 'weight-reps' && field === 'reps')) && (!value || number <= 0)) {
          throw new Error('A completed set needs positive repetitions or duration.');
        }
        if (exercise.tracking === 'duration' && (field === 'reps' || field === 'weight')) throw new Error('A timed set must keep its tracking mode.');
        if (exercise.tracking === 'weight-reps' && field === 'duration') throw new Error('A strength set must keep its tracking mode.');
        rawSets[setIndex][field] = set[field];
      }
    });
  });
  return JSON.stringify(original);
}

/** Draft restore accepts temporary value errors but never a changed record structure. */
export function workoutStructureMatches(document: WorkoutRecord, exercises: unknown): exercises is WorkoutRecordExercise[] {
  if (!document.editable || !Array.isArray(exercises) || exercises.length !== document.exercises.length) return false;
  return exercises.every((candidate, exerciseIndex) => {
    if (!record(candidate) || !Array.isArray(candidate.sets)) return false;
    const baseline = document.exercises[exerciseIndex];
    if (candidate.id !== baseline.id || candidate.name !== baseline.name || candidate.tracking !== baseline.tracking ||
        candidate.sets.length !== baseline.sets.length) return false;
    return candidate.sets.every((rawSet, setIndex) => {
      if (!record(rawSet)) return false;
      const set = baseline.sets[setIndex];
      return rawSet.id === set.id && rawSet.setNumber === set.setNumber && rawSet.kind === set.kind &&
        rawSet.completed === set.completed &&
        ['reps', 'weight', 'rpe', 'duration'].every(field => typeof rawSet[field] === 'string');
    });
  });
}

export function newLegacyWorkout(exercises: { name: string; sets: { reps: string; weight: string; rpe: string }[] }[]): WorkoutRecord {
  return readWorkoutRecord(exercises.map(exercise => ({
    exercise: exercise.name,
    sets: exercise.sets.map((set, index) => ({ setNumber: index + 1, reps: set.reps, weight: set.weight, rpe: set.rpe })),
  })));
}

export type WorkoutRecordContext = { userId: string; dateKey: string; logId: string | null; original: unknown };

/** An acknowledged source must match the current account, day and authoritative row. */
export function workoutContextMatches(context: unknown, current: WorkoutRecordContext): context is WorkoutRecordContext {
  if (!record(context) || context.userId !== current.userId || context.dateKey !== current.dateKey || context.logId !== current.logId) return false;
  try { return JSON.stringify(readValue(context.original)) === JSON.stringify(readValue(current.original)); } catch { return false; }
}

export function workoutHistoryValues(rows: readonly { content: unknown }[]): Record<string, { sets: WorkoutRecordSet[] }> {
  const result: Record<string, { sets: WorkoutRecordSet[] }> = Object.create(null);
  for (const row of rows) {
    const document = readWorkoutRecord(row.content);
    if (!document.editable) continue;
    for (const exercise of document.exercises) {
      const key = exercise.name.trim().toLowerCase();
      if (!key || result[key] || exercise.tracking !== 'weight-reps') continue;
      // The legacy web logger has no warm-up editor. Match work-set ordinals,
      // retaining incomplete positions instead of shifting later sets forward.
      const work = exercise.sets.filter(set => set.kind === 'work');
      const completed = (set: WorkoutRecordSet) => set.completed === true ||
        (document.format === 'legacy' && set.completed === null && Boolean(set.reps.trim() && set.weight.trim()));
      if (!work.some(completed)) continue;
      result[key] = { sets: work.map(set => completed(set) ? set : { ...set, reps: '', weight: '', rpe: '' }) };
    }
  }
  return result;
}
