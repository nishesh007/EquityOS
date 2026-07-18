/**
 * Quality Compounder Management Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderCurrentSnapshot,
  QualityCompounderManagementAnalysis,
  QualityCompounderManagementInputs,
} from "./QualityCompounderTypes";

export function analyzeManagementQuality(
  management: QualityCompounderManagementInputs,
  current: QualityCompounderCurrentSnapshot,
  config: QualityCompounderConfig
): QualityCompounderManagementAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const fields = [
    management.integrity,
    management.capitalAllocation,
    management.governance,
    management.promoterQuality,
    management.accountingQuality,
    management.shareholderAlignment,
    management.communication,
    management.executionTrackRecord,
  ].map((v) => clamp(v, 0, 100));

  let score = clamp(
    round(fields.reduce((s, v) => s + v, 0) / fields.length, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  const governanceRedFlags =
    current.governanceRedFlags ||
    current.accountingConcerns ||
    current.promoterPledge > config.maxPromoterPledge ||
    current.corporateGovernanceScore < config.minGovernanceScore;

  if (governanceRedFlags) score = Math.min(score, 45);

  if (score >= config.minManagementBuy) {
    reasons.push(
      "Management has an outstanding capital allocation track record."
    );
  }
  if (governanceRedFlags) warnings.push("Weak Governance.");
  if (management.accountingQuality < 50) {
    warnings.push("Accounting Concerns.");
  }

  return {
    score,
    governanceRedFlags,
    accountingQuality: clamp(management.accountingQuality, 0, 100),
    reasons,
    warnings,
  };
}
