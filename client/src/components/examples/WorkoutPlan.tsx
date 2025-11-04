import { WorkoutPlan } from '../WorkoutPlan';

export default function WorkoutPlanExample() {
  const mockPlan = [
    {
      day: 'Monday',
      focus: 'Chest & Triceps',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Tricep Dips', sets: 3, reps: '10-12', rest: '60s' },
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Back & Biceps',
      exercises: [
        { name: 'Deadlifts', sets: 4, reps: '6-8', rest: '120s' },
        { name: 'Pull-ups', sets: 3, reps: '8-10', rest: '90s' },
        { name: 'Barbell Rows', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Bicep Curls', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
    {
      day: 'Friday',
      focus: 'Legs & Shoulders',
      exercises: [
        { name: 'Squats', sets: 4, reps: '8-10', rest: '120s' },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest: '90s' },
        { name: 'Overhead Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '60s' },
      ],
    },
  ];

  return (
    <div className="p-8 bg-background">
      <WorkoutPlan weeklyPlan={mockPlan} />
    </div>
  );
}
