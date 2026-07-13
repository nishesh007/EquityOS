import type { ConvictionComponents } from "@/lib/opportunity-engine/conviction";
import { computeConvictionComponents } from "@/lib/opportunity-engine/conviction";
import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

export interface ConvictionDisplayBreakdown {
  technical: number;
  momentum: number;
  volume: number;
  fundamental: number;
  institutional: number;
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
  fundamental: "Fundamental",
  institutional: "Institutional",
  penalty: "Penalty",
};

function num(metrics: Record<string, number | string | null>, key: string): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;

  const technical = Math.round((components.technical * 0.55 + components.trend * 0.45) * 0.34);
  const momentum = Math.round(components.momentum * 0.18);
  const volume = Math.round((components.volume * 0.6 + components.liquidity * 0.4) * 0.15);
  const fundamental = Math.round(components.fundamentals * 0.17);
  const institutional = Math.round(
    Math.min(12, delivery * 0.12 + volumeRatio * 3 + components.relativeStrength * 0.04)
  );

  let penalty = 0;
  if (volatility > 45) penalty += 4;
  if (side === "Long" && rsi > 75) penalty += 3;
  if (side === "Short" && rsi < 25) penalty += 3;
  if (riskReward < 1.5) penalty += 2;
  if (category === "mean_reversion" && Math.abs(rsi - 50) < 8) penalty += 2;

  const parts = [technical, momentum, volume, fundamental, institutional];
  const rawTotal = parts.reduce((sum, value) => sum + value, 0) - penalty;
  const scale = rawTotal > 0 ? finalScore / rawTotal : 1;

  return {
    technical: Math.round(technical * scale),
    momentum: Math.round(momentum * scale),
    volume: Math.round(volume * scale),
    fundamental: Math.round(fundamental * scale),
    institutional: Math.round(institutional * scale),
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
