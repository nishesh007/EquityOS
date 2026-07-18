/**
 * Buffett Management Quality Analyzer — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettConfig } from "./BuffettConstants";
import type {
  BuffettCurrentSnapshot,
  BuffettManagementAnalysis,
  BuffettManagementInputs,
} from "./BuffettTypes";

export function analyzeManagementQuality(
  management: BuffettManagementInputs,
  current: BuffettCurrentSnapshot,
  config: BuffettConfig
): BuffettManagementAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const capitalAllocation = clamp(management.capitalAllocation, 0, 100);
  const corporateGovernance = clamp(management.corporateGovernance, 0, 100);
  const promoterIntegrity = clamp(management.promoterIntegrity, 0, 100);
  const shareholderFriendliness = clamp(
    management.shareholderFriendliness,
    0,
    100
  );
  const dividendPolicy = clamp(management.dividendPolicy, 0, 100);
  const buybackQuality = clamp(management.buybackQuality, 0, 100);
  const accountingQuality = clamp(management.accountingQuality, 0, 100);
  const relatedPartyRisk = clamp(management.relatedPartyRisk, 0, 100);

  const pledgeOk = current.promoterPledge <= config.maxPromoterPledge;
  const promoterOk = current.promoterHolding >= config.minPromoterHolding;
  const governanceRedFlags =
    current.governanceRedFlags === true ||
    current.accountingConcerns === true ||
    !pledgeOk ||
    accountingQuality < 50 ||
    relatedPartyRisk > 60 ||
    corporateGovernance < config.minGovernanceScore;

  let score = clamp(
    round(
      capitalAllocation * 0.18 +
        corporateGovernance * 0.18 +
        promoterIntegrity * 0.12 +
        shareholderFriendliness * 0.12 +
        dividendPolicy * 0.1 +
        buybackQuality * 0.08 +
        accountingQuality * 0.14 +
        (100 - relatedPartyRisk) * 0.08,
      1
    ),
    0,
    100
  );

  if (!pledgeOk) score = Math.min(score, 40);
  if (!promoterOk) score = Math.min(score, score);
  if (governanceRedFlags) score = Math.min(score, 45);

  if (capitalAllocation >= 70 && accountingQuality >= 70) {
    reasons.push(
      "Management has demonstrated disciplined capital allocation."
    );
  }
  if (governanceRedFlags) {
    warnings.push("Poor governance.");
  }
  if (!pledgeOk) {
    warnings.push("Promoter pledge above threshold.");
  }
  if (accountingQuality < 50 || current.accountingConcerns) {
    warnings.push("Accounting concerns.");
  }

  return {
    score,
    capitalAllocation,
    corporateGovernance,
    promoterIntegrity,
    shareholderFriendliness,
    dividendPolicy,
    buybackQuality,
    accountingQuality,
    relatedPartyRisk,
    governanceRedFlags,
    reasons,
    warnings,
  };
}
