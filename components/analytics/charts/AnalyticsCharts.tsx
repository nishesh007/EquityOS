"use client";

import { ChartFrame } from "@/components/analytics/charts/ChartFrame";
import {
  buildAreaPath,
  buildLinePath,
  CHART_COLORS,
  computeBounds,
  project,
  seriesColor,
  numericX,
} from "@/components/analytics/charts/chart-utils";
import type {
  ChartSeries,
  ChartSlice,
  HeatmapCell,
  TimelineChartEvent,
} from "@/lib/analytics/types";
import { Heatmap as DesignHeatmap } from "@/src/design/charts/Heatmap";
import { cn } from "@/lib/utils";

interface BaseChartProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export function LineChart({
  series,
  title,
  subtitle,
  loading,
  className,
  width = 560,
  height = 220,
}: BaseChartProps & { series: readonly ChartSeries[] }) {
  const bounds = computeBounds(series);
  const empty = !bounds || series.every((s) => s.points.length === 0);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={height}
      legend={
        <div className="flex flex-wrap gap-2">
          {series.map((s, i) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-[10px] text-text-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: seriesColor(i, s.color) }}
              />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      {!empty && bounds ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title ?? "Line chart"}
        >
          <line
            x1={24}
            y1={height - 24}
            x2={width - 24}
            y2={height - 24}
            stroke={CHART_COLORS.grid}
            strokeWidth={1}
          />
          {series.map((s, i) => (
            <path
              key={s.id}
              d={buildLinePath(s.points, bounds, width, height)}
              fill="none"
              stroke={seriesColor(i, s.color)}
              strokeWidth={s.secondary ? 1.25 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.secondary ? 0.7 : 1}
            />
          ))}
        </svg>
      ) : null}
    </ChartFrame>
  );
}

export function AreaChart({
  series,
  title,
  subtitle,
  loading,
  className,
  width = 560,
  height = 220,
}: BaseChartProps & { series: readonly ChartSeries[] }) {
  const primary = series[0];
  const bounds = computeBounds(series);
  const empty = !primary || !bounds || primary.points.length === 0;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={height}
    >
      {!empty && bounds && primary ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title ?? "Area chart"}
        >
          <path
            d={buildAreaPath(primary.points, bounds, width, height)}
            fill={seriesColor(0, primary.color)}
            opacity={0.15}
          />
          <path
            d={buildLinePath(primary.points, bounds, width, height)}
            fill="none"
            stroke={seriesColor(0, primary.color)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </ChartFrame>
  );
}

export function BarChart({
  series,
  title,
  subtitle,
  loading,
  className,
  width = 560,
  height = 220,
}: BaseChartProps & { series: readonly ChartSeries[] }) {
  const primary = series[0];
  const points = primary?.points ?? [];
  const empty = points.length === 0;
  const maxY = Math.max(...points.map((p) => Math.abs(p.y)), 1);
  const padding = 24;
  const innerW = width - padding * 2;
  const barW = Math.max(4, innerW / Math.max(points.length, 1) - 6);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={height}
    >
      {!empty ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title ?? "Bar chart"}
        >
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke={CHART_COLORS.grid}
            strokeWidth={1}
          />
          {points.map((point, index) => {
            const x =
              padding +
              (index + 0.5) * (innerW / points.length) -
              barW / 2;
            const magnitude = (Math.abs(point.y) / maxY) * ((height - padding * 2) / 2);
            const y = point.y >= 0 ? height / 2 - magnitude : height / 2;
            return (
              <rect
                key={`${point.x}-${index}`}
                x={x}
                y={y}
                width={barW}
                height={Math.max(1, magnitude)}
                rx={2}
                fill={
                  point.y >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative
                }
              />
            );
          })}
        </svg>
      ) : null}
    </ChartFrame>
  );
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function PieChart({
  slices,
  title,
  subtitle,
  loading,
  className,
  size = 180,
}: BaseChartProps & { slices: readonly ChartSlice[]; size?: number }) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const empty = total <= 0;

  let angle = 0;
  const arcs = slices.map((slice, index) => {
    const sweep = (Math.max(0, slice.value) / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...slice,
      start,
      end,
      color: seriesColor(index, slice.color),
    };
  });

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={size + 24}
      legend={
        <div className="flex flex-col gap-1">
          {slices.map((slice, i) => (
            <span
              key={slice.id}
              className="inline-flex items-center gap-1.5 text-[10px] text-text-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: seriesColor(i, slice.color) }}
              />
              {slice.label}
            </span>
          ))}
        </div>
      }
    >
      {!empty ? (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto"
          role="img"
          aria-label={title ?? "Pie chart"}
        >
          {arcs.map((arc) => {
            if (arc.end - arc.start >= 359.9) {
              return (
                <circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={size * 0.38}
                  fill={arc.color}
                />
              );
            }
            const path = `${describeArc(size / 2, size / 2, size * 0.38, arc.start, arc.end)} L ${size / 2} ${size / 2} Z`;
            return <path key={arc.id} d={path} fill={arc.color} />;
          })}
        </svg>
      ) : null}
    </ChartFrame>
  );
}

export function DonutChart({
  slices,
  title,
  subtitle,
  loading,
  className,
  size = 180,
  centerLabel,
}: BaseChartProps & {
  slices: readonly ChartSlice[];
  size?: number;
  centerLabel?: string;
}) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const empty = total <= 0;
  let angle = 0;
  const arcs = slices.map((slice, index) => {
    const sweep = (Math.max(0, slice.value) / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...slice,
      start,
      end,
      color: seriesColor(index, slice.color),
    };
  });

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={size + 24}
    >
      {!empty ? (
        <div className="relative mx-auto" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={title ?? "Donut chart"}
          >
            {arcs.map((arc) => (
              <path
                key={arc.id}
                d={describeArc(size / 2, size / 2, size * 0.38, arc.start, arc.end)}
                fill="none"
                stroke={arc.color}
                strokeWidth={size * 0.12}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          {centerLabel ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-sm font-semibold text-text-primary">
                {centerLabel}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </ChartFrame>
  );
}

export function HeatmapChart({
  cells,
  title,
  subtitle,
  loading,
  className,
  domain,
  columns = 4,
}: BaseChartProps & {
  cells: readonly HeatmapCell[];
  domain?: [number, number];
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={cells.length === 0}
      className={className}
    >
      <DesignHeatmap cells={cells} domain={domain} columns={columns} />
    </ChartFrame>
  );
}

export function TimelineChart({
  events,
  title,
  subtitle,
  loading,
  className,
}: BaseChartProps & { events: readonly TimelineChartEvent[] }) {
  const toneClass = {
    positive: "bg-gain",
    negative: "bg-loss",
    neutral: "bg-text-faint",
    accent: "bg-accent",
  } as const;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={events.length === 0}
      emptyMessage="No timeline events."
      className={className}
    >
      <ol className="space-y-0">
        {events.map((event, index) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex w-4 flex-col items-center">
              <span
                className={cn(
                  "mt-1 h-2 w-2 rounded-full",
                  toneClass[event.tone ?? "accent"]
                )}
              />
              {index < events.length - 1 ? (
                <span className="my-1 w-px flex-1 bg-surface-border" />
              ) : null}
            </div>
            <div className="pb-3">
              <p className="text-xs font-medium text-text-secondary">
                {event.label}
              </p>
              <p className="font-mono text-[11px] tabular-nums text-text-muted">
                {new Date(event.at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}

/** Equity curve = area + optional benchmark overlay. */
export function EquityCurveChart({
  series,
  title = "Equity Curve",
  subtitle,
  loading,
  className,
  width = 560,
  height = 240,
}: BaseChartProps & { series: readonly ChartSeries[] }) {
  const bounds = computeBounds(series);
  const empty = !bounds || series.every((s) => s.points.length === 0);
  const primary = series[0];

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={empty}
      className={className}
      height={height}
      legend={
        <div className="flex flex-wrap gap-2">
          {series.map((s, i) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-[10px] text-text-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: seriesColor(i, s.color) }}
              />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      {!empty && bounds && primary ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title}
        >
          <path
            d={buildAreaPath(primary.points, bounds, width, height)}
            fill={seriesColor(0, primary.color)}
            opacity={0.12}
          />
          {series.map((s, i) => (
            <g key={s.id}>
              <path
                d={buildLinePath(s.points, bounds, width, height)}
                fill="none"
                stroke={seriesColor(i, s.color)}
                strokeWidth={s.secondary ? 1.25 : 2}
                strokeDasharray={s.secondary ? "4 3" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.points.length > 0
                ? (() => {
                    const last = s.points[s.points.length - 1];
                    const { px, py } = project(
                      bounds,
                      numericX(last, s.points.length - 1),
                      last.y,
                      width,
                      height
                    );
                    return (
                      <circle
                        cx={px}
                        cy={py}
                        r={3}
                        fill={seriesColor(i, s.color)}
                      />
                    );
                  })()
                : null}
            </g>
          ))}
        </svg>
      ) : null}
    </ChartFrame>
  );
}
