import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import type { MarketPulse as MarketPulseType } from "@/types";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Gauge, Radio } from "lucide-react";

interface MarketPulseProps {
  pulse: MarketPulseType;
}

interface PulseMetricProps {
  label: string;
  children: React.ReactNode;
  detail: React.ReactNode;
  icon: React.ReactNode;
}

function PulseMetric({ label, children, detail, icon }: PulseMetricProps) {
  return (
    <div className="group rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:bg-surface-hover/60">
      <div className="flex items-center justify-between">
        <p className="data-label">{label}</p>
        <div className="text-text-faint transition-colors group-hover:text-accent">
          {icon}
        </div>
      </div>
      <div className="mt-2">{children}</div>
      <div className="mt-1 text-[10px] text-text-muted">{detail}</div>
    </div>
  );
}

export function MarketPulse({ pulse }: MarketPulseProps) {
  const flow = pulse.institutionalFlow;

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full animate-terminal-scan bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <CardHeader
        title="Market Pulse"
        subtitle="Live risk, positioning and participation snapshot"
        action={
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-gain">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gain opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gain" />
            </span>
            Market open
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PulseMetric
          label="India VIX"
          icon={<Activity className="h-4 w-4" />}
          detail="Volatility cooling"
        >
          <div className="flex items-end gap-2">
            <p className="data-value text-xl font-semibold">{pulse.indiaVix}</p>
            <ChangeIndicator value={pulse.indiaVixChange} size="sm" />
          </div>
        </PulseMetric>

        <PulseMetric
          label="FII / DII"
          icon={<ArrowDownToLine className="h-4 w-4" />}
          detail={`Net cash flow · ${flow.asOf}`}
        >
          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="text-gain">FII +₹{flow.fii.toLocaleString("en-IN")}Cr</span>
            <span className="text-accent">DII +₹{flow.dii.toLocaleString("en-IN")}Cr</span>
          </div>
        </PulseMetric>

        <PulseMetric
          label="Put Call Ratio"
          icon={<Gauge className="h-4 w-4" />}
          detail="Options positioning · Balanced bullish"
        >
          <p className="data-value text-xl font-semibold">{pulse.putCallRatio}</p>
        </PulseMetric>

        <PulseMetric
          label="Market Trend"
          icon={<ArrowUpFromLine className="h-4 w-4" />}
          detail="Price above key moving averages"
        >
          <p className="text-sm font-semibold text-gain">{pulse.marketTrend}</p>
        </PulseMetric>

        <PulseMetric
          label="Breadth Score"
          icon={<Radio className="h-4 w-4" />}
          detail="Broad-based participation"
        >
          <div className="flex items-center gap-3">
            <p className="data-value text-xl font-semibold">{pulse.breadthScore}</p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-gain transition-[width] duration-1000 ease-out"
                style={{ width: `${pulse.breadthScore}%` }}
              />
            </div>
          </div>
        </PulseMetric>
      </div>
    </Card>
  );
}
