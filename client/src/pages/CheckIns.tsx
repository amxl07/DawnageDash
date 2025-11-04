import { CheckInForm } from "@/components/CheckInForm";

export default function CheckIns() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-checkins-title">Daily Check-Ins</h1>
        <p className="text-muted-foreground">Log your daily metrics to track progress and stay accountable</p>
      </div>

      <CheckInForm />
    </div>
  );
}
