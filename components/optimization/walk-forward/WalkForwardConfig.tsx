"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  WalkForwardConfig,
  WalkForwardMethod,
} from "@/lib/optimization";

const INPUT =
  "w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

const METHODS: { id: WalkForwardMethod; label: string; description: string }[] =
  [
    {
      id: "rolling",
      label: "Rolling",
      description: "Fixed train/test windows that step forward in time.",
    },
    {
      id: "anchored",
      label: "Anchored",
      description: "Training start anchored; window expands each cycle.",
    },
    {
      id: "expanding",
      label: "Expanding Window",
      description: "Growing training history with a fixed forward test.",
    },
  ];

export interface WalkForwardConfigProps {
  config: WalkForwardConfig;
  onChange: (patch: Partial<WalkForwardConfig>) => void;
  error?: string | null;
}

export const WalkForwardConfigPanel = memo(function WalkForwardConfigPanel({
  config,
  onChange,
  error,
}: WalkForwardConfigProps) {
  return (
    <Card hover={false} padding="sm" data-testid="walk-forward-config">
      <CardHeader
        title="Validation Configuration"
        subtitle="Configure training / testing windows and institutional pass gates"
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={config.method === m.id}
            onClick={() => onChange({ method: m.id })}
            className={cn(
              "rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              config.method === m.id
                ? "border-accent/40 bg-accent/10"
                : "border-surface-border-subtle bg-surface-overlay/40 hover:bg-surface-hover"
            )}
          >
            <p className="text-xs font-semibold text-text-primary">{m.label}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">{m.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {(
          [
            ["trainingBars", "Training Period (bars)", config.trainingBars],
            ["testingBars", "Testing Period (bars)", config.testingBars],
            ["rollingWindowSize", "Rolling Window Size", config.rollingWindowSize],
            ["stepSize", "Step Size", config.stepSize],
            ["validationCycles", "Validation Cycles", config.validationCycles],
            ["minTrades", "Minimum Trades", config.minTrades],
            ["minWinRate", "Minimum Win Rate %", config.minWinRate],
            ["minProfitFactor", "Minimum Profit Factor", config.minProfitFactor],
            ["minSharpe", "Minimum Sharpe", config.minSharpe],
            ["maxDrawdown", "Maximum Drawdown %", config.maxDrawdown],
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
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            History Start
          </span>
          <input
            type="date"
            className={INPUT}
            value={config.historyStart}
            onChange={(e) => onChange({ historyStart: e.target.value })}
            aria-label="History start"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            History End
          </span>
          <input
            type="date"
            className={INPUT}
            value={config.historyEnd}
            onChange={(e) => onChange({ historyEnd: e.target.value })}
            aria-label="History end"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[11px] text-loss">
          {error}
        </p>
      ) : null}
    </Card>
  );
});
