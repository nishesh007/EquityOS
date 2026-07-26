"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { AreaChart, BarChart, LineChart } from "@/components/analytics/charts";
import { cn } from "@/lib/utils";
import type { WalkForwardCycleResult } from "@/lib/optimization";
import type { ChartSeries } from "@/lib/analytics/types";

export interface CycleDrawerProps {
  cycle: WalkForwardCycleResult | null;
  open: boolean;
  onClose: () => void;
}

export const CycleDrawer = memo(function CycleDrawer({
  cycle,
  open,
  onClose,
}: CycleDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  const monthly = useMemo<ChartSeries[]>(() => {
    if (!cycle) return [];
    return [
      {
        id: "m",
        label: "Monthly Return %",
        points: cycle.monthlyReturns.map((y, i) => ({
          x: i + 1,
          y,
          label: `M${i + 1}`,
        })),
      },
    ];
  }, [cycle]);

  const equity = useMemo<ChartSeries[]>(() => {
    if (!cycle) return [];
    return [
      {
        id: "eq",
        label: "Equity",
        points: cycle.equityCurve.map((y, i) => ({ x: i, y })),
      },
    ];
  }, [cycle]);

  const dd = useMemo<ChartSeries[]>(() => {
    if (!cycle) return [];
    return [
      {
        id: "dd",
        label: "Drawdown %",
        points: cycle.drawdownCurve.map((y, i) => ({ x: i, y })),
      },
    ];
  }, [cycle]);

  if (!open || !cycle) return null;
  const m = cycle.metrics;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="cycle-drawer"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close cycle details"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-surface-border-subtle bg-surface-raised shadow-[var(--eos-shadow-floating)] animate-fade-in">
        <header className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Cycle #{cycle.cycle} · {cycle.status}
            </p>
            <h2 id={titleId} className="text-sm font-semibold text-text-primary">
              Walk-Forward Fold Detail
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
              <p className="text-[10px] text-text-faint">Training Range</p>
              <p className="font-semibold text-text-primary">
                {cycle.training.start} → {cycle.training.end}
              </p>
            </div>
            <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
              <p className="text-[10px] text-text-faint">Testing Range</p>
              <p className="font-semibold text-text-primary">
                {cycle.testing.start} → {cycle.testing.end}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Parameter Set (frozen)
            </h3>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.entries(cycle.parameterLabels).map(([k, v]) => (
                <li
                  key={k}
                  className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="text-text-muted">{k}</span>
                  <p className="font-semibold text-text-primary">{v}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Performance Metrics
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(
                [
                  ["Trades", m.totalTrades],
                  ["Return", `${m.totalReturn}%`],
                  ["Win Rate", `${m.winRate}%`],
                  ["PF", m.profitFactor],
                  ["Sharpe", m.sharpe],
                  ["Sortino", m.sortino],
                  ["Max DD", `${m.maxDrawdown}%`],
                  ["CAGR", `${m.cagr}%`],
                  ["Expectancy", m.expectancy],
                  ["R:R", m.riskReward],
                  ["Recovery", m.recoveryFactor],
                  ["Calmar", m.calmarRatio],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-1.5"
                >
                  <dt className="text-[10px] text-text-faint">{label}</dt>
                  <dd className="text-xs font-semibold text-text-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {cycle.failedRules.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-loss">
                Failed Rules
              </h3>
              <ul className="mt-1 space-y-1">
                {cycle.failedRules.map((r) => (
                  <li key={r.id} className="text-[11px] text-loss">
                    ✗ {r.label}: {r.actual} (need {r.comparator} {r.threshold})
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <BarChart title="Monthly Returns" series={monthly} height={160} />
          <LineChart title="Equity Curve" series={equity} height={160} />
          <AreaChart title="Drawdown" series={dd} height={160} />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gain">
                Strengths
              </h3>
              <ul className="mt-1 space-y-1">
                {cycle.strengths.map((s) => (
                  <li key={s} className="text-[11px] text-text-secondary">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-loss">
                Weaknesses
              </h3>
              <ul className="mt-1 space-y-1">
                {cycle.weaknesses.map((s) => (
                  <li key={s} className="text-[11px] text-text-secondary">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              AI Commentary
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {cycle.aiCommentary}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Improvement Suggestions
            </h3>
            <ul className="mt-1 space-y-1">
              {cycle.suggestions.map((s) => (
                <li key={s} className={cn("text-[11px] text-text-secondary")}>
                  → {s}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
});
