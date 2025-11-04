import { MeasurementCard } from "@/components/MeasurementCard";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Measurements() {
  const measurements = [
    {
      date: 'Jan 29, 2025',
      weekNumber: 4,
      measurements: { weight: 78.5, chest: 100, waist: 84, hip: 95, thigh: 56, arm: 34.5 },
      changes: { weight: -1.2 },
    },
    {
      date: 'Jan 22, 2025',
      weekNumber: 3,
      measurements: { weight: 79.7, chest: 101, waist: 85, hip: 96, thigh: 56.5, arm: 35 },
      changes: { weight: -1.1 },
    },
    {
      date: 'Jan 15, 2025',
      weekNumber: 2,
      measurements: { weight: 80.8, chest: 101.5, waist: 86, hip: 97, thigh: 57, arm: 35.5 },
      changes: { weight: -1.4 },
    },
    {
      date: 'Jan 8, 2025',
      weekNumber: 1,
      measurements: { weight: 82.2, chest: 102, waist: 88, hip: 98, thigh: 58, arm: 36 },
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-measurements-title">Weekly Measurements</h1>
        <p className="text-muted-foreground">Track your body composition changes and progress photos</p>
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">Progress Photos</h3>
          <p className="text-sm text-muted-foreground">Upload your weekly progress photos</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <PhotoUpload label="Front View" />
          <PhotoUpload label="Back View" />
          <PhotoUpload label="Left Side" />
          <PhotoUpload label="Right Side" />
        </div>
        <div className="flex justify-end">
          <Button className="rounded-xl" data-testid="button-save-photos">Save Photos</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Measurement History</h3>
        {measurements.map((measurement, index) => (
          <MeasurementCard key={index} {...measurement} />
        ))}
      </div>
    </div>
  );
}
