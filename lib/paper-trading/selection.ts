/**
 * Paper Trading Lab — recommendation → strategy mapping & selection (11E.1).
 * Read-only consumption of SharedRecommendation.
 */

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { PaperStrategy } from "@/lib/paper-trading/types";
import { PAPER_TRADING_CONFIG } from "@/lib/paper-trading/config";

const STRATEGY_IDS = new Set<PaperStrategy>(["intraday", "scalping", "swing"]);

/**
 * Map a shared recommendation onto one paper portfolio.
 * Priority: primaryStrategyId → category → holding-period heuristics.
 */
export function resolvePaperStrategy(
  recommendation: SharedRecommendation
): PaperStrategy | null {
  const id = recommendation.primaryStrategyId?.toLowerCase?.() ?? "";
  if (STRATEGY_IDS.has(id as PaperStrategy)) {
    return id as PaperStrategy;
  }

  const category = recommendation.category?.toLowerCase?.() ?? "";
  if (category === "intraday") return "intraday";
  if (category === "swing") return "swing";

  const matched = [
    recommendation.primaryStrategy,
    ...(recommendation.matchedStrategies ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/\bscalp/.test(matched)) return "scalping";
  if (/\bintraday\b/.test(matched) || id === "btst") return "intraday";
  if (/\bswing\b/.test(matched) || id === "short_term") return "swing";

  const holding = recommendation.holdingPeriod?.toLowerCase?.() ?? "";
  if (/minute/.test(holding)) {
    return /5\s*[–-]\s*30|scalp/.test(holding) ? "scalping" : "intraday";
  }
  if (/day|week|month/.test(holding)) return "swing";

  return null;
}

export function isBuyableRecommendation(
  recommendation: SharedRecommendation
): boolean {
  if (recommendation.action !== "BUY") return false;
  if (!(recommendation.entry > 0)) return false;
  if (!(recommendation.stopLoss > 0)) return false;
  if (!Array.isArray(recommendation.targets) || recommendation.targets.length === 0) {
    return false;
  }
  if (!(recommendation.conviction > 0)) return false;
  return true;
}

/**
 * Selection priority (Sprint 11E.1):
 * Highest Conviction → Highest Recommendation Score → Highest Risk/Reward → Latest
 */
export function compareRecommendationsForPaper(
  a: SharedRecommendation,
  b: SharedRecommendation
): number {
  if (b.conviction !== a.conviction) return b.conviction - a.conviction;
  const scoreA = a.opportunityScore ?? 0;
  const scoreB = b.opportunityScore ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  if (b.riskReward !== a.riskReward) return b.riskReward - a.riskReward;
  return Date.parse(b.timestamp) - Date.parse(a.timestamp);
}

export function selectCandidatesForStrategy(
  recommendations: readonly SharedRecommendation[],
  strategy: PaperStrategy,
  options: {
    testedIds: ReadonlySet<string>;
    openSymbols: ReadonlySet<string>;
    openSlotsRemaining: number;
  }
): SharedRecommendation[] {
  if (options.openSlotsRemaining <= 0) return [];

  return recommendations
    .filter((rec) => isBuyableRecommendation(rec))
    .filter((rec) => resolvePaperStrategy(rec) === strategy)
    .filter((rec) => !options.testedIds.has(rec.id))
    .filter((rec) => !options.openSymbols.has(rec.symbol.toUpperCase()))
    .slice()
    .sort(compareRecommendationsForPaper)
    .slice(
      0,
      Math.min(options.openSlotsRemaining, PAPER_TRADING_CONFIG.maxTradesPerStrategy)
    );
}
