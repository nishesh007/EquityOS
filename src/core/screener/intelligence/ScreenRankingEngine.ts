/**
 * Institutional AI Screener — ranking engine (Sprint 9D.R2).
 */

import type { ScreenResultCard, ScreenRankingMode } from "./ScreenPresentationModels";

function rankKey(card: ScreenResultCard, mode: ScreenRankingMode): number {
  const f = card.factors;
  switch (mode) {
    case "Technical":
      return f.technicalStrength;
    case "Fundamental":
      return f.fundamentalStrength;
    case "Momentum":
      return f.momentumStrength;
    case "Growth":
      return f.fundamentalStrength * 0.6 + f.momentumStrength * 0.4;
    case "Value":
      return f.fundamentalStrength * 0.7 + (100 - Math.min(100, card.price / 100)) * 0.05;
    case "Quality":
      return f.fundamentalStrength * 0.5 + f.trustScore * 0.3 + f.validationScore * 0.2;
    case "Income":
      return f.fundamentalStrength * 0.55 + f.trustScore * 0.25 + f.aiConfidence * 0.2;
    case "Turnaround":
      return f.momentumStrength * 0.4 + f.technicalStrength * 0.3 + f.validationScore * 0.3;
    case "Overall":
    default:
      return f.finalAiScreenerScore;
  }
}

export function rankScreenResults(
  cards: ScreenResultCard[],
  mode: ScreenRankingMode = "Overall"
): ScreenResultCard[] {
  const sorted = [...cards].sort((a, b) => {
    const diff = rankKey(b, mode) - rankKey(a, mode);
    if (diff !== 0) return diff;
    return b.aiScore - a.aiScore;
  });
  return sorted.map((card, index) => ({ ...card, rank: index + 1 }));
}

export class ScreenRankingEngine {
  rank(
    cards: ScreenResultCard[],
    mode: ScreenRankingMode = "Overall"
  ): ScreenResultCard[] {
    return rankScreenResults(cards, mode);
  }
}

export function rankResults(
  cards: ScreenResultCard[],
  mode: ScreenRankingMode = "Overall"
): ScreenResultCard[] {
  return rankScreenResults(cards, mode);
}
