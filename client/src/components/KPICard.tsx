import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}

const accentMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
};

export function KPICard({ label, value, delta, deltaLabel, icon, accent = 'blue', className }: KPICardProps) {
  const isPos = delta !== undefined && delta > 0;
  const isNeg = delta !== undefined && delta < 0;

  return (
    <div className={cn(
      'kpi-card module-card bg-card border border-border rounded-lg p-4',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <p className="text-xl font-bold text-foreground tabular-nums truncate">{value}</p>
          {delta !== undefined && (
            <div className="flex items-center gap-1 mt-1.5">
              {isPos && <TrendingUp className="w-3 h-3 text-green-500" />}
              {isNeg && <TrendingDown className="w-3 h-3 text-red-500" />}
              {!isPos && !isNeg && <Minus className="w-3 h-3 text-muted-foreground" />}
              <span className={cn(
                'text-xs font-medium',
                isPos && 'text-green-600 dark:text-green-400',
                isNeg && 'text-red-600 dark:text-red-400',
                !isPos && !isNeg && 'text-muted-foreground'
              )}>
                {isPos && '+'}{delta}%
              </span>
              {deltaLabel && <span className="text-xs text-muted-foreground">{deltaLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2 shrink-0', accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
