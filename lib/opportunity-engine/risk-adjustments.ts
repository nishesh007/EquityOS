import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

export interface RiskAdjustmentContribution {
  label: string;
  contribution: number;
}

function num(
  metrics: Record<string, number | string | null>,
  key: string
): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pushAdjustment(
  adjustments: RiskAdjustmentContribution[],
  label: string,
  amount: number
): void {
  if (amount <= 0) return;
  adjustments.push({ label, contribution: -Math.round(amount) });
}

function mergeRiskAdjustments(
  adjustments: RiskAdjustmentContribution[]
): RiskAdjustmentContribution[] {
  const merged = new Map<string, number>();
  for (const item of adjustments) {
    merged.set(item.label, (merged.get(item.label) ?? 0) + item.contribution);
  }
  return [...merged.entries()].map(([label, contribution]) => ({ label, contribution }));
}

/**
 * Explainable risk deductions for confidence reason contributions.
 * Point values mirror the prior aggregated penalty logic.
 */
export function buildReasonRiskAdjustments(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward: number
): RiskAdjustmentContribution[] {
  const adjustments: RiskAdjustmentContribution[] = [];
  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const adx = num(metrics, "adx") ?? 0;

  if (volatility > 50) pushAdjustment(adjustments, "Gap Risk", 5);
  else if (volatility > 45) pushAdjustment(adjustments, "Gap Risk", 3);

  if (side === "Long" && rsi > 78) pushAdjustment(adjustments, "Near Resistance", 4);
  if (side === "Short" && rsi < 22) pushAdjustment(adjustments, "Near Resistance", 4);

  if (riskReward < 1.5) pushAdjustment(adjustments, "Poor Risk/Reward", 3);

  if (category === "mean_reversion" && Math.abs(rsi - 50) < 8) {
    pushAdjustment(adjustments, "Trend Weakening", 2);
  }

  if (volumeRatio < 1.1) pushAdjustment(adjustments, "Low Liquidity", 2);
  if (adx < 18 && category !== "mean_reversion") pushAdjustment(adjustments, "Trend Weakening", 2);

  return mergeRiskAdjustments(adjustments);
}

/**
 * Explainable risk deductions for conviction breakdown popups.
 * Point values mirror the prior aggregated penalty logic.
 */
export function buildConvictionRiskAdjustments(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward: number
): RiskAdjustmentContribution[] {
  const adjustments: RiskAdjustmentContribution[] = [];
  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;

  if (volatility > 50) pushAdjustment(adjustments, "Gap Risk", 5);
  else if (volatility > 45) pushAdjustment(adjustments, "Gap Risk", 3);

  if (side === "Long" && rsi > 75) pushAdjustment(adjustments, "Near Resistance", 3);
  if (side === "Short" && rsi < 25) pushAdjustment(adjustments, "Near Resistance", 3);

  if (riskReward < 1.5) pushAdjustment(adjustments, "Poor Risk/Reward", 3);

  if (category === "mean_reversion" && Math.abs(rsi - 50) < 8) {
    pushAdjustment(adjustments, "Trend Weakening", 2);
  }

  return mergeRiskAdjustments(adjustments);
}

/**
 * Explainable risk deductions for Best Call score hover breakdown.
 * Raw amounts mirror penaltyScore(); weighted display is applied separately.
 */
export function buildBestCallRiskAdjustments(
  metrics: Record<string, number | string | null> | undefined,
  side: "Long" | "Short",
  riskReward: number
): RiskAdjustmentContribution[] {
  const adjustments: RiskAdjustmentContribution[] = [];
  if (!metrics) return adjustments;

  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;

  if (volatility > 50) pushAdjustment(adjustments, "Gap Risk", 12);
  else if (volatility > 40) pushAdjustment(adjustments, "Gap Risk", 6);

  if (side === "Long" && rsi > 78) pushAdjustment(adjustments, "Near Resistance", 10);
  if (side === "Short" && rsi < 22) pushAdjustment(adjustments, "Near Resistance", 10);

  if (riskReward < 1.5) pushAdjustment(adjustments, "Poor Risk/Reward", 8);

  return mergeRiskAdjustments(adjustments);
}

export function isLegacyPenaltyLabel(label: string): boolean {
  return label.toLowerCase() === "penalty";
}

export const RISK_ADJUSTMENT_FALLBACK_LABEL = "Risk Adjustment";
