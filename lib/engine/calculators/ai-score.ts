import { createScoreResult } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import { clamp } from "@/lib/engine/utils";
import type { CompanyProfile } from "@/types";

/**
 * Computes intraday conviction score from technical and momentum signals.
 */
export function calculateConvictionScore(
  profile: CompanyProfile,
  technicalScore: number,
  side: "Long" | "Short"
): ScoreResult {
  const momentumBoost = profile.changePercent * (side === "Long" ? 3 : -3);
  const rawScore = clamp(technicalScore * 0.7 + 20 + momentumBoost, 50, 95);

  return createScoreResult({
    key: "conviction",
    label: "Conviction Score",
    category: "conviction",
    rawScore,
    explanation: `${side} conviction derived from technical score (${technicalScore}) and session momentum (${profile.changePercent}%).`,
    contributingFactors: [
      { key: "technical", label: "Technical Score", value: technicalScore, weight: 0.7 },
      { key: "momentum", label: "Session Momentum", value: profile.changePercent, weight: 3 },
      { key: "side", label: "Trade Side", value: side },
    ],
  });
}

/**
 * Placeholder for future AI composite score.
 * Returns a deterministic mock until OpenAI adapter is connected.
 */
export function calculateAIScore(
  symbol: string,
  overallScore: number
): ScoreResult {
  const symbolOffset = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 12;
  const rawScore = clamp(overallScore * 0.85 + symbolOffset, 40, 98);

  return createScoreResult({
    key: "ai",
    label: "AI Score",
    category: "ai",
    rawScore,
    source: "mock",
    explanation: `Future AI composite score placeholder for ${symbol}. Will be replaced by OpenAI adapter.`,
    contributingFactors: [
      { key: "overall", label: "EquityOS Overall", value: overallScore, weight: 0.85 },
      { key: "ai-signal", label: "AI Signal Offset", value: symbolOffset },
    ],
  });
}
