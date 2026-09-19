import { reviewWorkout } from './workout-review';
import { initialWorkoutState } from './workoutReducer';
it('counts incomplete sets and excludes malformed values from volume without counting duration as weight', () => {
  const base = { id: 's', reps: '8', weight: '50', rpe: '', duration: '', kind: 'work' as const, completed: true };
  const result = reviewWorkout({ ...initialWorkoutState, exercises: [
    { id: 'e', name: 'Bench', tracking: 'weight-reps', sets: [base, { ...base, id: 'b', weight: '-50' }, { ...base, id: 'c', completed: false }] },
    { id: 'd', name: 'Plank', tracking: 'duration', sets: [{ ...base, duration: '30' }] },
  ] });
  expect(result).toEqual({ volume: 400, sets: 3, incompleteSets: 1, excludedSets: 1 });
});
