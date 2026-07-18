/**
 * Quality Compounder Detector — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isStrategyEligible } from "../StrategyUtils";
import { analyzeBusinessQuality } from "./QualityCompounderBusinessAnalyzer";
import { analyzeCapitalAllocation } from "./QualityCompounderCapitalAllocationAnalyzer";
import {
  QUALITY_COMPOUNDER_STRATEGY_ID,
  type QualityCompounderConfig,
} from "./QualityCompounderConstants";
import { analyzeFinancialStrength } from "./QualityCompounderFinancialAnalyzer";
import { analyzeGrowthSustainability } from "./QualityCompounderGrowthAnalyzer";
import { analyzeManagementQuality } from "./QualityCompounderManagementAnalyzer";
import { analyzeEconomicMoat } from "./QualityCompounderMoatAnalyzer";
import type {
  QualityCompounderDetection,
  QualityCompounderDetectionContext,
  QualityCompounderValidationResult,
} from "./QualityCompounderTypes";
import {
  calculateQualityCompounderQualityScore,
  createEmptyQualityCompounderDetection,
  dedupeStrings,
  resolveQualityCompounderConfig,
  resolveRecommendation,
} from "./QualityCompounderUtils";
import { analyzeValuation } from "./QualityCompounderValuationAnalyzer";

export function validateQualityCompounderContext(
  context: QualityCompounderDetectionContext | null | undefined,
  config: QualityCompounderConfig
): QualityCompounderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!context) {
    return {
      valid: false,
      errors: ["Quality Compounder detection context is missing."],
      warnings: [],
    };
  }
  const data = context.input?.qualityCompounder;
  if (!data) {
    return {
      valid: false,
      errors: ["Missing Quality Compounder market data payload."],
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
    QUALITY_COMPOUNDER_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    errors.push("Eligible Strategy gate failed for Quality Compounder.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function detectQualityCompounder(
  context: QualityCompounderDetectionContext
): QualityCompounderDetection {
  const config = resolveQualityCompounderConfig(context.config);
  const validation = validateQualityCompounderContext(context, config);
  if (!validation.valid) {
    return createEmptyQualityCompounderDetection(
      [...validation.errors, ...validation.warnings],
      validation.errors
    );
  }

  const data = context.input.qualityCompounder;

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyQualityCompounderDetection(
      ["Risk Off blocks Quality Compounder investing."],
      ["Risk Off — Quality Compounder strategy blocked."]
    );
  }
  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyQualityCompounderDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Quality Compounder."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyQualityCompounderDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Quality Compounder."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyQualityCompounderDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyQualityCompounderDetection(
      ["Volatility too high for multi-decade compounding."],
      ["High volatility — Quality Compounder screen deferred."]
    );
  }

  const business = analyzeBusinessQuality(data.business, config);
  const moat = analyzeEconomicMoat(data.moat, config);
  const growth = analyzeGrowthSustainability(
    data.financialHistory,
    data.current,
    config
  );
  const capital = analyzeCapitalAllocation(data.capital, data.current, config);
  const financial = analyzeFinancialStrength(
    data.financialHistory,
    data.current,
    config
  );
  const management = analyzeManagementQuality(
    data.management,
    data.current,
    config
  );
  const valuation = analyzeValuation(data.current, growth, config);

  const governanceScore = management.governanceRedFlags
    ? 20
    : clamp(data.current.corporateGovernanceScore, 0, 100);

  const qualityScore = calculateQualityCompounderQualityScore({
    businessScore: business.score,
    moatScore: moat.score,
    financialScore: financial.score,
    capitalScore: capital.score,
    growthScore: growth.score,
    managementScore: management.score,
    valuationScore: valuation.score,
    governanceScore,
    config,
  });

  const decision = resolveRecommendation({
    business,
    moat,
    growth,
    capital,
    financial,
    management,
    valuation,
    institutionalHolding: data.current.institutionalHolding,
    promoterPledge: data.current.promoterPledge,
    governanceScore,
    businessDisruption: data.current.businessDisruption,
    config,
  });

  const confidenceBonus =
    decision.recommendation === "BUY"
      ? config.buyConfidenceBonus
      : decision.recommendation === "HOLD"
        ? config.holdConfidenceBonus
        : decision.recommendation === "WATCH"
          ? config.watchConfidenceBonus
          : config.avoidConfidenceBonus;

  const confidence = Math.max(
    config.confidenceFloor,
    clamp(round(qualityScore * 0.7 + confidenceBonus, 1), 0, 100)
  );

  return {
    detected: true,
    recommendation: decision.recommendation,
    business,
    moat,
    growth,
    capital,
    financial,
    management,
    valuation,
    qualityScore,
    confidence,
    reasons: dedupeStrings([
      ...decision.reasons,
      ...business.reasons,
      ...moat.reasons,
      ...growth.reasons,
    ]),
    warnings: dedupeStrings([
      ...decision.warnings,
      ...business.warnings,
      ...moat.warnings,
      ...growth.warnings,
      ...capital.warnings,
      ...financial.warnings,
      ...management.warnings,
      ...valuation.warnings,
    ]),
  };
}

export class QualityCompounderDetector {
  private readonly config: QualityCompounderConfig;
  private lastDetection: QualityCompounderDetection | null = null;

  constructor(config?: Partial<QualityCompounderConfig>) {
    this.config = resolveQualityCompounderConfig(config);
  }

  detect(
    context: QualityCompounderDetectionContext | null | undefined
  ): QualityCompounderDetection {
    try {
      if (!context) {
        const empty = createEmptyQualityCompounderDetection(
          ["Quality Compounder detection context is missing."],
          []
        );
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectQualityCompounder({
        ...context,
        config: this.config,
      });
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Quality Compounder detection failed.";
      const empty = createEmptyQualityCompounderDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): QualityCompounderDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): QualityCompounderConfig {
    return resolveQualityCompounderConfig(this.config);
  }
}

let detectorSingleton: QualityCompounderDetector | null = null;

export function getQualityCompounderDetector(
  config?: Partial<QualityCompounderConfig>
): QualityCompounderDetector {
  if (!detectorSingleton) {
    detectorSingleton = new QualityCompounderDetector(config);
  }
  return detectorSingleton;
}

export function resetQualityCompounderDetector(): void {
  detectorSingleton = null;
}
