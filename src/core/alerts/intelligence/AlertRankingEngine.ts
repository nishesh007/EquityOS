/**
 * Alert Ranking Engine — multi-factor institutional ranking (Sprint 9C.R2).
 */

import { ALERT_PRIORITY_RANK, type AlertPriority } from "../AlertPriority";
import { ALERT_SEVERITY_RANK, type AlertSeverity } from "../AlertSeverity";
import type { InstitutionalAlert } from "../AlertModels";

export interface AlertRankingFactors {
  priority: AlertPriority;
  severity: AlertSeverity;
  confidence: number;
  aiConviction: number;
  portfolioImpact: number;
  watchlistImpact: number;
  historicalAccuracy: number;
  risk: number;
  institutionalGrade: number;
}

export interface RankedAlert {
  alert: InstitutionalAlert;
  rank: number;
  score: number;
  factors: AlertRankingFactors;
}

const WEIGHTS = {
  priority: 28,
  severity: 18,
  confidence: 12,
  aiConviction: 12,
  portfolioImpact: 10,
  watchlistImpact: 6,
  historicalAccuracy: 5,
  risk: 5,
  institutionalGrade: 4,
} as const;

function bandToScore(rank: number, bandCount: number): number {
  // rank 0 (Critical) → 100; last → ~0
  if (bandCount <= 1) return 50;
  return Math.max(0, Math.round(100 - (rank / (bandCount - 1)) * 100));
}

function metaNumber(
  alert: InstitutionalAlert,
  key: string,
  fallback = 0
): number {
  const raw = alert.metadata.extras[key];
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function extractRankingFactors(
  alert: InstitutionalAlert
): AlertRankingFactors {
  const conviction = metaNumber(
    alert,
    "conviction",
    alert.confidence.score
  );
  const grade = metaNumber(alert, "institutionalGrade", conviction);
  const riskReward = metaNumber(alert, "riskReward", 0);
  const risk =
    alert.category === "Risk"
      ? Math.min(100, 60 + ALERT_SEVERITY_RANK[alert.severity] * -10 + 40)
      : Math.max(0, 100 - riskReward * 20);

  return {
    priority: alert.priority,
    severity: alert.severity,
    confidence: alert.confidence.score,
    aiConviction: conviction,
    portfolioImpact: alert.inPortfolio ? 85 : alert.category === "Portfolio" ? 70 : 20,
    watchlistImpact: alert.inWatchlist ? 70 : alert.category === "Watchlist" ? 60 : 15,
    historicalAccuracy: metaNumber(alert, "historicalAccuracy", 55),
    risk: Number.isFinite(risk) ? risk : 50,
    institutionalGrade: grade,
  };
}

export function scoreAlertFactors(factors: AlertRankingFactors): number {
  const priorityScore = bandToScore(
    ALERT_PRIORITY_RANK[factors.priority],
    5
  );
  const severityScore = bandToScore(
    ALERT_SEVERITY_RANK[factors.severity],
    5
  );

  const total =
    (priorityScore * WEIGHTS.priority +
      severityScore * WEIGHTS.severity +
      clamp(factors.confidence) * WEIGHTS.confidence +
      clamp(factors.aiConviction) * WEIGHTS.aiConviction +
      clamp(factors.portfolioImpact) * WEIGHTS.portfolioImpact +
      clamp(factors.watchlistImpact) * WEIGHTS.watchlistImpact +
      clamp(factors.historicalAccuracy) * WEIGHTS.historicalAccuracy +
      clamp(factors.risk) * WEIGHTS.risk +
      clamp(factors.institutionalGrade) * WEIGHTS.institutionalGrade) /
    100;

  return Math.round(total * 100) / 100;
}

export function rankAlerts(
  alerts: readonly InstitutionalAlert[]
): RankedAlert[] {
  const ranked = alerts.map((alert) => {
    const factors = extractRankingFactors(alert);
    return {
      alert,
      rank: 0,
      score: scoreAlertFactors(factors),
      factors,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pr =
      ALERT_PRIORITY_RANK[a.alert.priority] -
      ALERT_PRIORITY_RANK[b.alert.priority];
    if (pr !== 0) return pr;
    return Date.parse(b.alert.createdAt) - Date.parse(a.alert.createdAt);
  });

  return ranked.map((item, index) => ({ ...item, rank: index + 1 }));
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
