import { createScoreResult } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import { clamp, round } from "@/lib/engine/utils";
import { isValidMarketPrice } from "@/lib/utils";
import type {
  ConvictionLevel,
  SwingTradeSetup,
  TechnicalAnalysis,
  TradingData,
} from "@/types";

const REFERENCE_CAPITAL = 1_000_000;

export interface SwingBuildResult {
  setup: SwingTradeSetup;
  scoreResult: ScoreResult;
}

const EMPTY_SWING: SwingTradeSetup = {
  entryLow: 0,
  entryHigh: 0,
  stopLoss: 0,
  target1: 0,
  target2: 0,
  target3: 0,
  riskRewardRatio: 0,
  capitalAllocationPercent: 0,
  referenceCapital: REFERENCE_CAPITAL,
  positionSize: 0,
  conviction: "Low",
  swingScore: 0,
  timeHorizon: "2 – 6 weeks",
  strategy: "Awaiting valid market price data.",
};

/**
 * Builds swing trade setup and computes Swing Score centrally.
 */
export function buildSwingSetup(
  price: number,
  technicals: TechnicalAnalysis,
  trading: TradingData,
  rng: () => number
): SwingBuildResult {
  if (!isValidMarketPrice(price)) {
    return {
      setup: { ...EMPTY_SWING },
      scoreResult: createScoreResult({
        key: "swing",
        label: "Swing Score",
        category: "swing",
        rawScore: 0,
        explanation: "Swing setup unavailable without valid market price.",
      }),
    };
  }

  const entryHigh = round(price * (1 - 0.004));
  const entryLow = round(price * (1 - (0.018 + rng() * 0.01)));
  const entryAvg = (entryHigh + entryLow) / 2;

  const stopLoss = round(entryLow * (1 - (0.032 + rng() * 0.02)));
  const risk = Math.max(entryAvg - stopLoss, price * 0.01);

  const target1 = round(entryAvg + risk * 1.6);
  const target2 = round(entryAvg + risk * 3.1);
  const target3 = round(entryAvg + risk * 5.0);

  const riskRewardRatio = risk > 0 ? round((target2 - entryAvg) / risk, 1) : 0;

  const conviction: ConvictionLevel =
    technicals.score >= 65 ? "High" : technicals.score >= 48 ? "Medium" : "Low";

  const capitalAllocationPercent =
    conviction === "High" ? 9 : conviction === "Medium" ? 6 : 3;

  const positionSize = entryAvg > 0
    ? Math.max(1, Math.floor((REFERENCE_CAPITAL * (capitalAllocationPercent / 100)) / entryAvg))
    : 0;

  const deliveryPct = Number.isFinite(trading.deliveryPercent) ? trading.deliveryPercent : 40;

  const rawScore = clamp(
    technicals.score * 0.6 +
      riskRewardRatio * 6 +
      (deliveryPct - 40) * 0.3,
    10,
    98
  );

  const scoreResult = createScoreResult({
    key: "swing",
    label: "Swing Score",
    category: "swing",
    rawScore,
    explanation: `Swing setup blends technical score (${technicals.score}), risk-reward (${riskRewardRatio}x), and delivery (${deliveryPct}%).`,
    contributingFactors: [
      { key: "technical", label: "Technical Score", value: technicals.score, weight: 0.6 },
      { key: "risk-reward", label: "Risk/Reward", value: riskRewardRatio, weight: 6 },
      { key: "delivery", label: "Delivery %", value: deliveryPct, weight: 0.3 },
    ],
  });

  const strategy =
    conviction === "High"
      ? "Accumulate on dips into the entry zone; trail stop under EMA 20 after Target 1."
      : conviction === "Medium"
        ? "Enter partial on a close above the entry zone; add on volume confirmation."
        : "Wait for a decisive breakout above resistance before committing risk.";

  return {
    setup: {
      entryLow,
      entryHigh,
      stopLoss,
      target1,
      target2,
      target3,
      riskRewardRatio: Number.isFinite(riskRewardRatio) ? riskRewardRatio : 0,
      capitalAllocationPercent,
      referenceCapital: REFERENCE_CAPITAL,
      positionSize,
      conviction,
      swingScore: scoreResult.normalizedScore,
      timeHorizon: "2 – 6 weeks",
      strategy,
    },
    scoreResult,
  };
}
