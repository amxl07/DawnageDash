import type { WorkoutState } from './workoutReducer';
export type WorkoutResult = { volume: number; sets: number; incompleteSets: number; excludedSets: number };
/** Objective volume includes completed strength sets with valid nonnegative kg and positive whole reps. */
export function reviewWorkout(state: WorkoutState): WorkoutResult {
  let volume = 0, sets = 0, incompleteSets = 0, excludedSets = 0;
  for (const exercise of state.exercises) for (const set of exercise.sets) {
    if (!set.completed) { incompleteSets += 1; continue; }
    sets += 1;
    if (exercise.tracking === 'duration') continue;
    if (!set.weight.trim() && Number(set.reps) > 0) continue; // Bodyweight has no known external load.
    const weight = Number(set.weight), reps = Number(set.reps);
    if (!set.weight.trim() || !set.reps.trim() || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps <= 0) { excludedSets += 1; continue; }
    volume += weight * reps;
  }
  return { volume: Math.round(volume), sets, incompleteSets, excludedSets };
}
