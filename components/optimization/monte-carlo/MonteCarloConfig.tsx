"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { MonteCarloConfig, MonteCarloMode } from "@/lib/optimization";

const INPUT =
  "w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

const MODES: { id: MonteCarloMode; label: string; description: string }[] = [
  {
    id: "conservative",
    label: "Conservative",
    description: "Higher costs, gaps, and volatility assumptions.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Institutional baseline simulation settings.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "Larger sample with lighter friction assumptions.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Fully manual parameter control.",
  },
];

export interface MonteCarloConfigPanelProps {
  config: MonteCarloConfig;
  onChange: (patch: Partial<MonteCarloConfig>) => void;
  error?: string | null;
}

export const MonteCarloConfigPanel = memo(function MonteCarloConfigPanel({
  config,
  onChange,
  error,
}: MonteCarloConfigPanelProps) {
  return (
    <Card hover={false} padding="sm" data-testid="monte-carlo-config">
      <CardHeader
        title="Monte Carlo Configuration"
        subtitle="Simulation count, friction, randomization, and confidence controls"
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={config.mode === mode.id}
            onClick={() => onChange({ mode: mode.id })}
            className={cn(
              "rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              config.mode === mode.id
                ? "border-accent/40 bg-accent/10"
                : "border-surface-border-subtle bg-surface-overlay/40 hover:bg-surface-hover"
            )}
          >
            <p className="text-xs font-semibold text-text-primary">{mode.label}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">{mode.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {(
          [
            ["simulationCount", "Simulation Count", config.simulationCount],
            ["slippagePct", "Slippage %", config.slippagePct],
            ["commissionPct", "Commission %", config.commissionPct],
            ["gapProbability", "Gap Probability", config.gapProbability],
            ["volatilityMultiplier", "Volatility Multiplier", config.volatilityMultiplier],
            ["maxDrawdownLimit", "Max Drawdown Limit %", config.maxDrawdownLimit],
            ["confidenceLevel", "Confidence Level", config.confidenceLevel],
            ["randomSeed", "Random Seed", config.randomSeed],
            ["customReturnShock", "Custom Return Shock", config.customReturnShock],
            ["customVolShock", "Custom Vol Shock", config.customVolShock],
          ] as const
        ).map(([key, label, value]) => (
          <label key={key} className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              {label}
            </span>
            <input
              type="number"
              className={INPUT}
              value={value}
              step="any"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onChange({ [key]: n });
              }}
              aria-label={label}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {(
          [
            ["tradeRandomization", "Trade Randomization", config.tradeRandomization],
            ["bootstrapSampling", "Bootstrap Sampling", config.bootstrapSampling],
            ["returnRandomization", "Return Randomization", config.returnRandomization],
          ] as const
        ).map(([key, label, checked]) => (
          <label
            key={key}
            className="inline-flex items-center gap-2 text-xs text-text-secondary"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              aria-label={label}
              className="h-3.5 w-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            {label}
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[11px] text-loss">
          {error}
        </p>
      ) : null}
    </Card>
  );
});
