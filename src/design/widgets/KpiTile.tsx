import { cn } from "@/lib/utils";
import { Sparkline } from "../charts/Sparkline";
import { MetricBadge } from "../components/MetricBadge";
import { StatusBadge, type StatusTone } from "../components/StatusBadge";

interface KpiTileProps {
  label: string;
  /** Primary metric, pre-formatted. */
  value: string;
  /** Secondary metric line (e.g. "Invested ₹4.2L"). */
  secondary?: string;
  /** Signed delta driving the trend badge. */
  delta?: number;
  deltaLabel?: string;
  /** Status pill (e.g. LIVE, DELAYED). */
  status?: string;
  statusTone?: StatusTone;
  /** Mini sparkline series. */
  trend?: readonly number[];
  className?: string;
}

/** Institutional KPI tile: primary + secondary metric, delta, status, trend. */
export function KpiTile({
  label,
  value,
  secondary,
  delta,
  deltaLabel,
  status,
  statusTone = "neutral",
  trend,
  className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="data-label">{label}</p>
        {status && <StatusBadge tone={statusTone}>{status}</StatusBadge>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="data-value text-lg font-semibold">{value}</p>
        {delta !== undefined && <MetricBadge value={delta} label={deltaLabel} />}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        {secondary ? (
          <p className="text-[11px] text-text-muted">{secondary}</p>
        ) : (
          <span />
        )}
        {trend && trend.length > 1 && (
          <Sparkline data={trend} width={64} height={20} positive={(delta ?? 0) >= 0} />
        )}
      </div>
    </div>
  );
}
