/**
 * Alert Scoring Engine — multi-factor signal scoring (Sprint 9C.R4).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { ALERT_PRIORITY_RANK } from "../AlertPriority";
import { ALERT_SEVERITY_RANK } from "../AlertSeverity";

export interface AlertScoreFactors {
  aiConfidence: number;
  technicalStrength: number;
  fundamentalStrength: number;
  marketStrength: number;
  sectorStrength: number;
  historicalAccuracy: number;
  portfolioImpact: number;
  watchlistImpact: number;
  institutionalGrade: number;
  validationScore: number;
  trustScore: number;
}

export interface ScoredAlert {
  alert: InstitutionalAlert;
  rank: number;
  score: number;
  factors: AlertScoreFactors;
}

const WEIGHTS = {
  aiConfidence: 12,
  technicalStrength: 12,
  fundamentalStrength: 12,
  marketStrength: 10,
  sectorStrength: 8,
  historicalAccuracy: 6,
  portfolioImpact: 12,
  watchlistImpact: 6,
  institutionalGrade: 8,
  validationScore: 7,
  trustScore: 7,
} as const;

function metaNum(alert: InstitutionalAlert, key: string, fallback: number): number {
  const raw = alert.metadata.extras[key];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function extractAlertScoreFactors(
  alert: InstitutionalAlert
): AlertScoreFactors {
  const categoryBoost =
    alert.category === "Technical"
      ? 10
      : alert.category === "Fundamental"
        ? 8
        : 0;

  return {
    aiConfidence: alert.confidence.score,
    technicalStrength:
      metaNum(alert, "technicalStrength", alert.category === "Technical" ? 60 : 40) +
      (alert.category === "Technical" ? categoryBoost : 0),
    fundamentalStrength: metaNum(
      alert,
      "fundamentalStrength",
      alert.category === "Fundamental" ? 60 : 40
    ),
    marketStrength: metaNum(alert, "marketStrength", 50),
    sectorStrength: metaNum(alert, "sectorStrength", 50),
    historicalAccuracy: metaNum(alert, "historicalAccuracy", 55),
    portfolioImpact: alert.inPortfolio ? 88 : 22,
    watchlistImpact: alert.inWatchlist ? 72 : 18,
    institutionalGrade: metaNum(
      alert,
      "institutionalGrade",
      alert.confidence.score
    ),
    validationScore: metaNum(alert, "validationScore", 60),
    trustScore: metaNum(alert, "trustScore", 60),
  };
}

export function computeAlertScore(factors: AlertScoreFactors): number {
  const total =
    (clamp(factors.aiConfidence) * WEIGHTS.aiConfidence +
      clamp(factors.technicalStrength) * WEIGHTS.technicalStrength +
      clamp(factors.fundamentalStrength) * WEIGHTS.fundamentalStrength +
      clamp(factors.marketStrength) * WEIGHTS.marketStrength +
      clamp(factors.sectorStrength) * WEIGHTS.sectorStrength +
      clamp(factors.historicalAccuracy) * WEIGHTS.historicalAccuracy +
      clamp(factors.portfolioImpact) * WEIGHTS.portfolioImpact +
      clamp(factors.watchlistImpact) * WEIGHTS.watchlistImpact +
      clamp(factors.institutionalGrade) * WEIGHTS.institutionalGrade +
      clamp(factors.validationScore) * WEIGHTS.validationScore +
      clamp(factors.trustScore) * WEIGHTS.trustScore) /
    100;
  return Math.round(total * 100) / 100;
}

/** Public API — scoreAlerts() */
export function scoreAlerts(
  alerts: readonly InstitutionalAlert[]
): ScoredAlert[] {
  const scored = alerts.map((alert) => {
    const factors = extractAlertScoreFactors(alert);
    return {
      alert,
      rank: 0,
      score: computeAlertScore(factors),
      factors,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pr =
      ALERT_PRIORITY_RANK[a.alert.priority] -
      ALERT_PRIORITY_RANK[b.alert.priority];
    if (pr !== 0) return pr;
    return (
      ALERT_SEVERITY_RANK[a.alert.severity] -
      ALERT_SEVERITY_RANK[b.alert.severity]
    );
  });

  return scored.map((item, i) => ({ ...item, rank: i + 1 }));
}
