"use client";

import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/lib/market-breadth/types";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { MetricExplain } from "./MetricExplain";
import type { MetricExplainCopy } from "./metricCopy";
import type { INTERNALS_COPY } from "./metricCopy";

export function KpiCard({
  label,
  value,
  hint,
  tone,
  metricKey,
  copy,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  metricKey?: keyof typeof INTERNALS_COPY;
  copy?: MetricExplainCopy;
}) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
          {label}
        </p>
        <MetricExplain metricKey={metricKey} copy={copy} />
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-sm font-semibold tabular-nums",
          tone ?? "text-text-primary"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TrendPill({ trend }: { trend: TrendDirection }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gain">
        <TrendingUp className="h-3 w-3" /> Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-loss">
        <TrendingDown className="h-3 w-3" /> Down
      </span>
    );
  }
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-text-muted">
        <Minus className="h-3 w-3" /> Flat
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-text-faint">Building…</span>
  );
}

export function BreadthDonut({
  advances,
  declines,
  unchanged,
}: {
  advances: number;
  declines: number;
  unchanged: number;
}) {
  const total = advances + declines + unchanged;
  if (total <= 0) {
    return (
      <div className="flex h-36 items-center justify-center text-[11px] text-text-muted">
        Awaiting quotes…
      </div>
    );
  }

  const advPct = (advances / total) * 100;
  const decPct = (declines / total) * 100;
  const uncPct = (unchanged / total) * 100;
  const r = 42;
  const c = 2 * Math.PI * r;
  const advLen = (advPct / 100) * c;
  const decLen = (decPct / 100) * c;
  const uncLen = (uncPct / 100) * c;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-surface-border"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${advLen} ${c - advLen}`}
          strokeDashoffset={0}
          className="text-gain transition-all duration-700"
          strokeLinecap="butt"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${uncLen} ${c - uncLen}`}
          strokeDashoffset={-advLen}
          className="text-text-faint transition-all duration-700"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${decLen} ${c - decLen}`}
          strokeDashoffset={-(advLen + uncLen)}
          className="text-loss transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-wider text-text-faint">
          Breadth
        </p>
        <p className="font-mono text-xl font-semibold tabular-nums text-text-primary">
          {advPct.toFixed(0)}%
        </p>
        <p className="text-[10px] text-text-muted">advancing</p>
      </div>
    </div>
  );
}

export function ParticipationBar({
  label,
  count,
  pct,
  trend,
  metricKey,
}: {
  label: string;
  count: number | null;
  pct: number | null;
  trend: TrendDirection;
  metricKey: keyof typeof INTERNALS_COPY;
}) {
  const width = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-text-secondary">
            {label}
          </span>
          <MetricExplain metricKey={metricKey} />
        </div>
        <div className="flex items-center gap-2">
          <TrendPill trend={trend} />
          <span className="font-mono text-xs tabular-nums text-text-primary">
            {count != null ? count.toLocaleString("en-IN") : "—"}
            {pct != null ? ` · ${pct.toFixed(1)}%` : ""}
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-border">
        <div
          className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-700"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function SectorHeatBar({
  name,
  advances,
  declines,
  breadth,
}: {
  name: string;
  advances: number;
  declines: number;
  breadth: number;
}) {
  const tone =
    breadth >= 55 ? "bg-gain/80" : breadth <= 45 ? "bg-loss/80" : "bg-amber-500/70";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-text-secondary">
          {name}
        </p>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-text-primary">
          {breadth.toFixed(1)}%
          <span className="ml-2 text-text-faint">
            {advances}↑ {declines}↓
          </span>
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", tone)}
          style={{ width: `${Math.min(100, Math.max(0, breadth))}%` }}
        />
      </div>
    </div>
  );
}
