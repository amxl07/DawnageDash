import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, subtitle }: MetricCardProps) {
  return (
    <Card className="p-4 sm:p-6 rounded-2xl hover-elevate transition-all duration-300" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1 sm:mb-2 truncate">{title}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-2xl sm:text-4xl font-bold font-poppins truncate" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-value`}>{value}</h3>
            {trend && (
              <div className={`flex items-center gap-1 text-xs sm:text-sm font-semibold ${trend.isPositive ? 'text-success' : 'text-primary'}`}>
                {trend.isPositive ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2 truncate">{subtitle}</p>
          )}
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-primary/10 shrink-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}
