interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  showPercentage?: boolean;
  variant?: 'success' | 'primary' | 'gold';
}

export function ProgressBar({ value, max, label, showPercentage = true, variant = 'success' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    success: 'bg-success shadow-[0_0_10px_rgba(0,210,106,0.4)]',
    primary: 'bg-primary shadow-[0_0_10px_rgba(240,78,69,0.4)]',
    gold: 'bg-gold shadow-[0_0_10px_rgba(246,200,90,0.4)]',
  };

  return (
    <div className="space-y-2" data-testid={`progress-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground font-poppins">{Math.round(percentage)}%</span>
        )}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
