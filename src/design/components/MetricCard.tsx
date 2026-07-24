import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";
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
  /** Subtle tinted surface (5–8% opacity) for metric identity. */
  accent?: SectionAccent;
  className?: string;
}

/**
 * KPI / pulse metric card with optional accent tint.
 * Used for Risk, Breadth, Momentum, Liquidity, Participation, Confidence, Volatility.
 */
export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  hint,
  icon,
  accent,
  className,
}: MetricCardProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      className={cn(
        "group rounded-lg border p-4 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md",
        tokens
          ? cn(tokens.tintBg, tokens.tintBorder)
          : "border-surface-border-subtle bg-surface-overlay/50",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="data-label">{label}</span>
        {icon ? (
          <span
            className={cn(
              "data-icon transition-opacity group-hover:opacity-100",
              tokens ? tokens.text : "text-text-secondary group-hover:text-accent"
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="data-value">{value}</span>
        {change !== undefined && (
          <MetricBadge value={change} label={changeLabel} />
        )}
      </div>
      {hint ? (
        <p className="data-secondary mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
