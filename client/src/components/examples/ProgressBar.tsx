import { ProgressBar } from '../ProgressBar';

export default function ProgressBarExample() {
  return (
    <div className="p-8 bg-background space-y-6 max-w-md">
      <ProgressBar value={7500} max={10000} label="Daily Steps Goal" variant="success" />
      <ProgressBar value={8} max={10} label="Nutrition Score" variant="gold" />
      <ProgressBar value={4} max={6} label="Workouts This Week" variant="primary" />
    </div>
  );
}
