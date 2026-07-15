/**
 * Institutional AI Alert Engine — confidence scoring (Sprint 9C.R1).
 * Never exposes null / undefined / NaN to consumers.
 */

export type AlertConfidenceLevel =
  | "Very High"
  | "High"
  | "Moderate"
  | "Low"
  | "Very Low"
  | "Unavailable";

export interface AlertConfidence {
  score: number;
  level: AlertConfidenceLevel;
  available: boolean;
  label: string;
}

export const ALERT_CONFIDENCE_EMPTY: AlertConfidence = {
  score: 0,
  level: "Unavailable",
  available: false,
  label: "Unavailable",
};

export function classifyConfidenceScore(
  score: number | null | undefined
): AlertConfidenceLevel {
  if (score == null || !Number.isFinite(score)) return "Unavailable";
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low";
  if (score >= 0) return "Very Low";
  return "Unavailable";
}

/** Clamp and sanitize a confidence score into a safe AlertConfidence. */
export function resolveAlertConfidence(
  score: number | null | undefined
): AlertConfidence {
  if (score == null || !Number.isFinite(score)) {
    return { ...ALERT_CONFIDENCE_EMPTY };
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  const level = classifyConfidenceScore(clamped);
  return {
    score: clamped,
    level,
    available: level !== "Unavailable",
    label: level === "Unavailable" ? "Unavailable" : `${clamped}% (${level})`,
  };
}

export function averageConfidenceScores(
  scores: readonly number[]
): AlertConfidence {
  const finite = scores.filter((s) => Number.isFinite(s));
  if (finite.length === 0) return { ...ALERT_CONFIDENCE_EMPTY };
  const avg = finite.reduce((a, b) => a + b, 0) / finite.length;
  return resolveAlertConfidence(avg);
}
