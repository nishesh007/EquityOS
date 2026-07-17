import { cn } from "@/lib/utils";

interface HeatMeterProps {
  /** Position on the meter, 0–100. */
  value: number;
  /** Left/right extreme labels (e.g. "Bearish" / "Bullish"). */
  lowLabel?: string;
  highLabel?: string;
  /** Center readout (e.g. the A/D ratio). */
  valueText?: string;
  label?: string;
  className?: string;
}

/** Linear heat meter — cold→hot gradient band with a position marker. */
export function HeatMeter({
  value,
  lowLabel,
  highLabel,
  valueText,
  label,
  className,
}: HeatMeterProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label ?? "Heat meter"}
      className={className}
    >
      {(label || valueText) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-[11px] text-text-muted">{label}</span>}
          {valueText && (
            <span className="font-mono text-[11px] font-semibold tabular-nums text-text-primary">
              {valueText}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <div
          className="h-2 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgb(var(--eos-color-danger)), rgb(var(--eos-color-warning)), rgb(var(--eos-color-muted)), rgb(var(--eos-color-success-muted)), rgb(var(--eos-color-success)))",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-text-primary shadow-floating"
          style={{
            left: `${clamped}%`,
            transition: "left 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-text-faint">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
