/**
 * News Ranking Engine — priority ranking for news/event alerts (Sprint 9C.R3).
 * Factors: AI confidence, business impact, historical accuracy, company importance,
 * portfolio/watchlist/market impact, urgency.
 */

import type { InstitutionalAlert } from "../AlertModels";
import { ALERT_PRIORITY_RANK } from "../AlertPriority";
import { ALERT_SEVERITY_RANK } from "../AlertSeverity";

export interface NewsRankingFactors {
  aiConfidence: number;
  businessImpact: number;
  historicalAccuracy: number;
  companyImportance: number;
  portfolioImpact: number;
  watchlistImpact: number;
  marketImpact: number;
  urgency: number;
}

export interface RankedNewsAlert {
  alert: InstitutionalAlert;
  rank: number;
  score: number;
  factors: NewsRankingFactors;
}

const WEIGHTS = {
  aiConfidence: 16,
  businessImpact: 18,
  historicalAccuracy: 8,
  companyImportance: 10,
  portfolioImpact: 14,
  watchlistImpact: 8,
  marketImpact: 10,
  urgency: 16,
} as const;

function metaNum(alert: InstitutionalAlert, key: string, fallback: number): number {
  const raw = alert.metadata.extras[key];
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function extractNewsRankingFactors(
  alert: InstitutionalAlert
): NewsRankingFactors {
  const priorityBoost =
    (4 - ALERT_PRIORITY_RANK[alert.priority]) * 20 +
    (4 - ALERT_SEVERITY_RANK[alert.severity]) * 5;

  return {
    aiConfidence: alert.confidence.score,
    businessImpact: metaNum(alert, "businessImpact", 50 + priorityBoost / 4),
    historicalAccuracy: metaNum(alert, "historicalAccuracy", 55),
    companyImportance: alert.ticker
      ? metaNum(alert, "companyImportance", alert.inPortfolio ? 80 : 55)
      : metaNum(alert, "companyImportance", 40),
    portfolioImpact: alert.inPortfolio ? 90 : 20,
    watchlistImpact: alert.inWatchlist ? 75 : 15,
    marketImpact: metaNum(
      alert,
      "marketImpact",
      alert.category === "News" && !alert.ticker ? 70 : 45
    ),
    urgency: metaNum(
      alert,
      "urgency",
      alert.metadata.eventType === "breaking_news" ? 90 : 50
    ),
  };
}

export function scoreNewsRankingFactors(factors: NewsRankingFactors): number {
  const total =
    (clamp(factors.aiConfidence) * WEIGHTS.aiConfidence +
      clamp(factors.businessImpact) * WEIGHTS.businessImpact +
      clamp(factors.historicalAccuracy) * WEIGHTS.historicalAccuracy +
      clamp(factors.companyImportance) * WEIGHTS.companyImportance +
      clamp(factors.portfolioImpact) * WEIGHTS.portfolioImpact +
      clamp(factors.watchlistImpact) * WEIGHTS.watchlistImpact +
      clamp(factors.marketImpact) * WEIGHTS.marketImpact +
      clamp(factors.urgency) * WEIGHTS.urgency) /
    100;
  return Math.round(total * 100) / 100;
}

/** Public ranking helper used by news / correlated event alerts. */
export function rankNewsAlerts(
  alerts: readonly InstitutionalAlert[]
): RankedNewsAlert[] {
  const ranked = alerts.map((alert) => {
    const factors = extractNewsRankingFactors(alert);
    return { alert, rank: 0, score: scoreNewsRankingFactors(factors), factors };
  });
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      ALERT_PRIORITY_RANK[a.alert.priority] -
      ALERT_PRIORITY_RANK[b.alert.priority]
    );
  });
  return ranked.map((item, i) => ({ ...item, rank: i + 1 }));
}
