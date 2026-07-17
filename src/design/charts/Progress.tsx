import { cn } from "@/lib/utils";
import { renderProgressWidget } from "../visualizations/progress";
import { TONE_STROKE_COLOR, TONE_TEXT_CLASS } from "./chartTokens";

interface ProgressBarProps {
  /** 0–100 completion. */
  percent: number;
  label?: string;
  /** Right-aligned value text; defaults to the percentage. */
  valueText?: string;
  className?: string;
}

/** Linear progress — target completion, holding duration, lifecycle. */
export function ProgressBar({ percent, label, valueText, className }: ProgressBarProps) {
  const render = renderProgressWidget(percent, { variant: "linear" });
  return (
    <div className={className}>
      {(label || valueText) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label && <span className="text-[11px] text-text-muted">{label}</span>}
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              TONE_TEXT_CLASS[render.tone],
            )}
          >
            {valueText ?? render.widthPercent}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={render.percent}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: render.widthPercent,
            backgroundColor: TONE_STROKE_COLOR[render.tone],
            transition: "width 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

interface ProgressRingProps {
  percent: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Circular progress ring with centered percentage. */
export function ProgressRing({ percent, size = 56, label, className }: ProgressRingProps) {
  const radius = 22;
  const render = renderProgressWidget(percent, { variant: "circular", radius });
  const viewBox = (radius + 5) * 2;
  const center = radius + 5;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={render.percent}
        aria-label={label}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={4}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={TONE_STROKE_COLOR[render.tone]}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={render.circumference}
          strokeDashoffset={render.dashOffset}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold tabular-nums text-text-primary">
        {Math.round(render.percent)}%
      </span>
    </div>
  );
}
