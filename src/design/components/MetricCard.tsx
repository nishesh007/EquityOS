import { cn } from "@/lib/utils";
import { InstitutionalCard } from "./InstitutionalCard";
import { MetricBadge } from "./MetricBadge";

interface MetricCardProps {
  label: string;
  value: string;
  /** Signed change; renders a directional badge when provided. */
  change?: number;
  /** Pre-formatted change label (defaults to signed percent). */
  changeLabel?: string;
  /** Small caption under the value (e.g. period, source). */
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

/** KPI card: label, prominent numeric value and optional change badge. */
export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  hint,
  icon,
  className,
}: MetricCardProps) {
  return (
    <InstitutionalCard className={className}>
      <div className="flex items-start justify-between gap-2">
        <span className="data-label">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
          {value}
        </span>
        {change !== undefined && (
          <MetricBadge value={change} label={changeLabel} />
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </InstitutionalCard>
  );
}
