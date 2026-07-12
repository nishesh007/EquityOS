import { IntelligenceProgress, intelligenceToneText } from "@/components/company/intelligence/IntelligenceProgress";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { cn, formatPrice } from "@/lib/utils";
import type {
  AIDecisionAnalysis,
  DataTransparency,
  DecisionMetric,
  RecommendationLevel,
  ScoreTone,
} from "@/types";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Crosshair,
  Flag,
  Gauge,
  LineChart,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

interface DecisionEnginePanelProps {
  decision: AIDecisionAnalysis;
  dataTransparency: DataTransparency;
}

const recStyles: Record<RecommendationLevel, { text: string; border: string; bg: string }> = {
  "Strong Buy": { text: "text-gain", border: "border-gain/20", bg: "bg-gain-bg" },
  Buy: { text: "text-gain", border: "border-gain/20", bg: "bg-gain-bg" },
  Accumulate: { text: "text-gain", border: "border-gain/15", bg: "bg-gain-bg/50" },
  Hold: { text: "text-accent", border: "border-accent/20", bg: "bg-accent/10" },
  Reduce: { text: "text-loss", border: "border-loss/15", bg: "bg-loss-bg/50" },
  Sell: { text: "text-loss", border: "border-loss/20", bg: "bg-loss-bg" },
  "Strong Sell": { text: "text-loss", border: "border-loss/25", bg: "bg-loss-bg" },
};

function toneFromScore(score: number): ScoreTone {
  if (score >= 70) return "gain";
  if (score >= 50) return "accent";
  return "loss";
}

function riskTone(risk: number): ScoreTone {
  if (risk <= 35) return "gain";
  if (risk <= 55) return "accent";
  return "loss";
}

function MetricGrid({ metrics }: { metrics: DecisionMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-primary">{metric.label}</p>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                intelligenceToneText[toneFromScore(metric.score)]
              )}
            >
              {metric.score}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-text-secondary tabular-nums">{metric.value}</p>
          <IntelligenceProgress
            className="mt-2"
            value={metric.score}
            tone={toneFromScore(metric.score)}
            showValue={false}
          />
          <p className="mt-2 text-[10px] leading-relaxed text-text-faint">{metric.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function ConvictionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: ScoreTone;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3">
      <p className="data-label">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          tone ? intelligenceToneText[tone] : "text-text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DecisionEnginePanel({ decision, dataTransparency }: DecisionEnginePanelProps) {
  const rec = recStyles[decision.recommendation];
  const { conviction, entry, targets, aiSummary } = decision;

  return (
    <section className="space-y-6" aria-labelledby="decision-engine-title">
      <Card padding="lg" className="animate-fade-in-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <CardHeader
            title="AI Decision Engine"
            subtitle="Institutional-grade composite investment decision"
            action={<Sparkles className="h-4 w-4 text-accent" />}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
              <ScoreGauge score={decision.decisionScore} label="Decision Score" size={140} />
              <div className={cn("mt-3 rounded-lg border px-4 py-2 text-center", rec.border, rec.bg)}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Final Recommendation
                </p>
                <p className={cn("mt-1 text-lg font-bold tracking-tight", rec.text)}>
                  {decision.recommendation.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
              <ScoreGauge score={conviction.confidence} label="Confidence" size={120} />
              <p className="mt-2 text-xs text-text-muted">Research confidence across dimensions</p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
              <div className="relative" style={{ width: 120, height: 74 }}>
                <ScoreGauge score={100 - conviction.risk} label="Risk Profile" size={120} />
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-text-primary tabular-nums">
                Risk {conviction.risk}%
              </p>
              <IntelligenceProgress
                className="mt-2 w-full max-w-[160px]"
                value={conviction.risk}
                tone={riskTone(conviction.risk)}
                showValue={false}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ConvictionStat label="Overall Conviction" value={`${conviction.overall}/100`} tone={toneFromScore(conviction.overall)} />
            <ConvictionStat label="Reward" value={`${conviction.reward}%`} tone="gain" />
            <ConvictionStat label="Margin of Safety" value={`${conviction.marginOfSafety}%`} tone={conviction.marginOfSafety > 0 ? "gain" : "loss"} />
            <ConvictionStat label="Upside" value={`${conviction.upside}%`} tone="gain" />
            <ConvictionStat label="Downside" value={`${conviction.downside}%`} tone="loss" />
            <ConvictionStat label="Intrinsic Value" value={formatPrice(conviction.intrinsicValue, 0)} />
            <ConvictionStat label="Current Price" value={formatPrice(conviction.currentPrice, 0)} />
            <ConvictionStat label="Expected CAGR" value={`${conviction.expectedCagr}%`} tone={toneFromScore(conviction.expectedCagr * 3)} />
            <ConvictionStat label="Confidence" value={`${conviction.confidence}%`} tone={toneFromScore(conviction.confidence)} />
            <ConvictionStat label="Risk Meter" value={`${decision.risk.overallRiskMeter}%`} tone={riskTone(decision.risk.overallRiskMeter)} />
          </div>
          <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card padding="lg" className="animate-fade-in-up h-full">
          <CardHeader
            title="Price Targets"
            subtitle="Institutional target ladder"
            action={<Target className="h-4 w-4 text-accent" />}
          />
          <div className="space-y-3">
            {[
              { label: "Target 1", value: targets.target1 },
              { label: "Target 2", value: targets.target2 },
              { label: "Target 3", value: targets.target3 },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-4 py-3"
              >
                <span className="text-xs font-medium text-text-muted">{item.label}</span>
                <span className="font-mono text-sm font-semibold text-gain tabular-nums">
                  {formatPrice(item.value, 0)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-loss/15 bg-loss-bg/30 px-4 py-3">
              <span className="text-xs font-medium text-text-muted">Stop Loss</span>
              <span className="font-mono text-sm font-semibold text-loss tabular-nums">
                {formatPrice(targets.stopLoss, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface/50 px-4 py-3">
              <span className="text-xs font-medium text-text-muted">Trailing Stop</span>
              <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                {formatPrice(targets.trailingStop, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface/50 px-4 py-3">
              <span className="text-xs font-medium text-text-muted">Invalidation</span>
              <span className="font-mono text-sm font-semibold text-loss tabular-nums">
                {formatPrice(targets.invalidationLevel, 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="animate-fade-in-up h-full">
          <CardHeader
            title="Entry Analysis"
            subtitle="Position sizing and buy zones"
            action={<Crosshair className="h-4 w-4 text-accent" />}
          />
          <div className="space-y-3">
            {[
              { label: "Ideal Buy Zone", value: entry.idealBuyZone },
              { label: "Breakout Buy", value: formatPrice(entry.breakoutBuy, 0) },
              { label: "Swing Buy", value: entry.swingBuy },
              { label: "Long-term Buy", value: entry.longTermBuy },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-4 py-3"
              >
                <p className="data-label">{item.label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-text-primary tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-accent/15 bg-accent/10 px-4 py-3">
                <p className="data-label">Position Size</p>
                <p className="mt-1 font-mono text-lg font-semibold text-text-primary tabular-nums">
                  {entry.positionSize.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-text-faint">shares</p>
              </div>
              <div className="rounded-lg border border-accent/15 bg-accent/10 px-4 py-3">
                <p className="data-label">Capital Allocation</p>
                <p className="mt-1 font-mono text-lg font-semibold text-accent tabular-nums">
                  {entry.capitalAllocationPercent}%
                </p>
                <p className="text-[10px] text-text-faint">of portfolio</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="animate-fade-in-up h-full">
          <CardHeader
            title="Risk / Reward"
            subtitle="Asymmetric payoff profile"
            action={<Shield className="h-4 w-4 text-accent" />}
          />
          <div className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="data-label">Reward : Risk</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-gain tabular-nums">
                  {Number.isFinite(conviction.reward) && conviction.downside > 0
                    ? `${(conviction.reward / Math.max(conviction.downside, 1)).toFixed(1)}x`
                    : "N/A"}
                </p>
              </div>
              <span className={cn("text-xs font-medium", conviction.upside > conviction.downside ? "text-gain" : "text-loss")}>
                {conviction.upside > conviction.downside ? "Favourable" : "Unfavourable"}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gain">Upside {conviction.upside}%</span>
                <span className="text-loss">Downside {conviction.downside}%</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full">
                <div
                  className="bg-gain transition-[width] duration-1000"
                  style={{
                    width: `${conviction.upside + conviction.downside > 0 ? (conviction.upside / (conviction.upside + conviction.downside)) * 100 : 50}%`,
                  }}
                />
                <div
                  className="bg-loss transition-[width] duration-1000"
                  style={{ width: `${(conviction.downside / (conviction.upside + conviction.downside)) * 100}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gain/15 bg-gain-bg p-3 text-center">
                <ArrowUpRight className="mx-auto h-4 w-4 text-gain" />
                <p className="mt-1 font-mono text-xl font-bold text-gain tabular-nums">{conviction.upside}%</p>
                <p className="text-[10px] text-text-muted">Upside to fair value</p>
              </div>
              <div className="rounded-lg border border-loss/15 bg-loss-bg p-3 text-center">
                <ArrowDownRight className="mx-auto h-4 w-4 text-loss" />
                <p className="mt-1 font-mono text-xl font-bold text-loss tabular-nums">{conviction.downside}%</p>
                <p className="text-[10px] text-text-muted">Downside risk</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg" className="animate-fade-in-up">
        <CardHeader
          title="Decision Timeline"
          subtitle="Phased execution roadmap"
          action={<TrendingUp className="h-4 w-4 text-accent" />}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {decision.timeline.map((item, index) => (
            <div
              key={item.id}
              className="relative rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold text-accent">
                  {index + 1}
                </span>
                <span className="rounded-md border border-accent/15 bg-accent/5 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {item.phase}
                </span>
              </div>
              <p className="text-xs font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1 text-[10px] font-mono text-text-faint">{item.horizon}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card padding="lg" className="animate-fade-in-up">
          <CardHeader
            title="Technical Analysis"
            subtitle={`Score ${decision.technical.overallScore}/100 · Breakout ${decision.technical.breakoutProbability}%`}
            action={<LineChart className="h-4 w-4 text-accent" />}
          />
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gain/15 bg-gain-bg/30 p-3">
              <p className="data-label">Support</p>
              <p className="mt-1 font-mono text-sm font-semibold text-gain tabular-nums">
                {formatPrice(decision.technical.support, 0)}
              </p>
            </div>
            <div className="rounded-lg border border-loss/15 bg-loss-bg/30 p-3">
              <p className="data-label">Resistance</p>
              <p className="mt-1 font-mono text-sm font-semibold text-loss tabular-nums">
                {formatPrice(decision.technical.resistance, 0)}
              </p>
            </div>
          </div>
          <MetricGrid metrics={decision.technical.metrics} />
        </Card>

        <Card padding="lg" className="animate-fade-in-up">
          <CardHeader
            title="Fundamentals"
            subtitle={`Score ${decision.fundamentals.overallScore}/100`}
            action={<Gauge className="h-4 w-4 text-accent" />}
          />
          <MetricGrid metrics={decision.fundamentals.metrics} />
        </Card>

        <Card padding="lg" className="animate-fade-in-up">
          <CardHeader
            title="Valuation"
            subtitle={`Score ${decision.valuation.overallScore}/100`}
            action={<Target className="h-4 w-4 text-accent" />}
          />
          <MetricGrid metrics={decision.valuation.metrics} />
        </Card>

        <Card padding="lg" className="animate-fade-in-up">
          <CardHeader
            title="Quality"
            subtitle={`Score ${decision.quality.overallScore}/100`}
            action={<Sparkles className="h-4 w-4 text-accent" />}
          />
          <MetricGrid metrics={decision.quality.metrics} />
        </Card>
      </div>

      <Card padding="lg" className="animate-fade-in-up">
        <CardHeader
          title="Risk Assessment"
          subtitle={`Overall risk meter ${decision.risk.overallRiskMeter}%`}
          action={<AlertTriangle className="h-4 w-4 text-accent" />}
        />
        <div className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="data-label">Overall Risk Meter</p>
              <p className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", intelligenceToneText[riskTone(decision.risk.overallRiskMeter)])}>
                {decision.risk.overallRiskMeter}%
              </p>
            </div>
            <span className={cn("text-xs font-medium", intelligenceToneText[riskTone(decision.risk.overallRiskMeter)])}>
              {decision.risk.overallRiskMeter <= 35 ? "Low" : decision.risk.overallRiskMeter <= 55 ? "Moderate" : "High"}
            </span>
          </div>
          <IntelligenceProgress
            className="mt-3"
            value={decision.risk.overallRiskMeter}
            tone={riskTone(decision.risk.overallRiskMeter)}
            showValue={false}
          />
        </div>
        <MetricGrid metrics={decision.risk.metrics} />
      </Card>

      <Card padding="lg" className="animate-fade-in-up relative overflow-hidden">
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <CardHeader
            title="AI Research Summary"
            subtitle="Institutional decision narrative"
            action={<Bot className="h-4 w-4 text-accent" />}
          />
          <div className={cn("rounded-lg border p-5", rec.border, rec.bg)}>
            <p className="text-sm leading-relaxed text-text-secondary">{aiSummary.institutionalSummary}</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gain/15 bg-gain-bg p-4">
              <div className="mb-3 flex items-center gap-2 text-gain">
                <ArrowUpRight className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wider">Why Buy</p>
              </div>
              <ul className="space-y-2">
                {aiSummary.whyBuy.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gain" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-loss/15 bg-loss-bg p-4">
              <div className="mb-3 flex items-center gap-2 text-loss">
                <ArrowDownRight className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wider">Why Not Buy</p>
              </div>
              <ul className="space-y-2">
                {aiSummary.whyNotBuy.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-loss" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Major Risks", items: aiSummary.majorRisks, icon: AlertTriangle, tone: "loss" as const },
              { title: "Opportunities", items: aiSummary.majorOpportunities, icon: Sparkles, tone: "gain" as const },
              { title: "Catalysts", items: aiSummary.catalysts, icon: TrendingUp, tone: "accent" as const },
            ].map((block) => (
              <div
                key={block.title}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <block.icon className={cn("h-3.5 w-3.5", block.tone === "gain" ? "text-gain" : block.tone === "loss" ? "text-loss" : "text-accent")} />
                  <p className="data-label">{block.title}</p>
                </div>
                <ul className="space-y-1.5">
                  {block.items.slice(0, 3).map((item) => (
                    <li key={item} className="text-[11px] leading-relaxed text-text-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-loss/15 bg-loss-bg/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-loss" />
                <p className="data-label">Red Flags</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiSummary.redFlags.length > 0 ? (
                  aiSummary.redFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-md border border-loss/20 bg-loss-bg px-2 py-0.5 text-[10px] font-medium text-loss"
                    >
                      {flag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-text-muted">None detected</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-gain/15 bg-gain-bg/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-gain" />
                <p className="data-label">Green Flags</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiSummary.greenFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-md border border-gain/20 bg-gain-bg px-2 py-0.5 text-[10px] font-medium text-gain"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
