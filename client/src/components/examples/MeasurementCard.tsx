import { MeasurementCard } from '../MeasurementCard';

export default function MeasurementCardExample() {
  return (
    <div className="p-8 bg-background space-y-6">
      <MeasurementCard
        date="Jan 15, 2025"
        weekNumber={1}
        measurements={{
          weight: 82.5,
          chest: 102,
          waist: 88,
          hip: 98,
          thigh: 58,
          arm: 36,
        }}
      />
      <MeasurementCard
        date="Jan 22, 2025"
        weekNumber={2}
        measurements={{
          weight: 81.2,
          chest: 101,
          waist: 86,
          hip: 97,
          thigh: 57,
          arm: 35.5,
        }}
        changes={{ weight: -1.3 }}
      />
    </div>
  );
}
