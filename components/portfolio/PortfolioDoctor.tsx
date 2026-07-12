import {
  IntelligenceProgress,
  intelligenceToneText,
} from "@/components/company/intelligence/IntelligenceProgress";
import { SectorDonutChart } from "@/components/portfolio/SectorDonutChart";
import { PortfolioGauge } from "@/components/portfolio/PortfolioGauge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { MetricCard } from "@/components/ui/MetricCard";
import { cn, formatPercent } from "@/lib/utils";
import type {
  DiagnosticSeverity,
  PortfolioDoctorAnalysis,
  PortfolioRiskMetric,
} from "@/types";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Gauge,
  Layers,
  PieChart,
  Scale,
  Shield,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";

interface PortfolioDoctorProps {
  analysis: PortfolioDoctorAnalysis;
}

const severityStyles: Record<
  DiagnosticSeverity,
  { border: string; bg: string; text: string; dot: string }
> = {
  green: {
    border: "border-gain/25",
    bg: "bg-gain-bg/40",
    text: "text-gain",
    dot: "bg-gain",
  },
  yellow: {
    border: "border-accent/25",
    bg: "bg-accent/10",
    text: "text-accent",
    dot: "bg-accent",
  },
  red: {
    border: "border-loss/25",
    bg: "bg-loss-bg/40",
    text: "text-loss",
    dot: "bg-loss",
  },
};

const priorityStyles: Record<string, string> = {
  high: "border-loss/20 bg-loss-bg/30",
  medium: "border-accent/20 bg-accent/10",
  low: "border-surface-border-subtle bg-surface-overlay/30",
};

function RiskMetricCard({ metric }: { metric: PortfolioRiskMetric }) {
  return (
    <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-primary">{metric.label}</p>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            intelligenceToneText[metric.tone]
          )}
        >
          {metric.level}
        </span>
      </div>
      <IntelligenceProgress
        className="mt-2"
        value={metric.score}
        tone={metric.tone}
        showValue={false}
      />
      <p className="mt-2 text-[10px] leading-relaxed text-text-faint">{metric.explanation}</p>
    </div>
  );
}

export function PortfolioDoctor({ analysis }: PortfolioDoctorProps) {
  const {
    healthScore,
    diversification,
    riskEngine,
    diagnostics,
    recommendations,
    rebalancing,
    positionSizing,
    sectorAllocation,
    quality,
    summary,
    dataTransparency,
  } = analysis;

  return (
    <section className="space-y-6" aria-labelledby="portfolio-doctor-title">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
          <Stethoscope className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h2
            id="portfolio-doctor-title"
            className="text-base font-semibold tracking-tight text-text-primary"
          >
            Portfolio Doctor
          </h2>
          <p className="text-xs text-text-muted">
            AI-powered institutional portfolio analysis · {analysis.generatedAt}
          </p>
        </div>
      </div>

      {/* 10. Portfolio Summary Card */}
      <Card padding="lg" className="animate-fade-in-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
        <div className="relative">
          <CardHeader
            title="Portfolio Summary"
            subtitle={summary.headline}
            action={<Gauge className="h-4 w-4 text-accent" />}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Health Score" value={`${summary.healthScore}/100`} />
            <MetricCard label="Risk" value={summary.riskLevel} />
            <MetricCard label="Diversification" value={`Grade ${summary.diversificationGrade}`} />
            <MetricCard
              label="Expected CAGR"
              value={formatPercent(summary.expectedCagr, false)}
            />
            <MetricCard
              label="Worst Risk"
              value={summary.worstRisk.split(" — ")[0]}
              subValue={summary.worstRisk.includes(" — ") ? summary.worstRisk.split(" — ")[1] : undefined}
            />
            <MetricCard
              label="Best Opportunity"
              value={summary.bestOpportunity.split(" — ")[0]}
              subValue={
                summary.bestOpportunity.includes(" — ")
                  ? summary.bestOpportunity.split(" — ")[1]
                  : undefined
              }
            />
          </div>
        </div>
      </Card>

      {/* 1. Portfolio Health Score */}
      <Card padding="lg" className="animate-fade-in-up [animation-delay:60ms]">
        <CardHeader
          title="Portfolio Health Score"
          subtitle="Composite score across quality, diversification, valuation, momentum, risk and cash"
          action={<Activity className="h-4 w-4 text-accent" />}
        />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-5">
            <PortfolioGauge
              score={healthScore.overall}
              label="Health Score"
              verdict={healthScore.verdict}
              mode="health"
              size={168}
            />
            <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">
              {healthScore.summary}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {healthScore.factors.map((factor) => (
              <div
                key={factor.key}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary">{factor.label}</p>
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tabular-nums",
                      intelligenceToneText[factor.tone]
                    )}
                  >
                    {factor.score}
                  </span>
                </div>
                <IntelligenceProgress value={factor.score} tone={factor.tone} showValue={false} />
                <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
                  {factor.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 2. Diversification Analysis */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:120ms]">
          <CardHeader
            title="Diversification Analysis"
            subtitle={`Grade ${diversification.grade} — ${diversification.gradeExplanation}`}
            action={<Layers className="h-4 w-4 text-accent" />}
          />
          <div className="mb-4 flex items-center justify-center">
            <PortfolioGauge
              score={diversification.score}
              label="Diversification Score"
              verdict={`Grade ${diversification.grade}`}
              mode="neutral"
              size={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Large Cap"
              value={`${diversification.largeCapPercent}%`}
            />
            <MetricCard
              label="Mid Cap"
              value={`${diversification.midCapPercent}%`}
            />
            <MetricCard
              label="Small Cap"
              value={`${diversification.smallCapPercent}%`}
            />
            <MetricCard
              label="Top 5 Holdings"
              value={`${diversification.top5HoldingsPercent}%`}
            />
            <MetricCard
              label="Max Single Stock"
              value={`${diversification.maxSingleStockPercent}%`}
              subValue={diversification.maxSingleStockSymbol}
            />
            <MetricCard
              label="HHI Index"
              value={String(diversification.herfindahlIndex)}
              subValue="Lower is better"
            />
          </div>
          <div className="mt-4">
            <p className="data-label mb-2">Market-Cap Allocation</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {diversification.marketCapAllocation.map((cap) => {
                if (cap.percent <= 0) return null;
                const colors: Record<string, string> = {
                  Large: "bg-gain",
                  Mid: "bg-accent",
                  Small: "bg-loss",
                };
                return (
                  <div
                    key={cap.tier}
                    className={cn(colors[cap.tier], "transition-all")}
                    style={{ width: `${cap.percent}%` }}
                    title={`${cap.tier}: ${cap.percent}%`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-text-faint">
              {diversification.marketCapAllocation
                .filter((c) => c.percent > 0)
                .map((c) => (
                  <span key={c.tier}>
                    {c.tier} {c.percent}%
                  </span>
                ))}
            </div>
          </div>
        </Card>

        {/* 3. Risk Engine */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:180ms]">
          <CardHeader
            title="Risk Engine"
            subtitle={riskEngine.summary}
            action={<Shield className="h-4 w-4 text-loss" />}
          />
          <div className="mb-4 flex items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
            <PortfolioGauge
              score={riskEngine.overallRisk}
              label="Overall Risk"
              verdict={riskEngine.overallRiskLabel}
              mode="risk"
              size={140}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <RiskMetricCard metric={riskEngine.concentrationRisk} />
            <RiskMetricCard metric={riskEngine.volatilityRisk} />
            <RiskMetricCard metric={riskEngine.sectorRisk} />
            <RiskMetricCard metric={riskEngine.correlationRisk} />
            <RiskMetricCard metric={riskEngine.drawdownRisk} />
            <RiskMetricCard metric={riskEngine.liquidityRisk} />
          </div>
        </Card>
      </div>

      {/* 4. Portfolio Diagnostics */}
      <Card padding="lg" className="animate-fade-in-up [animation-delay:240ms]">
        <CardHeader
          title="Portfolio Diagnostics"
          subtitle={`${diagnostics.length} signal(s) detected across holdings`}
          action={<AlertTriangle className="h-4 w-4 text-accent" />}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {diagnostics.map((diag) => {
            const style = severityStyles[diag.severity];
            return (
              <div
                key={diag.key}
                className={cn("rounded-lg border p-4", style.border, style.bg)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                    <p className={cn("text-xs font-semibold", style.text)}>{diag.label}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      style.text
                    )}
                  >
                    {diag.severity}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">
                  {diag.description}
                </p>
                {diag.affectedSymbols && diag.affectedSymbols.length > 0 && (
                  <p className="mt-1 font-mono text-[10px] text-text-faint">
                    {diag.affectedSymbols.join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. AI Recommendations */}
      <Card padding="lg" className="animate-fade-in-up [animation-delay:300ms]">
        <CardHeader
          title="AI Recommendations"
          subtitle="Actionable portfolio adjustments with reasoning"
          action={<Bot className="h-4 w-4 text-accent" />}
        />
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={cn(
                "rounded-lg border p-4",
                priorityStyles[rec.priority]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Sparkles
                    className={cn("mt-0.5 h-3.5 w-3.5", intelligenceToneText[rec.tone])}
                  />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{rec.action}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                      {rec.reasoning}
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  {rec.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 6. Rebalancing Simulator */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:360ms]">
          <CardHeader
            title="Rebalancing Simulator"
            subtitle={rebalancing.summary}
            action={<Scale className="h-4 w-4 text-accent" />}
          />
          <div className="mb-3 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-text-faint">
            <span>Current Allocation</span>
            <ArrowRight className="h-3 w-3" />
            <span>Suggested Allocation</span>
          </div>
          <div className="space-y-2">
            {rebalancing.currentAllocation.map((item) => (
              <div
                key={item.symbol}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{item.symbol}</p>
                    <p className="text-[10px] text-text-faint">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-text-muted">
                      {item.currentPercent}%
                    </span>
                    <ArrowRight className="h-3 w-3 text-text-faint" />
                    <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                      {item.suggestedPercent}%
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 font-mono text-xs tabular-nums",
                        item.change > 0
                          ? "text-gain"
                          : item.change < 0
                            ? "text-loss"
                            : "text-text-faint"
                      )}
                    >
                      {item.change > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : item.change < 0 ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      {item.change > 0 ? "+" : ""}
                      {item.change}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 7. Position Sizing */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:420ms]">
          <CardHeader
            title="Position Sizing"
            subtitle="Overweight and underweight positions vs ideal weights"
            action={<Target className="h-4 w-4 text-accent" />}
          />
          <div className="space-y-2">
            {positionSizing.map((pos) => (
              <div
                key={pos.symbol}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{pos.symbol}</p>
                    <p className="text-[10px] text-text-faint">{pos.name}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      pos.status === "overweight"
                        ? "bg-loss-bg text-loss"
                        : pos.status === "underweight"
                          ? "bg-accent/10 text-accent"
                          : "bg-gain-bg text-gain"
                    )}
                  >
                    {pos.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-text-faint">Current </span>
                    <span className="font-mono tabular-nums text-text-primary">
                      {pos.currentWeight}%
                    </span>
                  </div>
                  <div>
                    <span className="text-text-faint">Ideal </span>
                    <span className="font-mono tabular-nums text-text-muted">
                      {pos.idealWeight}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-text-faint">Suggested </span>
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        intelligenceToneText[pos.tone]
                      )}
                    >
                      {pos.suggestedWeight}%
                    </span>
                  </div>
                </div>
                <IntelligenceProgress
                  className="mt-2"
                  value={pos.currentWeight}
                  tone={pos.tone}
                  showValue={false}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 8. Sector Allocation */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:480ms]">
          <CardHeader
            title="Sector Allocation"
            subtitle="Current vs ideal sector weights"
            action={<PieChart className="h-4 w-4 text-accent" />}
          />
          <SectorDonutChart sectors={sectorAllocation} />
        </Card>

        {/* 9. Portfolio Quality */}
        <Card padding="lg" className="animate-fade-in-up [animation-delay:540ms]">
          <CardHeader
            title="Portfolio Quality"
            subtitle={quality.summary}
            action={<BarChart3 className="h-4 w-4 text-accent" />}
          />
          <div className="mb-4 flex items-center justify-center">
            <PortfolioGauge
              score={quality.qualityScore}
              label="Quality Score"
              verdict="Portfolio Quality"
              mode="neutral"
              size={130}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Avg ROE" value={`${quality.averageRoe}%`} />
            <MetricCard label="Avg ROCE" value={`${quality.averageRoce}%`} />
            <MetricCard
              label="Avg Debt/Equity"
              value={String(quality.averageDebtToEquity)}
            />
            <MetricCard
              label="Avg Growth"
              value={formatPercent(quality.averageGrowth)}
            />
            <MetricCard label="Avg P/E" value={String(quality.averagePe)} />
            <MetricCard
              label="Avg Dividend Yield"
              value={`${quality.averageDividendYield}%`}
            />
          </div>
          <div className="mt-4">
            <p className="data-label mb-2">Quality Breakdown</p>
            <IntelligenceProgress
              value={quality.qualityScore}
              tone={quality.qualityTone}
            />
          </div>
        </Card>
      </div>

      <DataTransparencyBar transparency={dataTransparency} compact />
    </section>
  );
}
