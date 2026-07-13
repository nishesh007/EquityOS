import type { ConvictionComponents } from "@/lib/opportunity-engine/conviction";
import { computeConvictionComponents } from "@/lib/opportunity-engine/conviction";
import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

export interface ConvictionDisplayBreakdown {
  technical: number;
  momentum: number;
  volume: number;
  liquidity: number;
  fundamental: number;
  sector: number;
  institutional: number;
  riskReward: number;
  penalty: number;
  total: number;
}

export const CONVICTION_DISPLAY_LABELS: Record<
  keyof Omit<ConvictionDisplayBreakdown, "total">,
  string
> = {
  technical: "Technical",
  momentum: "Momentum",
  volume: "Volume",
  liquidity: "Liquidity",
  fundamental: "Fundamental",
  sector: "Sector",
  institutional: "Institutional",
  riskReward: "Risk Reward",
  penalty: "Penalty",
};

function num(metrics: Record<string, number | string | null>, key: string): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function computePenalty(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward: number
): number {
  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;
  let penalty = 0;
  if (volatility > 50) penalty += 5;
  else if (volatility > 45) penalty += 3;
  if (side === "Long" && rsi > 75) penalty += 3;
  if (side === "Short" && rsi < 25) penalty += 3;
  if (riskReward < 1.5) penalty += 3;
  if (category === "mean_reversion" && Math.abs(rsi - 50) < 8) penalty += 2;
  return penalty;
}

export function computeConvictionDisplayBreakdown(
  components: ConvictionComponents,
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward: number,
  finalScore: number
): ConvictionDisplayBreakdown {
  const delivery = num(metrics, "delivery_percent") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;

  const technical = Math.round((components.technical * 0.55 + components.trend * 0.45) * 0.14);
  const momentum = Math.round(components.momentum * 0.12);
  const volume = Math.round(components.volume * 0.12);
  const liquidity = Math.round(components.liquidity * 0.1);
  const fundamental = Math.round(components.fundamentals * 0.08);
  const sector = Math.round(components.relativeStrength * 0.1);
  const institutional = Math.round(
    Math.min(10, delivery * 0.1 + volumeRatio * 2.5 + components.marketRegime * 0.03)
  );
  const riskRewardPts = Math.round(components.rewardRisk * 0.1);
  const penalty = computePenalty(metrics, category, side, riskReward);

  const parts = [
    technical,
    momentum,
    volume,
    liquidity,
    fundamental,
    sector,
    institutional,
    riskRewardPts,
  ];
  const rawTotal = parts.reduce((sum, value) => sum + value, 0) - penalty;
  const scale = rawTotal > 0 ? finalScore / rawTotal : 1;

  return {
    technical: Math.round(technical * scale),
    momentum: Math.round(momentum * scale),
    volume: Math.round(volume * scale),
    liquidity: Math.round(liquidity * scale),
    fundamental: Math.round(fundamental * scale),
    sector: Math.round(sector * scale),
    institutional: Math.round(institutional * scale),
    riskReward: Math.round(riskRewardPts * scale),
    penalty,
    total: finalScore,
  };
}

export function resolveConvictionDisplayBreakdown(
  candidate: {
    convictionComponents?: ConvictionComponents;
    scanMetrics?: Record<string, number | string | null>;
    category: OpportunityCategory;
    side: "Long" | "Short";
    riskReward: number;
    aiConvictionScore: number;
  }
): ConvictionDisplayBreakdown {
  const metrics = candidate.scanMetrics ?? {};
  const components =
    candidate.convictionComponents ??
    computeConvictionComponents(
      metrics,
      candidate.category,
      candidate.side,
      candidate.riskReward
    );

  return computeConvictionDisplayBreakdown(
    components,
    metrics,
    candidate.category,
    candidate.side,
    candidate.riskReward,
    candidate.aiConvictionScore
  );
}
