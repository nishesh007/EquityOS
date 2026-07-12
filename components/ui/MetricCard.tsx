import { cn } from "@/lib/utils";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";

interface MetricCardProps {
  label: string;
  value: string;
  growth?: number;
  subValue?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  growth,
  subValue,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4 transition-colors hover:bg-surface-overlay/60",
        className
      )}
    >
      <p className="data-label">{label}</p>
      <p className="mt-2 text-lg font-semibold font-mono text-text-primary tabular-nums">
        {value}
      </p>
      {(growth !== undefined || subValue) && (
        <div className="mt-1.5 flex items-center gap-2">
          {growth !== undefined && (
            <ChangeIndicator value={growth} size="sm" showIcon={false} />
          )}
          {subValue && (
            <span className="text-[10px] text-text-faint">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
}
