import { cn } from "@/lib/utils";
import {
  CONVICTION_BANDS,
  describeArc,
  renderGauge,
  type GaugeBand,
} from "../visualizations/gauge";
import { CHART_COLORS, TONE_STROKE_COLOR, TONE_TEXT_CLASS } from "./chartTokens";

interface GaugeChartProps {
  /** 0–100 score from an existing engine. */
  value: number;
  bands?: readonly GaugeBand[];
  size?: number;
  /** Center label under the value (e.g. "Conviction"). */
  label?: string;
  /** Show the matched band name (e.g. "Excellent"). */
  showBand?: boolean;
  className?: string;
}

/**
 * Institutional circular gauge: colored confidence bands, animated needle
 * (CSS transition — respects prefers-reduced-motion), value + band label.
 */
export function GaugeChart({
  value,
  bands = CONVICTION_BANDS,
  size = 120,
  label,
  showBand = true,
  className,
}: GaugeChartProps) {
  const render = renderGauge(value, bands);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const needleLength = radius - 6;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 0.72}
        viewBox={`0 0 ${size} ${size * 0.72}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={render.value}
        aria-label={`${label ?? "Score"}: ${render.value} (${render.band.label})`}
        className="overflow-visible"
      >
        {/* Track */}
        <path
          d={describeArc(cx, cy, radius, -110, 110)}
          fill="none"
          stroke={CHART_COLORS.track}
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* Color bands */}
        {render.segments.map((segment) => (
          <path
            key={segment.id}
            d={describeArc(cx, cy, radius, segment.startAngle, segment.endAngle)}
            fill="none"
            stroke={TONE_STROKE_COLOR[segment.tone]}
            strokeWidth={7}
            strokeLinecap="butt"
            opacity={segment.id === render.band.id ? 0.9 : 0.28}
          />
        ))}
        {/* Needle — CSS transition provides the sweep animation. */}
        <g
          style={{
            transform: `rotate(${render.needleAngle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLength}
            stroke="rgb(var(--eos-color-text-primary))"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
        <circle cx={cx} cy={cy} r={3.5} fill="rgb(var(--eos-color-text-primary))" />
      </svg>
      <div className="-mt-2 text-center">
        <p className="font-mono text-xl font-semibold tabular-nums text-text-primary">
          {Math.round(render.value)}
        </p>
        {showBand && (
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-wider",
              TONE_TEXT_CLASS[render.band.tone],
            )}
          >
            {render.band.label}
          </p>
        )}
        {label && <p className="mt-0.5 text-[10px] text-text-muted">{label}</p>}
      </div>
    </div>
  );
}
