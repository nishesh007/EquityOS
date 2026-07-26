"use client";

import { cn } from "@/lib/utils";
import type { OhlcvBar } from "@/lib/backtesting/dataset";
import type { TradeMarker } from "@/lib/backtesting/replay";

const MARKER_COLOR: Record<TradeMarker["kind"], string> = {
  buy: "#22c55e",
  stop_loss: "#ef4444",
  target_1: "#38bdf8",
  target_2: "#818cf8",
  target_3: "#c084fc",
  sell: "#f59e0b",
};

interface ReplayCandleChartProps {
  bars: readonly OhlcvBar[];
  markers: readonly TradeMarker[];
  className?: string;
  height?: number;
}

/**
 * Incremental candle chart — only receives already-visible bars (no future leakage).
 */
export function ReplayCandleChart({
  bars,
  markers,
  className,
  height = 280,
}: ReplayCandleChartProps) {
  const width = 720;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (bars.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-surface-border-subtle bg-surface-overlay/20 text-xs text-text-muted",
          className
        )}
        style={{ height }}
      >
        Waiting for first candle…
      </div>
    );
  }

  const lows = bars.map((b) => b.low);
  const highs = bars.map((b) => b.high);
  const minY = Math.min(...lows);
  const maxY = Math.max(...highs);
  const span = maxY - minY || 1;

  const yScale = (price: number) =>
    padding.top + (1 - (price - minY) / span) * innerH;

  const candleW = Math.max(3, Math.min(14, innerW / bars.length - 4));

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[320px]"
        role="img"
        aria-label={`Historical market replay with ${bars.length} visible candles`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const price = minY + span * (1 - t);
          const y = padding.top + t * innerH;
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgb(var(--eos-color-border))"
                strokeWidth={1}
                opacity={0.5}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-text-faint"
                fontSize={9}
              >
                {price.toFixed(0)}
              </text>
            </g>
          );
        })}

        {bars.map((bar, index) => {
          const x =
            padding.left +
            (index + 0.5) * (innerW / bars.length) -
            candleW / 2;
          const bull = bar.close >= bar.open;
          const color = bull ? "#22c55e" : "#ef4444";
          const bodyTop = yScale(Math.max(bar.open, bar.close));
          const bodyBot = yScale(Math.min(bar.open, bar.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={`${bar.timestamp}-${index}`}>
              <line
                x1={x + candleW / 2}
                x2={x + candleW / 2}
                y1={yScale(bar.high)}
                y2={yScale(bar.low)}
                stroke={color}
                strokeWidth={1.25}
              />
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={color}
                opacity={0.9}
                rx={1}
              />
            </g>
          );
        })}

        {markers.map((marker) => {
          if (marker.barIndex >= bars.length) return null;
          const x =
            padding.left +
            (marker.barIndex + 0.5) * (innerW / bars.length);
          const y = yScale(marker.price);
          const color = MARKER_COLOR[marker.kind];
          return (
            <g key={marker.id}>
              <circle cx={x} cy={y} r={5} fill={color} stroke="#0b1220" strokeWidth={1} />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill={color}
              >
                {marker.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
