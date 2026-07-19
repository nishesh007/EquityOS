"use client";

import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { OhlcBar } from "@/lib/providers/types";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  bollinger,
  emaSeries,
  relativeReturns,
  sma,
  vwapSeries,
} from "./indicatorMath";
import type {
  ChartDrawing,
  ChartToolId,
  IndicatorConfig,
  WorkspaceTimeframe,
} from "./types";

interface InstitutionalCandlestickProps {
  candles: OhlcBar[];
  timeframe: WorkspaceTimeframe;
  symbol: string;
  liveQuote?: EnrichedQuote;
  indicators: IndicatorConfig[];
  drawings: ChartDrawing[];
  tool: ChartToolId;
  compareMode?: boolean;
  compareCloses?: number[];
  onDrawingsChange: (next: ChartDrawing[]) => void;
  className?: string;
  compact?: boolean;
}

function uid(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function InstitutionalCandlestick({
  candles,
  timeframe,
  symbol,
  liveQuote,
  indicators,
  drawings,
  tool,
  compareMode,
  compareCloses,
  onDrawingsChange,
  className,
  compact,
}: InstitutionalCandlestickProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 920;
  const height = compact ? 280 : 380;
  const chartTop = 16;
  const chartBottom = compact ? 200 : 280;
  const volumeTop = compact ? 220 : 304;
  const volumeBottom = compact ? 260 : 344;

  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const enabled = useMemo(
    () => new Set(indicators.filter((i) => i.enabled).map((i) => i.id)),
    [indicators]
  );
  const colorOf = useCallback(
    (id: string) => indicators.find((i) => i.id === id)?.color ?? "#94a3b8",
    [indicators]
  );

  const overlayLines = useMemo(() => {
    const lines: { color: string; values: (number | null)[] }[] = [];
    if (enabled.has("sma20")) {
      lines.push({ color: colorOf("sma20"), values: sma(closes, 20) });
    }
    if (enabled.has("sma50")) {
      lines.push({ color: colorOf("sma50"), values: sma(closes, 50) });
    }
    if (enabled.has("ema20")) {
      lines.push({ color: colorOf("ema20"), values: emaSeries(closes, 20) });
    }
    if (enabled.has("ema50")) {
      lines.push({ color: colorOf("ema50"), values: emaSeries(closes, 50) });
    }
    if (enabled.has("vwap")) {
      lines.push({ color: colorOf("vwap"), values: vwapSeries(candles) });
    }
    if (enabled.has("bollinger")) {
      const bb = bollinger(closes, 20, 2);
      lines.push({ color: colorOf("bollinger"), values: bb.upper });
      lines.push({ color: colorOf("bollinger"), values: bb.lower });
    }
    return lines;
  }, [candles, closes, enabled, colorOf]);

  const showVolume = enabled.has("volume");

  if (candles.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[200px] flex-col items-center justify-center text-center",
          className
        )}
      >
        <p className="text-sm font-medium text-text-secondary">
          Chart unavailable
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Historical data unavailable for {symbol}
        </p>
      </div>
    );
  }

  const minLow = Math.min(...candles.map((c) => c.low));
  const maxHigh = Math.max(...candles.map((c) => c.high));
  const overlayVals = overlayLines
    .flatMap((l) => l.values)
    .filter((v): v is number => v != null);
  const yMin = Math.min(minLow, ...overlayVals, minLow);
  const yMax = Math.max(maxHigh, ...overlayVals, maxHigh);
  const priceRange = Math.max(yMax - yMin, 1);
  const maxVolume = Math.max(...candles.map((c) => c.volume), 1);
  const step = width / candles.length;
  const candleWidth = Math.max(3, Math.min(12, step * 0.55));

  const yForPrice = (price: number) =>
    chartBottom - ((price - yMin) / priceRange) * (chartBottom - chartTop);

  const toNorm = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const fromNorm = (p: { x: number; y: number }) => ({
    x: p.x * width,
    y: p.y * height,
  });

  const onPointerMove = (event: React.PointerEvent) => {
    const norm = toNorm(event.clientX, event.clientY);
    const pt = fromNorm(norm);
    if (tool === "crosshair" || tool === "cursor" || tool === "measure") {
      setCrosshair(pt);
      const idx = Math.min(
        candles.length - 1,
        Math.max(0, Math.floor(norm.x * candles.length))
      );
      setHoverIndex(idx);
    }
  };

  const onPointerLeave = () => {
    setCrosshair(null);
    setHoverIndex(null);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (
      tool === "cursor" ||
      tool === "crosshair" ||
      tool === "screenshot"
    ) {
      return;
    }
    const norm = toNorm(event.clientX, event.clientY);
    const drawingTools: ChartToolId[] = [
      "trend",
      "horizontal",
      "vertical",
      "rectangle",
      "fibonacci",
      "text",
      "measure",
    ];
    if (!drawingTools.includes(tool)) return;

    const nextDraft = [...draft, norm];
    const needsTwo =
      tool === "trend" ||
      tool === "rectangle" ||
      tool === "fibonacci" ||
      tool === "measure";
    const needsOne =
      tool === "horizontal" || tool === "vertical" || tool === "text";

    if (needsOne && nextDraft.length >= 1) {
      const kind =
        tool === "horizontal"
          ? "horizontal"
          : tool === "vertical"
            ? "vertical"
            : "text";
      const label =
        tool === "text"
          ? window.prompt("Annotation text", "Note") ?? "Note"
          : undefined;
      onDrawingsChange([
        ...drawings,
        {
          id: uid(),
          kind,
          points: [nextDraft[0]],
          label: label ?? undefined,
          locked: false,
          hidden: false,
          color: "#38bdf8",
          createdAt: Date.now(),
        },
      ]);
      setDraft([]);
      return;
    }

    if (needsTwo && nextDraft.length >= 2) {
      onDrawingsChange([
        ...drawings,
        {
          id: uid(),
          kind: tool as ChartDrawing["kind"],
          points: nextDraft.slice(0, 2),
          locked: false,
          hidden: false,
          color: tool === "fibonacci" ? "#fbbf24" : "#38bdf8",
          createdAt: Date.now(),
        },
      ]);
      setDraft([]);
      return;
    }

    setDraft(nextDraft);
  };

  const formatAxisPrice = (price: number) =>
    `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const axisPrices = [yMax, (yMax + yMin) / 2, yMin];
  const hover = hoverIndex != null ? candles[hoverIndex] : null;
  const rel = compareMode ? relativeReturns(closes) : null;
  const compareRel =
    compareMode && compareCloses && compareCloses.length > 0
      ? relativeReturns(compareCloses)
      : null;

  const pathFor = (values: (number | null)[]) => {
    let d = "";
    values.forEach((v, i) => {
      if (v == null) return;
      const x = i * step + step / 2;
      const y = yForPrice(v);
      d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
    });
    return d;
  };

  return (
    <div
      className={cn(
        "relative h-full w-full select-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_40%)]",
        className
      )}
    >
      <div className="absolute left-3 top-2 z-10 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-surface-border-subtle bg-surface/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary backdrop-blur">
          {symbol} · {timeframe}
        </span>
        {liveQuote?.price != null ? (
          <span className="font-mono text-[11px] tabular-nums text-text-primary">
            ₹{liveQuote.price.toLocaleString("en-IN")}
            {liveQuote.changePercent != null ? (
              <span
                className={
                  liveQuote.changePercent >= 0 ? " text-gain" : " text-loss"
                }
              >
                {" "}
                {liveQuote.changePercent >= 0 ? "+" : ""}
                {liveQuote.changePercent.toFixed(2)}%
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {hover ? (
        <div className="absolute right-3 top-2 z-10 rounded-md border border-surface-border bg-card/95 px-2 py-1 text-[10px] font-mono tabular-nums text-text-secondary shadow-dropdown backdrop-blur">
          O {hover.open.toFixed(1)} · H {hover.high.toFixed(1)} · L{" "}
          {hover.low.toFixed(1)} · C {hover.close.toFixed(1)}
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full touch-none"
        role="img"
        aria-label={`Candlestick chart ${symbol} ${timeframe}`}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
      >
        {axisPrices.map((price) => {
          const y = yForPrice(price);
          return (
            <g key={price}>
              <line
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 6"
              />
              <text
                x={width - 4}
                y={y - 4}
                textAnchor="end"
                fill="rgba(161,161,170,0.7)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {formatAxisPrice(price)}
              </text>
            </g>
          );
        })}

        {candles.map((candle, index) => {
          const x = index * step + step / 2;
          const openY = yForPrice(candle.open);
          const closeY = yForPrice(candle.close);
          const highY = yForPrice(candle.high);
          const lowY = yForPrice(candle.low);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
          const volumeHeight =
            (candle.volume / maxVolume) * (volumeBottom - volumeTop);
          const bullish = candle.close >= candle.open;
          const color = bullish ? "#22c55e" : "#ef4444";

          return (
            <g key={`${candle.timestamp}-${index}`}>
              <line
                x1={x}
                x2={x}
                y1={highY}
                y2={lowY}
                stroke={color}
                strokeWidth="1.4"
                opacity="0.85"
              />
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                rx="1.5"
                fill={bullish ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)"}
              />
              {showVolume ? (
                <rect
                  x={x - candleWidth / 2}
                  y={volumeBottom - volumeHeight}
                  width={candleWidth}
                  height={volumeHeight}
                  rx="1"
                  fill={
                    bullish ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"
                  }
                />
              ) : null}
            </g>
          );
        })}

        {overlayLines.map((line, li) => (
          <path
            key={li}
            d={pathFor(line.values)}
            fill="none"
            stroke={line.color}
            strokeWidth="1.5"
            opacity="0.9"
          />
        ))}

        {compareMode && rel ? (
          <path
            d={pathFor(rel.map((r) => yMin + ((r + 20) / 40) * priceRange))}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.25"
            strokeDasharray="4 3"
            opacity="0.7"
          />
        ) : null}
        {compareRel ? (
          <path
            d={pathFor(
              compareRel.map((r) => yMin + ((r + 20) / 40) * priceRange)
            )}
            fill="none"
            stroke="#f472b6"
            strokeWidth="1.25"
            strokeDasharray="4 3"
            opacity="0.7"
          />
        ) : null}

        {drawings
          .filter((d) => !d.hidden)
          .map((drawing) => {
            const pts = drawing.points.map(fromNorm);
            if (drawing.kind === "horizontal" && pts[0]) {
              return (
                <line
                  key={drawing.id}
                  x1={0}
                  x2={width}
                  y1={pts[0].y}
                  y2={pts[0].y}
                  stroke={drawing.color}
                  strokeWidth="1.25"
                  strokeDasharray={drawing.locked ? undefined : "6 4"}
                />
              );
            }
            if (drawing.kind === "vertical" && pts[0]) {
              return (
                <line
                  key={drawing.id}
                  x1={pts[0].x}
                  x2={pts[0].x}
                  y1={0}
                  y2={height}
                  stroke={drawing.color}
                  strokeWidth="1.25"
                  strokeDasharray={drawing.locked ? undefined : "6 4"}
                />
              );
            }
            if (
              (drawing.kind === "trend" || drawing.kind === "measure") &&
              pts[0] &&
              pts[1]
            ) {
              return (
                <g key={drawing.id}>
                  <line
                    x1={pts[0].x}
                    y1={pts[0].y}
                    x2={pts[1].x}
                    y2={pts[1].y}
                    stroke={drawing.color}
                    strokeWidth="1.5"
                  />
                  {drawing.kind === "measure" ? (
                    <text
                      x={(pts[0].x + pts[1].x) / 2}
                      y={(pts[0].y + pts[1].y) / 2 - 6}
                      fill={drawing.color}
                      fontSize="10"
                      textAnchor="middle"
                    >
                      Measure
                    </text>
                  ) : null}
                </g>
              );
            }
            if (drawing.kind === "rectangle" && pts[0] && pts[1]) {
              const x = Math.min(pts[0].x, pts[1].x);
              const y = Math.min(pts[0].y, pts[1].y);
              const w = Math.abs(pts[1].x - pts[0].x);
              const h = Math.abs(pts[1].y - pts[0].y);
              return (
                <rect
                  key={drawing.id}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={`${drawing.color}22`}
                  stroke={drawing.color}
                  strokeWidth="1.25"
                />
              );
            }
            if (drawing.kind === "fibonacci" && pts[0] && pts[1]) {
              const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
              return (
                <g key={drawing.id}>
                  {levels.map((level) => {
                    const y = pts[0].y + (pts[1].y - pts[0].y) * level;
                    return (
                      <g key={level}>
                        <line
                          x1={Math.min(pts[0].x, pts[1].x)}
                          x2={Math.max(pts[0].x, pts[1].x)}
                          y1={y}
                          y2={y}
                          stroke={drawing.color}
                          strokeWidth="1"
                          opacity="0.85"
                        />
                        <text
                          x={Math.max(pts[0].x, pts[1].x) + 4}
                          y={y - 2}
                          fill={drawing.color}
                          fontSize="9"
                        >
                          {(level * 100).toFixed(1)}%
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            }
            if (drawing.kind === "text" && pts[0]) {
              return (
                <text
                  key={drawing.id}
                  x={pts[0].x}
                  y={pts[0].y}
                  fill={drawing.color}
                  fontSize="12"
                  fontWeight="600"
                >
                  {drawing.label ?? "Note"}
                </text>
              );
            }
            return null;
          })}

        {draft.map((p, i) => {
          const pt = fromNorm(p);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill="#38bdf8"
            />
          );
        })}

        {crosshair && (tool === "crosshair" || tool === "measure") ? (
          <g pointerEvents="none">
            <line
              x1={crosshair.x}
              x2={crosshair.x}
              y1={0}
              y2={height}
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1"
            />
            <line
              x1={0}
              x2={width}
              y1={crosshair.y}
              y2={crosshair.y}
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
