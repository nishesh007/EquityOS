"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { buildAiIntelligenceModel } from "@/lib/paper-trading/intelligence";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  formatHoldingDuration,
  formatPnl,
  formatPercent,
  formatDateTime,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import {
  Brain,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Trophy,
  AlertTriangle,
} from "lucide-react";

interface PaperAiIntelligenceDashboardProps {
  trades: readonly PaperTrade[];
  testedRecommendationIds: readonly string[];
  onSelectTrade: (trade: PaperTrade) => void;
}

function SectionHeader({
  n,
  title,
  subtitle,
}: {
  n: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Section {n}
      </p>
      <h2 className="mt-0.5 text-sm font-semibold text-text-primary">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
      ) : null}
    </div>
  );
}

function IntelligenceHeader() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        <Brain className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          AI Recommendation Intelligence
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-text-primary">
          Recommendation Quality & Self-Validation
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Evaluates recommendation quality from completed paper trades ·
          read-only · no scoring changes
        </p>
      </div>
    </div>
  );
}

export function PaperAiIntelligenceDashboard({
  trades,
  testedRecommendationIds,
  onSelectTrade,
}: PaperAiIntelligenceDashboardProps) {
  const model = useMemo(
    () => buildAiIntelligenceModel(trades, testedRecommendationIds),
    [trades, testedRecommendationIds]
  );

  const hasClosed = useMemo(() => trades.some(isTradeClosed), [trades]);
  const hasRecommendationHistory =
    testedRecommendationIds.length > 0 || trades.length > 0;

  if (!hasRecommendationHistory) {
    return (
      <div className="space-y-4">
        <IntelligenceHeader />
        <EmptyStatePanel
          icon={Brain}
          title="No recommendation history"
          message="AI Recommendation Intelligence activates once the paper engine tests recommendations. Sync the lab to begin validation."
          source="Paper Trading Lab · AI Intelligence"
        />
      </div>
    );
  }

  if (!hasClosed) {
    return (
      <div className="space-y-4">
        <IntelligenceHeader />
        <EmptyStatePanel
          icon={Sparkles}
          title="No AI insights available"
          message="Insights require completed paper trades. Open positions are tracked in Active Trades until exit."
          source="Paper Trading Lab · AI Intelligence"
        />
      </div>
    );
  }

  const healthCards = [
    {
      label: "Recommendations Generated",
      value: String(model.health.recommendationsGenerated),
    },
    {
      label: "Recommendations Executed",
      value: String(model.health.recommendationsExecuted),
    },
    {
      label: "Execution Rate",
      value: `${model.health.executionRate.toFixed(1)}%`,
    },
    {
      label: "Recommendation Win Rate",
      value: `${model.health.recommendationWinRate.toFixed(1)}%`,
    },
    {
      label: "Average Return",
      value: formatPercent(model.health.averageReturn),
      tone:
        model.health.averageReturn > 0
          ? ("gain" as const)
          : model.health.averageReturn < 0
            ? ("loss" as const)
            : undefined,
    },
    {
      label: "Average Holding Period",
      value: formatHoldingDuration(model.health.averageHoldingMs),
    },
    {
      label: "Average Conviction",
      value: model.health.averageConviction.toFixed(1),
    },
    {
      label: "Average Risk Reward",
      value: model.health.averageRiskReward.toFixed(2),
    },
    {
      label: "Average Recommendation Age",
      value: formatHoldingDuration(model.health.averageRecommendationAgeMs),
    },
  ];

  const qualityCards: Array<{
    key: keyof typeof model.quality.explanations;
    label: string;
    value: string;
  }> = [
    {
      key: "recommendationAccuracy",
      label: "Recommendation Accuracy",
      value: `${model.quality.recommendationAccuracy.toFixed(1)}`,
    },
    {
      key: "recommendationStability",
      label: "Recommendation Stability",
      value: `${model.quality.recommendationStability.toFixed(1)}`,
    },
    {
      key: "riskManagement",
      label: "Risk Management",
      value: `${model.quality.riskManagement.toFixed(1)}`,
    },
    {
      key: "targetAccuracy",
      label: "Target Accuracy",
      value: `${model.quality.targetAccuracy.toFixed(1)}`,
    },
    {
      key: "stopLossAccuracy",
      label: "Stop Loss Accuracy",
      value: `${model.quality.stopLossAccuracy.toFixed(1)}`,
    },
    {
      key: "overallAiQualityScore",
      label: "Overall AI Quality Score",
      value: `${model.quality.overallAiQualityScore.toFixed(1)}`,
    },
  ];

  return (
    <section className="space-y-8">
      <IntelligenceHeader />

      {/* Section 1 */}
      <section className="space-y-3">
        <SectionHeader n={1} title="AI Recommendation Health" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-9">
          {healthCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              className={cn(
                "p-3",
                card.tone === "gain" && "[&_.font-mono]:text-gain",
                card.tone === "loss" && "[&_.font-mono]:text-loss"
              )}
            />
          ))}
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <SectionHeader
          n={2}
          title="Confidence Accuracy Analysis"
          subtitle="Actual performance by confidence band"
        />
        <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
          <table className={TABLE_CLASSES.table}>
            <caption className="sr-only">Confidence accuracy buckets</caption>
            <thead>
              <tr>
                <th>Confidence</th>
                <th className="text-right">Trades</th>
                <th className="text-right">Win Rate</th>
                <th className="text-right">Average Return</th>
                <th>Average Holding Time</th>
                <th className="text-right">Average R:R</th>
                <th className="text-right">Largest Winner</th>
                <th className="text-right">Largest Loser</th>
              </tr>
            </thead>
            <tbody>
              {model.confidenceAccuracy.map((row) => (
                <tr key={row.bucket}>
                  <td className="font-medium text-text-primary">{row.label}</td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.trades}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right",
                      row.averageReturn >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(row.averageReturn)}
                  </td>
                  <td className="text-text-secondary">
                    {formatHoldingDuration(row.averageHoldingMs)}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.averageRiskReward.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right text-gain"
                    )}
                  >
                    {formatPnl(row.largestWinner)}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right text-loss"
                    )}
                  >
                    {formatPnl(row.largestLoser)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <SectionHeader n={3} title="Sector Performance" />
        {model.sectorPerformance.length === 0 ? (
          <EmptyStatePanel
            message="No closed trades available for sector ranking."
            source="Sector Intelligence"
          />
        ) : (
          <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
            <table className={TABLE_CLASSES.table}>
              <caption className="sr-only">Sector performance ranking</caption>
              <thead>
                <tr>
                  <th>Sector</th>
                  <th className="text-right">Trades</th>
                  <th className="text-right">Win Rate</th>
                  <th className="text-right">Average Return</th>
                  <th className="text-right">Total P&L</th>
                  <th>Best Company</th>
                  <th>Worst Company</th>
                </tr>
              </thead>
              <tbody>
                {model.sectorPerformance.map((row) => (
                  <tr key={row.sector}>
                    <td className="font-medium text-text-primary">
                      {row.sector}
                    </td>
                    <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                      {row.trades}
                    </td>
                    <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                      {row.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right",
                        row.averageReturn >= 0 ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPercent(row.averageReturn)}
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right font-medium",
                        row.totalPnl >= 0 ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPnl(row.totalPnl)}
                    </td>
                    <td className="text-text-secondary">{row.bestCompany}</td>
                    <td className="text-text-secondary">{row.worstCompany}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <SectionHeader n={4} title="Market Regime Analysis" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {model.marketRegimes.map((row) => (
            <div
              key={row.regime}
              className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {row.label}
              </p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <dt className="text-text-muted">Trades</dt>
                  <dd className="font-mono text-text-primary">{row.trades}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-text-muted">Win Rate</dt>
                  <dd className="font-mono text-text-primary">
                    {row.winRate.toFixed(1)}%
                  </dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-text-muted">Avg Return</dt>
                  <dd
                    className={cn(
                      "font-mono",
                      row.averageReturn >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(row.averageReturn)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-text-muted">Avg Drawdown</dt>
                  <dd className="font-mono text-loss">
                    {formatPnl(-Math.abs(row.averageDrawdown))}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <SectionHeader n={5} title="Strategy Intelligence" />
        <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
          <table className={TABLE_CLASSES.table}>
            <caption className="sr-only">Strategy intelligence</caption>
            <thead>
              <tr>
                <th>Strategy</th>
                <th className="text-right">Recommendations</th>
                <th className="text-right">Trades</th>
                <th className="text-right">Win Rate</th>
                <th className="text-right">Average Return</th>
                <th className="text-right">Profit Factor</th>
                <th className="text-right">Drawdown</th>
                <th>Avg Holding</th>
                <th className="text-right">Target Hit %</th>
                <th className="text-right">Stop Loss %</th>
              </tr>
            </thead>
            <tbody>
              {model.strategyIntelligence.map((row) => (
                <tr key={row.strategy}>
                  <td className="font-medium text-text-primary">
                    {PAPER_STRATEGY_LABELS[row.strategy]}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.recommendations}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.trades}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right",
                      row.averageReturn >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(row.averageReturn)}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.profitFactor >= 99.99
                      ? "∞"
                      : row.profitFactor.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right text-loss"
                    )}
                  >
                    {formatPnl(-Math.abs(row.drawdown))}
                  </td>
                  <td className="text-text-secondary">
                    {formatHoldingDuration(row.averageHoldingMs)}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.targetHitPercent.toFixed(1)}%
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {row.stopLossPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <SectionHeader n={6} title="Recommendation Failure Analysis" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {model.failureAnalysis.map((row) => (
            <div
              key={row.reason}
              className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-3"
            >
              <div className="flex items-center gap-1.5 text-text-muted">
                <ShieldAlert className="h-3.5 w-3.5" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">
                  {row.label}
                </p>
              </div>
              <p className="mt-2 font-mono text-lg font-semibold text-text-primary tabular-nums">
                {row.count}
              </p>
              <p className="text-[10px] text-text-faint">
                {row.percent.toFixed(1)}% of failures
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full bg-loss/70"
                  style={{ width: `${Math.min(100, row.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7 & 8 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gain" />
            <SectionHeader n={7} title="Top Performing Recommendations" />
          </div>
          {model.topRecommendations.length === 0 ? (
            <EmptyStatePanel
              message="No winning closed recommendations yet."
              source="Leaderboard"
              className="py-5"
            />
          ) : (
            <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
              <table className={TABLE_CLASSES.table}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Strategy</th>
                    <th className="text-right">Confidence</th>
                    <th className="text-right">Return</th>
                    <th>Holding Time</th>
                    <th>Recommendation Date</th>
                    <th>Exit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {model.topRecommendations.map((row) => (
                    <tr
                      key={row.tradeId}
                      className="cursor-pointer"
                      onClick={() => onSelectTrade(row.trade)}
                    >
                      <td className="font-medium text-text-primary">
                        {row.symbol}
                      </td>
                      <td className="text-text-secondary">
                        {PAPER_STRATEGY_LABELS[row.strategy]}
                      </td>
                      <td
                        className={cn(TABLE_CLASSES.numericCell, "text-right")}
                      >
                        {row.confidence.toFixed(0)}%
                      </td>
                      <td
                        className={cn(
                          TABLE_CLASSES.numericCell,
                          "text-right text-gain"
                        )}
                      >
                        {formatPercent(row.returnPercent)}
                      </td>
                      <td className="text-text-secondary">
                        {formatHoldingDuration(row.holdingMs)}
                      </td>
                      <td className="text-text-secondary whitespace-nowrap">
                        {formatDateTime(row.recommendationDate)}
                      </td>
                      <td className="text-text-secondary">{row.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-loss" />
            <SectionHeader n={8} title="Low Performing Recommendations" />
          </div>
          {model.weakRecommendations.length === 0 ? (
            <EmptyStatePanel
              message="No losing closed recommendations yet."
              source="Weak analysis"
              className="py-5"
            />
          ) : (
            <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
              <table className={TABLE_CLASSES.table}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Strategy</th>
                    <th className="text-right">Confidence</th>
                    <th className="text-right">Return</th>
                    <th>Failure Reason</th>
                    <th className="text-right">Max Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {model.weakRecommendations.map((row) => (
                    <tr
                      key={row.tradeId}
                      className="cursor-pointer"
                      onClick={() => onSelectTrade(row.trade)}
                    >
                      <td className="font-medium text-text-primary">
                        {row.symbol}
                      </td>
                      <td className="text-text-secondary">
                        {PAPER_STRATEGY_LABELS[row.strategy]}
                      </td>
                      <td
                        className={cn(TABLE_CLASSES.numericCell, "text-right")}
                      >
                        {row.confidence.toFixed(0)}%
                      </td>
                      <td
                        className={cn(
                          TABLE_CLASSES.numericCell,
                          "text-right text-loss"
                        )}
                      >
                        {formatPercent(row.returnPercent)}
                      </td>
                      <td className="text-text-secondary">
                        {row.failureReason}
                      </td>
                      <td
                        className={cn(
                          TABLE_CLASSES.numericCell,
                          "text-right text-loss"
                        )}
                      >
                        {row.maximumDrawdown.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Section 9 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" />
          <SectionHeader
            n={9}
            title="AI Quality Score"
            subtitle="Institutional health metrics with explanations"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {qualityCards.map((card) => (
            <div
              key={card.key}
              className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-3"
              title={model.quality.explanations[card.key]}
            >
              <p className="text-[10px] text-text-muted">{card.label}</p>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tabular-nums",
                  card.key === "overallAiQualityScore"
                    ? "text-violet-300"
                    : "text-text-primary"
                )}
              >
                {card.value}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
                {model.quality.explanations[card.key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 10 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-300" />
          <SectionHeader
            n={10}
            title="Improvement Insights"
            subtitle="Dynamically generated from historical paper-trade outcomes"
          />
        </div>
        {model.insights.length === 0 ? (
          <EmptyStatePanel
            icon={Lightbulb}
            title="No AI insights available"
            message="Insights appear once enough closed paper-trade history is available for pattern detection."
            source="AI Insights"
          />
        ) : (
          <ul className="space-y-2">
            {model.insights.map((insight) => (
              <li
                key={insight.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-xs leading-relaxed text-text-secondary",
                  insight.severity === "positive" &&
                    "border-gain/25 bg-gain/5",
                  insight.severity === "caution" &&
                    "border-loss/25 bg-loss/5",
                  insight.severity === "neutral" &&
                    "border-surface-border-subtle bg-surface-overlay/30"
                )}
              >
                {insight.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
