/**
 * Institutional Trust Score classification bands.
 */

import {
  DEFAULT_TRUST_CONFIGURATION,
  type TrustClassificationThresholds,
} from "./TrustConfiguration";

export type TrustClassificationLabel =
  | "INSTITUTIONAL_ELITE"
  | "EXCEPTIONAL"
  | "VERY_HIGH_TRUST"
  | "HIGH_TRUST"
  | "TRUSTED"
  | "REVIEW_REQUIRED"
  | "REJECT";

export function classifyTrust(
  score: number,
  thresholds: TrustClassificationThresholds = DEFAULT_TRUST_CONFIGURATION.classificationThresholds
): TrustClassificationLabel {
  if (!Number.isFinite(score)) return "REJECT";
  if (score >= thresholds.institutionalElite) return "INSTITUTIONAL_ELITE";
  if (score >= thresholds.exceptional) return "EXCEPTIONAL";
  if (score >= thresholds.veryHighTrust) return "VERY_HIGH_TRUST";
  if (score >= thresholds.highTrust) return "HIGH_TRUST";
  if (score >= thresholds.trusted) return "TRUSTED";
  if (score >= thresholds.reviewRequired) return "REVIEW_REQUIRED";
  return "REJECT";
}

export function isTrustRejected(
  score: number,
  rejectThreshold: number = DEFAULT_TRUST_CONFIGURATION.rejectThreshold
): boolean {
  return !Number.isFinite(score) || score < rejectThreshold;
}
