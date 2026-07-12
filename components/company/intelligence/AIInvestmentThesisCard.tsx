import { IntelligenceProgress } from "@/components/company/intelligence/IntelligenceProgress";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AIInvestmentThesis, DataTransparency, RecommendationLevel } from "@/types";
import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Building2,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

interface AIInvestmentThesisCardProps {
  thesis: AIInvestmentThesis;
  dataTransparency?: DataTransparency;
}

function NarrativeBlock({
  title,
  content,
  tone,
}: {
  title: string;
  content: string;
  tone: "gain" | "loss";
}) {
  const Icon = tone === "gain" ? ArrowUpRight : ArrowDownRight;
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "gain" ? "border-gain/15 bg-gain-bg" : "border-loss/15 bg-loss-bg"
      }`}
    >
      <div className={`mb-2 flex items-center gap-2 ${tone === "gain" ? "text-gain" : "text-loss"}`}>
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-text-secondary">{content}</p>
    </div>
  );
}

function InsightBlock({
  title,
  content,
  icon: Icon,
}: {
  title: string;
  content: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <p className="data-label text-[10px]">{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-text-secondary">{content}</p>
    </div>
  );
}

export function AIInvestmentThesisCard({ thesis, dataTransparency }: AIInvestmentThesisCardProps) {
  const recStyles: Record<RecommendationLevel, string> = {
    "Strong Buy": "text-gain border-gain/20 bg-gain-bg",
    Buy: "text-gain border-gain/20 bg-gain-bg",
    Accumulate: "text-gain border-gain/15 bg-gain-bg/50",
    Hold: "text-accent border-accent/20 bg-accent/10",
    Reduce: "text-loss border-loss/15 bg-loss-bg/50",
    Sell: "text-loss border-loss/20 bg-loss-bg",
    "Strong Sell": "text-loss border-loss/25 bg-loss-bg",
  };

  return (
    <Card padding="lg" className="animate-fade-in-up relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <CardHeader
          title="AI Investment Thesis"
          subtitle="Institutional synthesis of quality, valuation and catalysts"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/25">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
          }
        />

        <div className={cn("mb-4 rounded-lg border p-4", recStyles[thesis.recommendation])}>
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Recommendation</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{thesis.recommendation}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">{thesis.recommendationRationale}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <NarrativeBlock title="Bull Case" content={thesis.bullCase} tone="gain" />
          <NarrativeBlock title="Bear Case" content={thesis.bearCase} tone="loss" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-loss">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Key Risks</p>
            </div>
            <ul className="space-y-2">
              {thesis.keyRisks.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-loss" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-gain">
              <Zap className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Key Catalysts</p>
            </div>
            <ul className="space-y-2">
              {thesis.keyCatalysts.map((catalyst) => (
                <li key={catalyst} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gain" />
                  {catalyst}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <InsightBlock title="Management Quality" content={thesis.managementQuality} icon={Building2} />
          <InsightBlock title="Economic Moat" content={thesis.moat} icon={Target} />
          <InsightBlock title="Valuation Opinion" content={thesis.valuationOpinion} icon={BrainCircuit} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-4">
            <p className="data-label">AI Fair Value</p>
            <p className="mt-1 font-mono text-lg font-semibold text-text-primary tabular-nums">
              {formatPrice(thesis.fairValue, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-4">
            <p className="data-label">Expected CAGR</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gain tabular-nums">
              {thesis.expectedCagr}%
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface/50 p-4">
            <div className="flex items-center justify-between">
              <p className="data-label">AI Confidence</p>
              <span className="font-mono text-xs font-semibold text-accent">{thesis.confidence}%</span>
            </div>
            <IntelligenceProgress className="mt-3" value={thesis.confidence} tone="accent" showValue={false} />
          </div>
        </div>

        {thesis.sections.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold text-text-primary">Research Sections</p>
            {thesis.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-accent">{section.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{section.content}</p>
              </div>
            ))}
          </div>
        )}

        {dataTransparency && <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />}
      </div>
    </Card>
  );
}
