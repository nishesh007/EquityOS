import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatPrice, formatRatio } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DataTransparency, ValuationAnalysis, ValuationVerdict } from "@/types";
import { Scale } from "lucide-react";

interface ValuationAnalysisPanelProps {
  valuation: ValuationAnalysis;
  dataTransparency: DataTransparency;
}

const verdictStyles: Record<ValuationVerdict, string> = {
  Undervalued: "text-gain bg-gain-bg border-gain/20",
  "Fairly Valued": "text-accent bg-accent/10 border-accent/20",
  Overvalued: "text-loss bg-loss-bg border-loss/20",
};

function formatPct(value: number, available: boolean): string {
  if (!available || !Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function MetricRow({
  label,
  value,
  fair,
  verdict,
}: {
  label: string;
  value: number;
  fair: number;
  verdict: ValuationVerdict;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface/50 px-4 py-3">
      <div>
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="mt-0.5 font-mono text-sm text-text-secondary tabular-nums">
          {formatRatio(value)} <span className="text-text-faint">vs fair {formatRatio(fair)}</span>
        </p>
      </div>
      <span className={cn("rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider", verdictStyles[verdict])}>
        {verdict}
      </span>
    </div>
  );
}

export function ValuationAnalysisPanel({ valuation, dataTransparency }: ValuationAnalysisPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Valuation Engine"
        subtitle="DCF · Graham · EPV · P/E · P/B · EV/EBITDA · Sector Comparison"
        action={<Scale className="h-4 w-4 text-accent" />}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <p className="data-label">Overall Verdict</p>
          <p className={cn("mt-1 text-lg font-semibold", verdictStyles[valuation.overallVerdict].split(" ")[0])}>
            {valuation.overallVerdict}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <p className="data-label">Intrinsic Value</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-primary tabular-nums">
            {formatPrice(valuation.intrinsicValue, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <p className="data-label">Fair Value</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-primary tabular-nums">
            {formatPrice(valuation.estimatedFairValue, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <p className="data-label">Margin of Safety</p>
          <p className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", valuation.available && valuation.marginOfSafety > 0 ? "text-gain" : valuation.available && valuation.marginOfSafety < 0 ? "text-loss" : "text-text-secondary")}>
            {formatPct(valuation.marginOfSafety, valuation.available)}
          </p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3">
          <p className="data-label">Upside Potential</p>
          <p className={cn("mt-1 font-mono text-sm font-semibold tabular-nums", valuation.upsidePercent > 0 ? "text-gain" : "text-text-secondary")}>
            {formatPct(valuation.upsidePercent, valuation.available)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3">
          <p className="data-label">Expected CAGR</p>
          <p className="mt-1 font-mono text-sm font-semibold text-gain tabular-nums">
            {valuation.available && valuation.expectedCagr > 0 ? `${valuation.expectedCagr}%` : "N/A"}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <MetricRow label="P/E Valuation" value={valuation.pe.value} fair={valuation.pe.fairValue} verdict={valuation.pe.verdict} />
        <MetricRow label="P/B Valuation" value={valuation.pb.value} fair={valuation.pb.fairValue} verdict={valuation.pb.verdict} />
        <MetricRow label="EV/EBITDA" value={valuation.evEbitda.value} fair={valuation.evEbitda.fairValue} verdict={valuation.evEbitda.verdict} />
        <MetricRow label="PEG Ratio" value={valuation.peg.value} fair={valuation.peg.fairValue} verdict={valuation.peg.verdict} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3">
          <p className="data-label">Relative vs Peers</p>
          <p className={cn("mt-1 text-sm font-medium", verdictStyles[valuation.relativeVsPeers].split(" ")[0])}>
            {valuation.relativeVsPeers}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3">
          <p className="data-label">Historical Range</p>
          <p className="mt-1 text-sm text-text-secondary">
            {valuation.historicalRange.percentile}th percentile · {valuation.historicalRange.verdict}
          </p>
        </div>
      </div>
      {valuation.models.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-text-primary">Valuation Models</p>
          {valuation.models.map((model) => (
            <div
              key={model.key}
              className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-xs font-medium text-text-primary">{model.label}</p>
                <p className="mt-0.5 font-mono text-sm text-text-secondary tabular-nums">
                  {formatPrice(model.fairValue, 0)}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-text-faint line-clamp-2">{model.explanation}</p>
              </div>
              <span className={cn("flex-shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider", verdictStyles[model.verdict])}>
                {model.verdict}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-text-secondary">{valuation.summary}</p>
      <p className="mt-2 text-[10px] text-text-faint">Confidence: {valuation.confidence}%</p>
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
