"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { BarChart, PieChart } from "@/components/analytics/charts";
import { cn } from "@/lib/utils";
import type { OptimizationResult } from "@/lib/optimization";
import type { ChartSeries, ChartSlice } from "@/lib/analytics/types";

export interface ResultDrawerProps {
  result: OptimizationResult | null;
  open: boolean;
  onClose: () => void;
}

export const ResultDrawer = memo(function ResultDrawer({
  result,
  open,
  onClose,
}: ResultDrawerProps) {
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

  const monthlySeries = useMemo<ChartSeries[]>(() => {
    if (!result) return [];
    return [
      {
        id: "monthly",
        label: "Monthly Return %",
        points: result.monthlyReturns.map((y, i) => ({
          x: i + 1,
          y,
          label: `M${i + 1}`,
        })),
      },
    ];
  }, [result]);

  const distSlices = useMemo<ChartSlice[]>(() => {
    if (!result) return [];
    return [
      {
        id: "wins",
        label: "Wins",
        value: result.tradeDistribution.wins,
      },
      {
        id: "losses",
        label: "Losses",
        value: result.tradeDistribution.losses,
      },
      {
        id: "flat",
        label: "Breakeven",
        value: result.tradeDistribution.breakeven,
      },
    ];
  }, [result]);

  if (!open || !result) return null;

  const m = result.metrics;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="result-drawer"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close result details"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-surface-border-subtle bg-surface-raised shadow-[var(--eos-shadow-floating)] animate-fade-in">
        <header className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Rank #{result.rank} · Score {result.score.toFixed(1)}
            </p>
            <h2 id={titleId} className="text-sm font-semibold text-text-primary">
              {result.strategyName}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Parameter Values
            </h3>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.entries(result.combination.labels).map(([k, v]) => (
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
                  ["Win Rate", `${m.winRate}%`],
                  ["Profit Factor", m.profitFactor],
                  ["Sharpe", m.sharpe],
                  ["Sortino", m.sortino],
                  ["Max DD", `${m.maxDrawdown}%`],
                  ["Avg Return", `${m.avgReturn}%`],
                  ["CAGR", `${m.cagr}%`],
                  ["Expectancy", m.expectancy],
                  ["R:R", m.riskReward],
                  ["Total Return", `${m.totalReturn}%`],
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

          <BarChart
            title="Monthly Returns"
            subtitle="Offline simulated monthly return profile"
            series={monthlySeries}
            height={180}
          />

          <PieChart
            title="Trade Distribution"
            subtitle="Wins / losses / breakeven"
            slices={distSlices}
            size={160}
          />

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Drawdown Summary
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Max {result.drawdownSummary.maxDrawdown}% · Avg{" "}
              {result.drawdownSummary.avgDrawdown}% · Recovery ~
              {result.drawdownSummary.recoveryBars} bars
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gain">
                Strengths
              </h3>
              <ul className="mt-1 space-y-1">
                {result.strengths.map((s) => (
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
                {result.weaknesses.map((s) => (
                  <li key={s} className="text-[11px] text-text-secondary">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              AI Summary
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {result.aiSummary}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Improvement Suggestions
            </h3>
            <ul className="mt-1 space-y-1">
              {result.suggestions.map((s) => (
                <li
                  key={s}
                  className={cn("text-[11px] text-text-secondary")}
                >
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
