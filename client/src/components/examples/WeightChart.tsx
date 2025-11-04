import { WeightChart } from '../WeightChart';

export default function WeightChartExample() {
  const mockData = [
    { date: 'Week 1', weight: 82.5 },
    { date: 'Week 2', weight: 81.8 },
    { date: 'Week 3', weight: 81.2 },
    { date: 'Week 4', weight: 80.5 },
    { date: 'Week 5', weight: 79.8 },
    { date: 'Week 6', weight: 79.2 },
    { date: 'Week 7', weight: 78.5 },
  ];

  return (
    <div className="p-8 bg-background">
      <WeightChart data={mockData} />
    </div>
  );
}
