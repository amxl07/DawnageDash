import { PerformanceChart } from '../PerformanceChart';

export default function PerformanceChartExample() {
  const mockData = [
    { day: 'Mon', performance: 8, nutrition: 9, energy: 7 },
    { day: 'Tue', performance: 9, nutrition: 8, energy: 8 },
    { day: 'Wed', performance: 7, nutrition: 9, energy: 9 },
    { day: 'Thu', performance: 9, nutrition: 10, energy: 8 },
    { day: 'Fri', performance: 8, nutrition: 8, energy: 7 },
    { day: 'Sat', performance: 10, nutrition: 9, energy: 9 },
    { day: 'Sun', performance: 0, nutrition: 9, energy: 8 },
  ];

  return (
    <div className="p-8 bg-background">
      <PerformanceChart data={mockData} />
    </div>
  );
}
