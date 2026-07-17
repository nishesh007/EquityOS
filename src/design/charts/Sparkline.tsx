import { cn } from "@/lib/utils";
import { renderSparkline } from "../visualizations/sparkline";
import { CHART_COLORS } from "./chartTokens";

interface SparklineProps {
  data: readonly number[];
  width?: number;
  height?: number;
  /** Overrides trend-based coloring. */
  positive?: boolean;
  /** Draws a soft area fill under the line. */
  area?: boolean;
  className?: string;
}

/** Theme-aware sparkline for KPI tiles and snapshot cards. */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  positive,
  area = true,
  className,
}: SparklineProps) {
  const render = renderSparkline(data, { width, height });
  if (render.empty) return null;

  const isPositive = positive ?? render.trend !== "down";
  const stroke = isPositive ? CHART_COLORS.positive : CHART_COLORS.negative;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`Trend ${render.trend}, ${render.changePercent}%`}
    >
      {area && (
        <path d={render.areaPath} fill={stroke} opacity={0.12} stroke="none" />
      )}
      <path
        d={render.path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
