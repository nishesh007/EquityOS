/**
 * Multi-strategy consensus and conflict resolution for Swing/Position suites.
 */

import type { OpportunityStrategySignal } from "@/lib/opportunity-engine/types";
import {
  frameworkLabelForStrategy,
  isPositionStrategyId,
  isSwingStrategyId,
} from "@/lib/opportunity-engine/swing-position-catalog";

export interface StrategyConsensusResult {
  primaryStrategy: string;
  primaryStrategyId: string;
  supportingStrategies: string[];
  opposingStrategies: string[];
  agreementPercent: number;
  conflictPercent: number;
  agreementScore: number;
  combinedScore: number;
  finalConfidence: number;
  conviction: number;
  technicalFramework: string[];
  fundamentalFramework: string[];
  valuationFramework: string[];
  growthFramework: string[];
  combinedVerdict: string;
}

function direction(signal: OpportunityStrategySignal): "long" | "short" | "neutral" {
  if (signal.signal === "BUY") return "long";
  if (signal.signal === "SELL") return "short";
  if (signal.signal === "WATCHLIST") return "long";
  return "neutral";
}

function actionable(signals: readonly OpportunityStrategySignal[]) {
  return signals.filter((signal) => signal.signal !== "IGNORE");
}

/**
 * Build consensus across matched Swing/Position strategy signals.
 */
export function buildStrategyConsensus(
  signals: readonly OpportunityStrategySignal[],
  primary: OpportunityStrategySignal | null
): StrategyConsensusResult | null {
  const matched = actionable(signals);
  if (!primary || matched.length === 0) return null;

  const primaryDirection = direction(primary);
  const supporting = matched.filter(
    (signal) =>
      signal.strategyId !== primary.strategyId &&
      direction(signal) === primaryDirection &&
      primaryDirection !== "neutral"
  );
  const opposing = matched.filter(
    (signal) =>
      signal.strategyId !== primary.strategyId &&
      direction(signal) !== "neutral" &&
      direction(signal) !== primaryDirection
  );

  const peers = matched.length - 1;
  const agreementPercent =
    peers <= 0
      ? 100
      : Math.round((supporting.length / peers) * 100);
  const conflictPercent =
    peers <= 0 ? 0 : Math.round((opposing.length / peers) * 100);

  const agreementScore = Math.round(
    (agreementPercent * 0.7 + Math.max(0, 100 - conflictPercent) * 0.3)
  );
  const avgConfidence =
    matched.reduce((sum, signal) => sum + signal.confidence, 0) / matched.length;
  const avgQuality =
    matched.reduce((sum, signal) => sum + (signal.riskReward || 0), 0) /
    matched.length;
  const combinedScore = Math.round(
    Math.min(
      100,
      avgConfidence * 0.55 +
        agreementScore * 0.25 +
        Math.min(avgQuality * 12, 20) +
        Math.min(supporting.length * 4, 12)
    )
  );
  const finalConfidence = Math.round(
    Math.min(100, primary.confidence + supporting.length * 3 - opposing.length * 4)
  );
  const conviction = Math.round(
    Math.min(100, combinedScore * 0.7 + finalConfidence * 0.3)
  );

  const technicalFramework: string[] = [];
  const fundamentalFramework: string[] = [];
  const valuationFramework: string[] = [];
  const growthFramework: string[] = [];
  for (const signal of matched) {
    const labels = frameworkLabelForStrategy(signal.strategyId);
    if (labels.technical) technicalFramework.push(signal.strategy);
    if (labels.fundamental) fundamentalFramework.push(signal.strategy);
    if (labels.valuation) valuationFramework.push(signal.strategy);
    if (labels.growth) growthFramework.push(signal.strategy);
  }

  const suite = matched.every((signal) => isPositionStrategyId(signal.strategyId))
    ? "Position"
    : matched.every((signal) => isSwingStrategyId(signal.strategyId))
      ? "Swing"
      : "Mixed";

  const combinedVerdict =
    conflictPercent >= 40
      ? `${suite} conflict — ${primary.strategy} leads with ${finalConfidence}% confidence amid ${conflictPercent}% disagreement`
      : agreementPercent >= 60
        ? `${suite} consensus — ${supporting.length + 1} strategies aligned (${agreementPercent}% agreement)`
        : `${suite} lead — ${primary.strategy} primary with limited confirmation`;

  return {
    primaryStrategy: primary.strategy,
    primaryStrategyId: primary.strategyId,
    supportingStrategies: supporting.map((signal) => signal.strategy),
    opposingStrategies: opposing.map((signal) => signal.strategy),
    agreementPercent,
    conflictPercent,
    agreementScore,
    combinedScore,
    finalConfidence,
    conviction,
    technicalFramework: [...new Set(technicalFramework)],
    fundamentalFramework: [...new Set(fundamentalFramework)],
    valuationFramework: [...new Set(valuationFramework)],
    growthFramework: [...new Set(growthFramework)],
    combinedVerdict,
  };
}
