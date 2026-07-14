/**
 * Point-in-time Trust Score snapshot for history and audit trails.
 */

import type { TrustClassificationLabel } from "./TrustClassification";
import type { TrustTrendSnapshot } from "./TrustTrendAnalyzer";

export interface TrustSnapshot {
  snapshotId: string;
  objectId: string;
  objectType?: string;
  timestamp: string;
  trustScore: number;
  trustClassification: TrustClassificationLabel;
  trustConfidence: number;
  moduleScores: Record<string, number>;
  weightDistribution: Record<string, number>;
  validationSummary?: string;
  warnings: string[];
  failedRules: string[];
  trend?: TrustTrendSnapshot;
  engineVersion: string;
}

export function createTrustSnapshotId(
  objectId: string,
  timestamp: string = new Date().toISOString()
): string {
  return `trust:${objectId}:${timestamp}`;
}
