/**
 * Graham Detector — Sprint 11B.3V.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isStrategyEligible } from "../StrategyUtils";
import { analyzeBalanceSheet } from "./GrahamBalanceSheetAnalyzer";
import {
  GRAHAM_STRATEGY_ID,
  type GrahamConfig,
} from "./GrahamConstants";
import { analyzeFinancialStrength } from "./GrahamFinancialAnalyzer";
import { analyzeIntrinsicValue } from "./GrahamIntrinsicValueAnalyzer";
import { analyzeMarginOfSafety } from "./GrahamMarginSafetyAnalyzer";
import type {
  GrahamDetection,
  GrahamDetectionContext,
  GrahamValidationResult,
} from "./GrahamTypes";
import {
  calculateGrahamQualityScore,
  createEmptyGrahamDetection,
  dedupeStrings,
  resolveGrahamConfig,
  resolveRecommendation,
} from "./GrahamUtils";

export function validateGrahamContext(
  context: GrahamDetectionContext | null | undefined,
  config: GrahamConfig
): GrahamValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!context) {
    return {
      valid: false,
      errors: ["Graham detection context is missing."],
      warnings: [],
    };
  }
  const data = context.input?.graham;
  if (!data) {
    return {
      valid: false,
      errors: ["Missing Graham market data payload."],
      warnings: [],
    };
  }
  if (
    (data.financialHistory ?? []).length < config.minimumYearsOfFinancials
  ) {
    errors.push("Insufficient financial history.");
  }
  if (!(data.current?.currentPrice > 0)) {
    errors.push("Current price missing.");
  }
  if (!context.marketContext) {
    errors.push("Valid Context missing — market context absent.");
  }
  if (!context.regime?.regime) {
    errors.push("Compatible Regime missing.");
  }
  if (!context.confidence || !Number.isFinite(context.confidence.score)) {
    errors.push("Regime confidence missing.");
  }
  const eligible = isStrategyEligible(
    GRAHAM_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    errors.push("Eligible Strategy gate failed for Graham.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function detectGraham(
  context: GrahamDetectionContext
): GrahamDetection {
  const config = resolveGrahamConfig(context.config);
  const validation = validateGrahamContext(context, config);
  if (!validation.valid) {
    return createEmptyGrahamDetection(
      [...validation.errors, ...validation.warnings],
      validation.errors
    );
  }

  const data = context.input.graham;

  if (
    config.blockedRiskModes.length > 0 &&
    config.blockedRiskModes.includes(context.marketContext.riskMode)
  ) {
    return createEmptyGrahamDetection(
      ["Risk mode blocks Graham investing."],
      ["Risk mode — Graham strategy blocked."]
    );
  }
  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyGrahamDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Graham."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyGrahamDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Graham."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyGrahamDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyGrahamDetection(
      ["Volatility too high for deep-value compounding."],
      ["High volatility — Graham screen deferred."]
    );
  }

  const financial = analyzeFinancialStrength(
    data.financialHistory,
    data.current,
    config
  );
  const balanceSheet = analyzeBalanceSheet(data.current, config);
  const intrinsic = analyzeIntrinsicValue(
    data.current,
    data.financialHistory,
    config
  );
  const marginSafety = analyzeMarginOfSafety(
    data.current,
    intrinsic,
    config
  );

  const governanceScore = data.current.governanceRedFlags
    ? 20
    : data.current.accountingConcerns
      ? 35
      : clamp(data.current.corporateGovernanceScore, 0, 100);

  const qualityScore = calculateGrahamQualityScore({
    financialScore: financial.score,
    marginOfSafetyScore: marginSafety.score,
    balanceSheetScore: balanceSheet.score,
    valuationScore: marginSafety.score,
    cashFlowQuality: financial.cashFlowQuality,
    governanceScore,
    config,
  });

  const decision = resolveRecommendation({
    financial,
    balanceSheet,
    marginSafety,
    governanceRedFlags: data.current.governanceRedFlags,
    accountingConcerns: data.current.accountingConcerns,
    config,
  });

  const confidence = Math.max(
    config.confidenceFloor,
    clamp(
      round(
        qualityScore * 0.7 +
          (decision.recommendation === "BUY"
            ? 27
            : decision.recommendation === "WATCH"
              ? 19.5
              : 9),
        1
      ),
      0,
      100
    )
  );

  return {
    detected: true,
    recommendation: decision.recommendation,
    financial,
    balanceSheet,
    intrinsic,
    marginSafety,
    qualityScore,
    confidence,
    reasons: dedupeStrings([
      ...decision.reasons,
      ...financial.reasons,
      ...balanceSheet.reasons,
      ...marginSafety.reasons,
    ]),
    warnings: dedupeStrings([
      ...decision.warnings,
      ...financial.warnings,
      ...balanceSheet.warnings,
      ...intrinsic.warnings,
      ...marginSafety.warnings,
    ]),
  };
}

export class GrahamDetector {
  private readonly config: GrahamConfig;
  private lastDetection: GrahamDetection | null = null;

  constructor(config?: Partial<GrahamConfig>) {
    this.config = resolveGrahamConfig(config);
  }

  detect(
    context: GrahamDetectionContext | null | undefined
  ): GrahamDetection {
    try {
      if (!context) {
        const empty = createEmptyGrahamDetection(
          ["Graham detection context is missing."],
          []
        );
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectGraham({ ...context, config: this.config });
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Graham detection failed.";
      const empty = createEmptyGrahamDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): GrahamDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): GrahamConfig {
    return resolveGrahamConfig(this.config);
  }
}

let detectorSingleton: GrahamDetector | null = null;

export function getGrahamDetector(
  config?: Partial<GrahamConfig>
): GrahamDetector {
  if (!detectorSingleton) detectorSingleton = new GrahamDetector(config);
  return detectorSingleton;
}

export function resetGrahamDetector(): void {
  detectorSingleton = null;
}
