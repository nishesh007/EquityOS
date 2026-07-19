import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { CompanyLiveQuote } from "@/components/market/CompanyLiveQuote";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { cn, formatPrice } from "@/lib/utils";
import type { ConvictionLevel, SwingTradeSetup } from "@/types";
import { Crosshair, Shield, Target, TrendingUp } from "lucide-react";

interface SwingTradePanelProps {
  swing: SwingTradeSetup;
  symbol: string;
  initialQuote?: EnrichedQuote;
}

const convictionStyles: Record<
  ConvictionLevel,
  { text: string; dot: string; ring: string }
> = {
  High: { text: "text-gain", dot: "bg-gain", ring: "ring-gain/30" },
  Medium: { text: "text-accent", dot: "bg-accent", ring: "ring-accent/30" },
  Low: { text: "text-text-muted", dot: "bg-text-faint", ring: "ring-surface-border" },
};

export function SwingTradePanel({ swing, symbol, initialQuote }: SwingTradePanelProps) {
  const conviction = convictionStyles[swing.conviction];

  const targets = [
    { label: "Target 1", value: swing.target1 },
    { label: "Target 2", value: swing.target2 },
    { label: "Target 3", value: swing.target3 },
  ];

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-xl border border-accent/20 bg-surface-raised/80 backdrop-blur-xl shadow-glow">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-gain/5" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/25">
                <Crosshair className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                  Swing Trade Setup
                </h2>
                <p className="text-[10px] uppercase tracking-wider text-text-faint">
                  {symbol} · {swing.timeHorizon}
                </p>
              </div>
            </div>
          </div>
          <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Premium
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* Left: score + conviction */}
          <div className="flex flex-row items-center gap-6 lg:w-52 lg:shrink-0 lg:flex-col lg:items-start">
            <ScoreGauge score={swing.swingScore} label="Swing Score" />
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-2 ring-1",
                conviction.ring
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", conviction.dot)} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint">
                  Conviction
                </p>
                <p className={cn("text-sm font-semibold", conviction.text)}>
                  {swing.conviction}
                </p>
              </div>
            </div>
          </div>

          {/* Right: levels */}
          <div className="flex-1 space-y-4">
            <CompanyLiveQuote symbol={symbol} initialQuote={initialQuote} size="sm" />

            {/* Entry / Stop */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-accent/15 bg-accent/5 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent">
                  <TrendingUp className="h-3 w-3" />
                  Entry Zone
                </div>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
                  {formatPrice(swing.entryLow)} – {formatPrice(swing.entryHigh)}
                </p>
              </div>
              <div className="rounded-lg border border-loss/15 bg-loss-bg p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-loss">
                  <Shield className="h-3 w-3" />
                  Stop Loss
                </div>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-loss">
                  {formatPrice(swing.stopLoss)}
                </p>
              </div>
            </div>

            {/* Targets */}
            <div className="grid grid-cols-3 gap-3">
              {targets.map((t) => (
                <div
                  key={t.label}
                  className="rounded-lg border border-gain/15 bg-gain-bg p-3"
                >
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gain">
                    <Target className="h-3 w-3" />
                    {t.label}
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-gain">
                    {formatPrice(t.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-surface-border-subtle bg-surface-border-subtle sm:grid-cols-4">
              <MetaTile label="Risk / Reward" value={formatRiskReward(swing.riskRewardRatio)} />
              <MetaTile
                label="Capital Alloc."
                value={`${swing.capitalAllocationPercent}%`}
              />
              <MetaTile
                label="Position Size"
                value={`${swing.positionSize.toLocaleString("en-IN")} sh`}
              />
              <MetaTile
                label="Deploy (₹10L)"
                value={formatPrice(
                  Math.round(
                    (swing.referenceCapital * swing.capitalAllocationPercent) / 100
                  ),
                  0
                )}
              />
            </div>

            <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-faint">
                Strategy
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {swing.strategy}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-text-faint">
          Illustrative levels generated from mock data for research purposes only —
          not investment advice.
        </p>
      </div>
    </div>
  );
}

function formatRiskReward(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "N/A";
  return `1 : ${ratio.toFixed(2)}`;
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised px-3 py-2.5">
      <p className="data-label text-[10px]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
        {value}
      </p>
    </div>
  );
}
