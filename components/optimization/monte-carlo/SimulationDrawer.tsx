"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { AreaChart, BarChart, LineChart } from "@/components/analytics/charts";
import type { SimulationResult } from "@/lib/optimization";
import type { ChartSeries } from "@/lib/analytics/types";

export interface SimulationDrawerProps {
  result: SimulationResult | null;
  open: boolean;
  onClose: () => void;
  configSummary?: string;
}

export const SimulationDrawer = memo(function SimulationDrawer({
  result,
  open,
  onClose,
  configSummary,
}: SimulationDrawerProps) {
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
    if (!result) return [];
    return [
      {
        id: "m",
        label: "Monthly Return %",
        points: result.monthlyReturns.map((y, i) => ({
          x: i + 1,
          y,
          label: `M${i + 1}`,
        })),
      },
    ];
  }, [result]);

  const equity = useMemo<ChartSeries[]>(() => {
    if (!result) return [];
    return [
      {
        id: "eq",
        label: "Equity",
        points: result.equityCurve.map((y, i) => ({ x: i, y })),
      },
    ];
  }, [result]);

  const dd = useMemo<ChartSeries[]>(() => {
    if (!result) return [];
    return [
      {
        id: "dd",
        label: "Drawdown %",
        points: result.drawdownCurve.map((y, i) => ({ x: i, y })),
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
      data-testid="simulation-drawer"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close simulation details"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-surface-border-subtle bg-surface-raised shadow-[var(--eos-shadow-floating)] animate-fade-in">
        <header className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Simulation #{result.simulationIndex} · Grade {result.riskGrade}
            </p>
            <h2 id={titleId} className="text-sm font-semibold text-text-primary">
              {result.scenarioLabel}
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
          {configSummary ? (
            <p className="text-[11px] text-text-muted">{configSummary}</p>
          ) : null}

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Risk Metrics
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(
                [
                  ["Expected Return", `${m.expectedReturn}%`],
                  ["Median Return", `${m.medianReturn}%`],
                  ["Worst Return", `${m.worstReturn}%`],
                  ["Best Return", `${m.bestReturn}%`],
                  ["Max DD", `${m.maxDrawdown}%`],
                  ["Avg DD", `${m.averageDrawdown}%`],
                  ["Recovery", m.recoveryTime],
                  ["Volatility", m.volatility],
                  ["Sharpe", m.sharpe],
                  ["Sortino", m.sortino],
                  ["Calmar", m.calmar],
                  ["Ulcer", m.ulcerIndex],
                  ["VaR", m.var],
                  ["CVaR", m.cvar],
                  ["P(Ruin)", `${m.probabilityOfRuin}%`],
                  ["P(Target)", `${m.probabilityOfTarget}%`],
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

          <BarChart title="Monthly Returns" series={monthly} height={150} />
          <LineChart title="Equity Path" series={equity} height={150} />
          <AreaChart title="Drawdown Curve" series={dd} height={150} />

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
              Risk Commentary
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {result.riskCommentary}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Improvement Suggestions
            </h3>
            <ul className="mt-1 space-y-1">
              {result.suggestions.map((s) => (
                <li key={s} className="text-[11px] text-text-secondary">
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
