import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Heart, Zap, Droplet } from "lucide-react";

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease';
  isGood: boolean;
  icon: ReactNode;
  color: string;
  details: {
    label: string;
    value: string;
  }[];
}

interface InteractiveMetricsGridProps {
  metrics: Metric[];
}

export function InteractiveMetricsGrid({ metrics }: InteractiveMetricsGridProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-interactive-metrics">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Key Performance Indicators</h3>
        <p className="text-sm text-muted-foreground">Click on any metric to see detailed breakdown</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`p-5 rounded-xl cursor-pointer transition-all ${
              selectedMetric === metric.id
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted/30 hover-elevate border border-transparent'
            }`}
            onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            data-testid={`metric-${metric.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${metric.color}`}>
                {metric.icon}
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${metric.isGood ? 'text-success' : 'text-primary'}`}>
                {metric.changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
            <p className="text-3xl font-bold font-poppins mb-3">
              {metric.value}
              <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
            </p>

            {selectedMetric === metric.id && (
              <div className="mt-4 pt-4 border-t space-y-2 animate-in fade-in duration-200">
                {metric.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{detail.label}</span>
                    <span className="font-semibold">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
