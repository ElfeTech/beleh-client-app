import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export function MetricCard({ label, value, change, prefix, suffix }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        {prefix && <span className="text-sm font-medium text-muted-foreground">{prefix}</span>}
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className={cn(
          "mt-2 flex items-center gap-1 text-xs font-bold",
          isPositive ? "text-emerald-500" : isNegative ? "text-rose-500" : "text-muted-foreground"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{Math.abs(change)}%</span>
          <span className="font-medium text-muted-foreground opacity-60 ml-0.5">vs last period</span>
        </div>
      )}
    </div>
  );
}
