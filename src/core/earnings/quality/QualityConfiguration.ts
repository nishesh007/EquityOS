/**
 * Institutional Earnings Quality Engine — configuration (Sprint 9B.3).
 * Advisory only: never mutates validation, trust, or recommendation logic.
 */

export type QualityStrictMode = "strict" | "relaxed";

export type QualityDimension =
  | "cashFlowQuality"
  | "accrualQuality"
  | "accountingQuality"
  | "workingCapital"
  | "capitalAllocation"
  | "margins"
  | "redFlags";

export interface QualityWeightMap {
  cashFlowQuality: number;
  accrualQuality: number;
  accountingQuality: number;
  workingCapital: number;
  capitalAllocation: number;
  margins: number;
  redFlags: number;
}

export interface QualityThresholds {
  /** Accruals / |NI| above this is a high-accrual signal. */
  highAccrualRatio: number;
  /** OCF / NI below this indicates weak cash conversion. */
  weakCashConversion: number;
  /** Receivable growth minus revenue growth above this is a red flag. */
  receivableGrowthGap: number;
  /** Inventory growth minus sales growth above this is a red flag. */
  inventoryGrowthGap: number;
  /** Margin decline (pp) treated as deterioration. */
  marginDeclinePp: number;
  /** ROCE decline (pp) treated as deterioration. */
  roceDeclinePp: number;
  /** Snapshot score drop treated as regression. */
  regressionScoreDrop: number;
}

export interface QualityConfiguration {
  mode: QualityStrictMode;
  engineVersion: string;
  advisoryOnly: boolean;
  institutionalMode: boolean;
  snapshotRetention: number;
  maxAuditEntries: number;
  weights: QualityWeightMap;
  thresholds: QualityThresholds;
  integrateEarningsDataEngine: boolean;
  integrateFinancialParser: boolean;
  integrateTrustEngine: boolean;
  integrateDataIntegrity: boolean;
  integrateValidationPlatform: boolean;
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeightMap = {
  cashFlowQuality: 0.25,
  accrualQuality: 0.2,
  accountingQuality: 0.15,
  workingCapital: 0.15,
  capitalAllocation: 0.1,
  margins: 0.1,
  redFlags: 0.05,
};

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  highAccrualRatio: 0.3,
  weakCashConversion: 0.7,
  receivableGrowthGap: 0.15,
  inventoryGrowthGap: 0.15,
  marginDeclinePp: 2,
  roceDeclinePp: 2,
  regressionScoreDrop: 10,
};

export const DEFAULT_QUALITY_CONFIGURATION: QualityConfiguration = {
  mode: "strict",
  engineVersion: "9B.3.0",
  advisoryOnly: true,
  institutionalMode: true,
  snapshotRetention: 100,
  maxAuditEntries: 500,
  weights: { ...DEFAULT_QUALITY_WEIGHTS },
  thresholds: { ...DEFAULT_QUALITY_THRESHOLDS },
  integrateEarningsDataEngine: true,
  integrateFinancialParser: true,
  integrateTrustEngine: true,
  integrateDataIntegrity: true,
  integrateValidationPlatform: true,
};

export type QualityConfigurationInput = Partial<
  Omit<QualityConfiguration, "weights" | "thresholds">
> & {
  weights?: Partial<QualityWeightMap>;
  thresholds?: Partial<QualityThresholds>;
};

export function resolveQualityConfiguration(
  input?: QualityConfigurationInput
): QualityConfiguration {
  const base = DEFAULT_QUALITY_CONFIGURATION;
  const weights = { ...base.weights, ...input?.weights };
  const weightSum =
    weights.cashFlowQuality +
    weights.accrualQuality +
    weights.accountingQuality +
    weights.workingCapital +
    weights.capitalAllocation +
    weights.margins +
    weights.redFlags;

  // Normalize weights to sum ~1 while preserving relative importance
  const norm =
    weightSum > 0
      ? {
          cashFlowQuality: weights.cashFlowQuality / weightSum,
          accrualQuality: weights.accrualQuality / weightSum,
          accountingQuality: weights.accountingQuality / weightSum,
          workingCapital: weights.workingCapital / weightSum,
          capitalAllocation: weights.capitalAllocation / weightSum,
          margins: weights.margins / weightSum,
          redFlags: weights.redFlags / weightSum,
        }
      : { ...DEFAULT_QUALITY_WEIGHTS };

  return {
    ...base,
    ...input,
    advisoryOnly: true, // hard guarantee
    weights: norm,
    thresholds: { ...base.thresholds, ...input?.thresholds },
  };
}
