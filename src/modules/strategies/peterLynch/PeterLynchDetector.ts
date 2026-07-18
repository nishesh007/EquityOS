/**
 * Peter Lynch Detector — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isStrategyEligible } from "../StrategyUtils";
import { analyzeBusinessQuality } from "./PeterLynchBusinessAnalyzer";
import {
  PETER_LYNCH_STRATEGY_ID,
  type PeterLynchConfig,
} from "./PeterLynchConstants";
import { analyzeFinancialStrength } from "./PeterLynchFinancialAnalyzer";
import { analyzeGrowth } from "./PeterLynchGrowthAnalyzer";
import { analyzePeg } from "./PeterLynchPEGAnalyzer";
import type {
  PeterLynchDetection,
  PeterLynchDetectionContext,
  PeterLynchValidationResult,
} from "./PeterLynchTypes";
import {
  calculatePeterLynchQualityScore,
  createEmptyPeterLynchDetection,
  dedupeStrings,
  resolvePeterLynchConfig,
  resolveRecommendation,
} from "./PeterLynchUtils";
import { analyzeValuation } from "./PeterLynchValuationAnalyzer";

export function validatePeterLynchContext(
  context: PeterLynchDetectionContext | null | undefined,
  config: PeterLynchConfig
): PeterLynchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!context) {
    return {
      valid: false,
      errors: ["Peter Lynch detection context is missing."],
      warnings: [],
    };
  }
  const data = context.input?.peterLynch;
  if (!data) {
    return {
      valid: false,
      errors: ["Missing Peter Lynch market data payload."],
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
    PETER_LYNCH_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    errors.push("Eligible Strategy gate failed for Peter Lynch.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function detectPeterLynch(
  context: PeterLynchDetectionContext
): PeterLynchDetection {
  const config = resolvePeterLynchConfig(context.config);
  const validation = validatePeterLynchContext(context, config);
  if (!validation.valid) {
    return createEmptyPeterLynchDetection(
      [...validation.errors, ...validation.warnings],
      validation.errors
    );
  }

  const data = context.input.peterLynch;

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyPeterLynchDetection(
      ["Risk Off blocks Peter Lynch investing."],
      ["Risk Off — Peter Lynch strategy blocked."]
    );
  }
  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyPeterLynchDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Peter Lynch."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyPeterLynchDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Peter Lynch."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyPeterLynchDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyPeterLynchDetection(
      ["Volatility too high for GARP compounding."],
      ["High volatility — Peter Lynch screen deferred."]
    );
  }

  const growth = analyzeGrowth(
    data.financialHistory,
    data.current,
    data.business,
    config
  );
  const peg = analyzePeg(data.current, growth, config);
  const business = analyzeBusinessQuality(data.business, config);
  const financial = analyzeFinancialStrength(
    data.financialHistory,
    data.current,
    config
  );
  const valuation = analyzeValuation(data.current, growth, peg, config);

  const governanceScore = data.current.governanceRedFlags
    ? 20
    : data.current.accountingConcerns
      ? 35
      : clamp(data.current.corporateGovernanceScore, 0, 100);

  const qualityScore = calculatePeterLynchQualityScore({
    growthScore: growth.score,
    businessScore: business.score,
    financialScore: financial.score,
    pegScore: peg.score,
    valuationScore: valuation.score,
    governanceScore,
    config,
  });

  const decision = resolveRecommendation({
    growth,
    peg,
    business,
    financial,
    valuation,
    institutionalHolding: data.current.institutionalHolding,
    promoterPledge: data.current.promoterPledge,
    governanceRedFlags: data.current.governanceRedFlags,
    accountingConcerns: data.current.accountingConcerns,
    governanceScore,
    config,
  });

  const confidenceBonus =
    decision.recommendation === "BUY"
      ? config.buyConfidenceBonus
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
    growth,
    peg,
    business,
    financial,
    valuation,
    qualityScore,
    confidence,
    reasons: dedupeStrings([
      ...decision.reasons,
      ...growth.reasons,
      ...peg.reasons,
      ...business.reasons,
    ]),
    warnings: dedupeStrings([
      ...decision.warnings,
      ...growth.warnings,
      ...peg.warnings,
      ...business.warnings,
      ...financial.warnings,
      ...valuation.warnings,
    ]),
  };
}

export class PeterLynchDetector {
  private readonly config: PeterLynchConfig;
  private lastDetection: PeterLynchDetection | null = null;

  constructor(config?: Partial<PeterLynchConfig>) {
    this.config = resolvePeterLynchConfig(config);
  }

  detect(
    context: PeterLynchDetectionContext | null | undefined
  ): PeterLynchDetection {
    try {
      if (!context) {
        const empty = createEmptyPeterLynchDetection(
          ["Peter Lynch detection context is missing."],
          []
        );
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectPeterLynch({ ...context, config: this.config });
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Peter Lynch detection failed.";
      const empty = createEmptyPeterLynchDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): PeterLynchDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): PeterLynchConfig {
    return resolvePeterLynchConfig(this.config);
  }
}

let detectorSingleton: PeterLynchDetector | null = null;

export function getPeterLynchDetector(
  config?: Partial<PeterLynchConfig>
): PeterLynchDetector {
  if (!detectorSingleton) detectorSingleton = new PeterLynchDetector(config);
  return detectorSingleton;
}

export function resetPeterLynchDetector(): void {
  detectorSingleton = null;
}
