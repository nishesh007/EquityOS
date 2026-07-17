import { cn } from "@/lib/utils";
import {
  renderAllocationChart,
  type AllocationSliceInput,
} from "../visualizations/allocation";
import { CHART_COLORS, CHART_SERIES_COLORS } from "./chartTokens";

interface AllocationRingProps {
  slices: readonly AllocationSliceInput[];
  size?: number;
  /** Center primary label (e.g. total value). */
  centerLabel?: string;
  centerCaption?: string;
  /** Renders a legend with percentages next to the ring. */
  legend?: boolean;
  className?: string;
}

/** Donut allocation chart with legend — sector/capital/risk allocation. */
export function AllocationRing({
  slices,
  size = 128,
  centerLabel,
  centerCaption,
  legend = true,
  className,
}: AllocationRingProps) {
  const radius = 40;
  const render = renderAllocationChart(slices, { radius });
  if (render.empty) return null;

  const strokeWidth = 12;
  const viewBox = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        role="img"
        aria-label={`Allocation across ${render.segments.length} segments`}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={CHART_COLORS.track}
          strokeWidth={strokeWidth}
        />
        {render.segments.map((segment, index) => (
          <circle
            key={segment.id}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.dashLength} ${render.circumference - segment.dashLength}`}
            strokeDashoffset={segment.dashOffset}
            style={{ transition: "stroke-dasharray 500ms cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        ))}
      </svg>
      <div className="min-w-0">
        {centerLabel && (
          <p className="font-mono text-base font-semibold tabular-nums text-text-primary">
            {centerLabel}
          </p>
        )}
        {centerCaption && (
          <p className="text-[10px] uppercase tracking-wider text-text-muted">
            {centerCaption}
          </p>
        )}
        {legend && (
          <ul className="mt-2 space-y-1">
            {render.segments.map((segment, index) => (
              <li key={segment.id} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
                  }}
                />
                <span className="truncate text-text-secondary">{segment.label}</span>
                <span className="ml-auto font-mono tabular-nums text-text-muted">
                  {segment.percent}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
