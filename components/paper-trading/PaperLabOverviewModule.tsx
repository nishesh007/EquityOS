"use client";

import { useMemo } from "react";
import { ArrowRight, Activity, History, LineChart, Brain } from "lucide-react";
import { PaperKpiStrip } from "@/components/paper-trading/PaperKpiStrip";
import type { PaperLabModuleId } from "@/components/paper-trading/labModules";
import type { PaperTradingDashboard } from "@/lib/paper-trading/types";
import { PAPER_STRATEGY_LABELS } from "@/lib/paper-trading/format";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";

interface PaperLabOverviewModuleProps {
  dashboard: PaperTradingDashboard;
  onNavigate: (id: PaperLabModuleId) => void;
}

const QUICK_LINKS: Array<{
  id: PaperLabModuleId;
  label: string;
  description: string;
  icon: typeof Activity;
}> = [
  {
    id: "active",
    label: "Active Trades",
    description: "Open automated positions",
    icon: Activity,
  },
  {
    id: "closed",
    label: "Closed Trades",
    description: "Completed validation history",
    icon: History,
  },
  {
    id: "performance",
    label: "Performance Analytics",
    description: "Institutional KPIs & validation",
    icon: LineChart,
  },
  {
    id: "intelligence",
    label: "AI Recommendation Intelligence",
    description: "Quality, regimes & failures",
    icon: Brain,
  },
];

export function PaperLabOverviewModule({
  dashboard,
  onNavigate,
}: PaperLabOverviewModuleProps) {
  const strategyBreakdown = useMemo(() => {
    const strategies = ["intraday", "scalping", "swing"] as const;
    return strategies.map((strategy) => {
      const open = dashboard.openTrades.filter((t) => t.strategy === strategy)
        .length;
      const closed = dashboard.closedTrades.filter(
        (t) => t.strategy === strategy
      ).length;
      return { strategy, open, closed };
    });
  }, [dashboard.openTrades, dashboard.closedTrades]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Overview
        </p>
        <h2 className="mt-1 text-base font-semibold text-text-primary">
          Paper Trading Lab Status
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Highest-conviction recommendations are paper-traded automatically ·{" "}
          {dashboard.config.sharesDisplayLabel} per trade · max{" "}
          {dashboard.config.maxTradesPerStrategy} per strategy · no manual
          buy/sell
        </p>
      </div>

      <PaperKpiStrip
        kpis={dashboard.kpis}
        sharesLabel={dashboard.config.sharesDisplayLabel}
      />

      <section className="space-y-3" aria-label="Strategy book summary">
        <h3 className="text-sm font-semibold text-text-primary">
          Strategy Books
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {strategyBreakdown.map((row) => (
            <div
              key={row.strategy}
              className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 px-3 py-3 transition-colors duration-200 hover:bg-surface-hover/40"
            >
              <p className="text-xs font-semibold text-text-primary">
                {PAPER_STRATEGY_LABELS[row.strategy]}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="text-text-muted">Open</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-text-primary">
                    {row.open}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Closed</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-text-primary">
                    {row.closed}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-label="Lab modules">
        <h3 className="text-sm font-semibold text-text-primary">
          Workspace Modules
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 px-3 py-3 text-left transition-all duration-200 hover:border-accent/30 hover:bg-accent/5",
                  FOCUS_RING_CLASS
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover/60 text-text-secondary transition-colors group-hover:bg-accent/15 group-hover:text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-text-primary">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-muted">
                    {link.description}
                  </span>
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
