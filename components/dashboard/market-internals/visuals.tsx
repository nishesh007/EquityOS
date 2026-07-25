"use client";

import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/lib/market-breadth/types";
import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { MetricExplain } from "./MetricExplain";
import type { MetricExplainCopy } from "./metricCopy";
import type { INTERNALS_COPY } from "./metricCopy";

type MetricTone = {
  shell: string;
  value: string;
};

const TONES = {
  neutral: {
    shell:
      "border-slate-500/35 bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(100,116,139,0.45)]",
    value: "text-slate-200",
  },
  gain: {
    shell:
      "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.5)]",
    value: "text-emerald-300",
  },
  loss: {
    shell:
      "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.5)]",
    value: "text-red-300",
  },
  accent: {
    shell:
      "border-cyan-500/35 bg-gradient-to-br from-cyan-500/15 via-cyan-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(34,211,238,0.5)]",
    value: "text-cyan-200",
  },
  amber: {
    shell:
      "border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(245,158,11,0.5)]",
    value: "text-amber-200",
  },
  indigo: {
    shell:
      "border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-indigo-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(99,102,241,0.45)]",
    value: "text-indigo-200",
  },
} as const satisfies Record<string, MetricTone>;

export type InternalsTone = keyof typeof TONES;

function isMostlyNumericValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[+\-−]?\d/.test(trimmed) && /[\d%]/.test(trimmed);
}

export function KpiCard({
  label,
  value,
  hint,
  tone,
  metricKey,
  copy,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: InternalsTone | string;
  metricKey?: keyof typeof INTERNALS_COPY;
  copy?: MetricExplainCopy;
  icon?: LucideIcon;
}) {
  const palette =
    tone && tone in TONES
      ? TONES[tone as InternalsTone]
      : tone === "text-gain"
        ? TONES.gain
        : tone === "text-loss"
          ? TONES.loss
          : TONES.neutral;
  const numeric = isMostlyNumericValue(value);

  return (
    <div className={cn("rounded-xl border px-3 py-2.5 transition-colors", palette.shell)}>
      <div className="flex items-start justify-between gap-1">
        <p className="data-label">{label}</p>
        <div className="flex items-center gap-1">
          {Icon ? (
            <Icon className={cn("data-icon h-3.5 w-3.5", palette.value)} aria-hidden />
          ) : null}
          <MetricExplain metricKey={metricKey} copy={copy} />
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 font-bold tracking-tight",
          numeric
            ? "text-[24px] leading-none sm:text-[26px]"
            : "text-[18px] leading-tight sm:text-[20px]",
          palette.value
        )}
      >
        {value}
      </p>
      {hint ? <p className="data-secondary mt-1">{hint}</p> : null}
    </div>
  );
}

export function TrendPill({ trend }: { trend: TrendDirection }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gain">
        <TrendingUp className="data-icon h-3.5 w-3.5" /> Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-loss">
        <TrendingDown className="data-icon h-3.5 w-3.5" /> Down
      </span>
    );
  }
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-text-secondary">
        <Minus className="data-icon h-3.5 w-3.5" /> Flat
      </span>
    );
  }
  return (
    <span className="data-secondary">Building…</span>
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
      <div className="flex h-36 items-center justify-center data-secondary">
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
        <p className="data-label">Breadth</p>
        <p className="mt-1 font-mono text-[24px] font-bold leading-none tabular-nums text-text-primary sm:text-[26px]">
          {advPct.toFixed(0)}%
        </p>
        <p className="data-secondary mt-1">advancing</p>
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
  const tone =
    pct == null
      ? "bg-surface-border"
      : pct >= 55
        ? "bg-emerald-500/80"
        : pct <= 45
          ? "bg-red-500/70"
          : "bg-amber-500/70";

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        TONES.accent.shell
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="data-label">{label}</span>
          <MetricExplain metricKey={metricKey} />
        </div>
        <div className="flex items-center gap-2">
          <TrendPill trend={trend} />
          <span className="font-mono text-[15px] font-semibold tabular-nums text-text-primary">
            {count != null ? count.toLocaleString("en-IN") : "—"}
            {pct != null ? ` · ${pct.toFixed(1)}%` : ""}
          </span>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-border/80">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", tone)}
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
        <p className="truncate text-[13px] font-medium text-text-secondary">
          {name}
        </p>
        <p className="shrink-0 font-mono text-[13px] font-medium tabular-nums text-text-primary">
          {breadth.toFixed(1)}%
          <span className="ml-2 text-text-secondary">
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
