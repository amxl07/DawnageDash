export type WorkoutSet = {
  id: string;
  reps: string;
  weight: string;
  rpe: string;
  duration: string;
  kind: 'warmup' | 'work';
  completed: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  tracking: 'weight-reps' | 'duration';
  sets: WorkoutSet[];
};

export type WorkoutState = {
  title: string;
  exercises: WorkoutExercise[];
  existingLogId: string | null;
  selectedDay: number | null;
  isDirty: boolean;
};

type DraftSetInput = Pick<WorkoutSet, 'reps' | 'weight' | 'rpe'> & Partial<WorkoutSet>;

export type DraftExerciseInput = Pick<WorkoutExercise, 'name'> &
  Partial<Omit<WorkoutExercise, 'name' | 'sets'>> & {
    sets: DraftSetInput[];
  };

type LoadPayload = {
  title: string;
  exercises: DraftExerciseInput[];
};

export type WorkoutAction =
  | {
      type: 'LOAD_EXISTING_LOG';
      payload: LoadPayload & { logId: string; selectedDay?: number | null };
    }
  | { type: 'LOAD_DEFAULT_PLAN'; payload: LoadPayload & { day: number } }
  | {
      type: 'RESTORE_DRAFT';
      payload: LoadPayload & { existingLogId: string | null; selectedDay?: number | null };
    }
  | { type: 'SET_TITLE'; payload: string }
  | {
      type: 'UPDATE_SET';
      payload: {
        exerciseIndex: number;
        setIndex: number;
        field: 'reps' | 'weight' | 'rpe' | 'duration';
        value: string;
      };
    }
  | { type: 'TOGGLE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_SET'; payload: { exerciseIndex: number } }
  | { type: 'REMOVE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_EXERCISE'; payload: { name: string; tracking?: WorkoutExercise['tracking'] } }
  | {
      type: 'REPLACE_EXERCISE';
      payload: { exerciseIndex: number; exercise: DraftExerciseInput };
    }
  | { type: 'ATTACH_PERSISTED_LOG_ID'; payload: string }
  | { type: 'MARK_CLEAN' };

export const initialWorkoutState: WorkoutState = {
  title: '',
  exercises: [],
  existingLogId: null,
  selectedDay: null,
  isDirty: false,
};

function firstAvailableId(prefix: string, usedIds: ReadonlySet<string>): string {
  let suffix = 1;
  while (usedIds.has(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
}

export function normalizeDraftExercise(
  exercise: DraftExerciseInput,
  exerciseIndex = 0,
): WorkoutExercise {
  const id = exercise.id?.trim() || `exercise-${exerciseIndex + 1}`;
  const usedSetIds = new Set<string>();
  const sets = exercise.sets.map((set, setIndex) => {
    const fallbackId = `${id}-set-${setIndex + 1}`;
    const preferredId = set.id?.trim();
    const setId = preferredId && !usedSetIds.has(preferredId)
      ? preferredId
      : usedSetIds.has(fallbackId)
        ? firstAvailableId(`${id}-set`, usedSetIds)
        : fallbackId;
    usedSetIds.add(setId);

    return {
      id: setId,
      reps: set.reps,
      weight: set.weight,
      rpe: set.rpe,
      duration: set.duration ?? '',
      kind: set.kind ?? 'work',
      completed: set.completed ?? Boolean(set.reps.trim() && set.weight.trim()),
    };
  });

  return {
    id,
    name: exercise.name,
    tracking: exercise.tracking ?? 'weight-reps',
    sets,
  };
}

const withUniqueExerciseId = (
  exercise: WorkoutExercise,
  usedIds: ReadonlySet<string>,
): WorkoutExercise =>
  usedIds.has(exercise.id)
    ? { ...exercise, id: firstAvailableId(exercise.id, usedIds) }
    : exercise;

const normalizeExercises = (exercises: DraftExerciseInput[]): WorkoutExercise[] => {
  const usedIds = new Set<string>();
  return exercises.map((exercise, index) => {
    const normalized = withUniqueExerciseId(normalizeDraftExercise(exercise, index), usedIds);
    usedIds.add(normalized.id);
    return normalized;
  });
};

function updateExercise(
  state: WorkoutState,
  exerciseIndex: number,
  update: (exercise: WorkoutExercise) => WorkoutExercise,
): WorkoutExercise[] {
  return state.exercises.map((exercise, index) =>
    index === exerciseIndex ? update(exercise) : exercise,
  );
}

export function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'LOAD_EXISTING_LOG':
      return {
        ...state,
        title: action.payload.title,
        exercises: normalizeExercises(action.payload.exercises),
        existingLogId: action.payload.logId,
        selectedDay: action.payload.selectedDay ?? null,
        isDirty: false,
      };
    case 'LOAD_DEFAULT_PLAN':
      return {
        ...state,
        title: action.payload.title,
        exercises: normalizeExercises(action.payload.exercises),
        existingLogId: null,
        selectedDay: action.payload.day,
        isDirty: false,
      };
    case 'RESTORE_DRAFT':
      return {
        ...state,
        title: action.payload.title,
        exercises: normalizeExercises(action.payload.exercises),
        existingLogId: action.payload.existingLogId,
        selectedDay: action.payload.selectedDay ?? null,
        isDirty: true,
      };
    case 'SET_TITLE':
      return { ...state, title: action.payload, isDirty: true };
    case 'UPDATE_SET':
      return {
        ...state,
        exercises: updateExercise(state, action.payload.exerciseIndex, (exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set, index) =>
            index === action.payload.setIndex
              ? { ...set, [action.payload.field]: action.payload.value }
              : set,
          ),
        })),
        isDirty: true,
      };
    case 'TOGGLE_SET':
      return {
        ...state,
        exercises: updateExercise(state, action.payload.exerciseIndex, (exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set, index) =>
            index === action.payload.setIndex ? { ...set, completed: !set.completed } : set,
          ),
        })),
        isDirty: true,
      };
    case 'ADD_SET':
      return {
        ...state,
        exercises: updateExercise(state, action.payload.exerciseIndex, (exercise) => {
          const usedIds = new Set(exercise.sets.map((set) => set.id));
          const id = firstAvailableId(`${exercise.id}-set`, usedIds);
          return {
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id,
                reps: '',
                weight: '',
                rpe: '',
                duration: '',
                kind: 'work',
                completed: false,
              },
            ],
          };
        }),
        isDirty: true,
      };
    case 'REMOVE_SET':
      return {
        ...state,
        exercises: updateExercise(state, action.payload.exerciseIndex, (exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((_, index) => index !== action.payload.setIndex),
        })),
        isDirty: true,
      };
    case 'ADD_EXERCISE': {
      const usedIds = new Set(state.exercises.map((exercise) => exercise.id));
      const id = firstAvailableId('custom', usedIds);
      return {
        ...state,
        exercises: [
          ...state.exercises,
          {
            id,
            name: action.payload.name,
            tracking: action.payload.tracking ?? 'weight-reps',
            sets: [
              {
                id: `${id}-set-1`,
                reps: '',
                weight: '',
                rpe: '',
                duration: '',
                kind: 'work',
                completed: false,
              },
            ],
          },
        ],
        isDirty: true,
      };
    }
    case 'REPLACE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map((exercise, index) => {
          if (index !== action.payload.exerciseIndex) return exercise;
          const usedIds = new Set(
            state.exercises
              .filter((_, otherIndex) => otherIndex !== action.payload.exerciseIndex)
              .map((otherExercise) => otherExercise.id),
          );
          return withUniqueExerciseId(
            normalizeDraftExercise(action.payload.exercise, index),
            usedIds,
          );
        }),
        isDirty: true,
      };
    case 'ATTACH_PERSISTED_LOG_ID':
      return { ...state, existingLogId: action.payload };
    case 'MARK_CLEAN':
      return { ...state, isDirty: false };
    default:
      return state;
  }
}
