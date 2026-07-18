/**
 * Buffett Detector — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isStrategyEligible } from "../StrategyUtils";
import { analyzeBusinessQuality } from "./BuffettBusinessAnalyzer";
import {
  BUFFETT_STRATEGY_ID,
  type BuffettConfig,
} from "./BuffettConstants";
import { analyzeFinancialStrength } from "./BuffettFinancialAnalyzer";
import { analyzeManagementQuality } from "./BuffettManagementAnalyzer";
import { analyzeEconomicMoat } from "./BuffettMoatAnalyzer";
import type {
  BuffettDetection,
  BuffettDetectionContext,
  BuffettValidationResult,
} from "./BuffettTypes";
import {
  calculateBuffettQualityScore,
  createEmptyBuffettDetection,
  dedupeStrings,
  resolveBuffettConfig,
  resolveRecommendation,
} from "./BuffettUtils";
import { analyzeValuation } from "./BuffettValuationAnalyzer";

export function validateBuffettContext(
  context: BuffettDetectionContext | null | undefined,
  config: BuffettConfig
): BuffettValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!context) {
    return {
      valid: false,
      errors: ["Buffett detection context is missing."],
      warnings: [],
    };
  }
  const data = context.input?.buffett;
  if (!data) {
    return {
      valid: false,
      errors: ["Missing Buffett market data payload."],
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
    BUFFETT_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    errors.push("Eligible Strategy gate failed for Buffett.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function detectBuffett(
  context: BuffettDetectionContext
): BuffettDetection {
  const config = resolveBuffettConfig(context.config);
  const validation = validateBuffettContext(context, config);
  if (!validation.valid) {
    return createEmptyBuffettDetection(
      [...validation.errors, ...validation.warnings],
      validation.errors
    );
  }

  const data = context.input.buffett;

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyBuffettDetection(
      ["Risk Off blocks Buffett investing."],
      ["Risk Off — Buffett strategy blocked."]
    );
  }
  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyBuffettDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Buffett."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyBuffettDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Buffett."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyBuffettDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyBuffettDetection(
      ["Volatility too high for long-term compounding."],
      ["High volatility — Buffett screen deferred."]
    );
  }

  const business = analyzeBusinessQuality(
    data.financialHistory,
    data.current,
    config
  );
  const moat = analyzeEconomicMoat(data.moat, config);
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
  const valuation = analyzeValuation(
    data.current,
    data.financialHistory,
    config
  );

  const qualityScore = calculateBuffettQualityScore({
    businessScore: business.score,
    moatScore: moat.score,
    financialScore: financial.score,
    managementScore: management.score,
    valuationScore: valuation.score,
    balanceSheetScore: financial.balanceSheetScore,
    config,
  });

  const decision = resolveRecommendation({
    moat,
    business,
    financial,
    management,
    valuation,
    institutionalHolding: data.current.institutionalHolding,
    promoterPledge: data.current.promoterPledge,
    config,
  });

  const confidence = Math.max(
    config.confidenceFloor,
    clamp(
      round(
        qualityScore * 0.7 +
          (decision.recommendation === "BUY"
            ? 27
            : decision.recommendation === "HOLD"
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
    business,
    moat,
    financial,
    management,
    valuation,
    qualityScore,
    confidence,
    reasons: dedupeStrings([
      ...decision.reasons,
      ...business.reasons,
      ...moat.reasons,
    ]),
    warnings: dedupeStrings([
      ...decision.warnings,
      ...business.warnings,
      ...moat.warnings,
      ...financial.warnings,
      ...management.warnings,
      ...valuation.warnings,
    ]),
  };
}

export class BuffettDetector {
  private readonly config: BuffettConfig;
  private lastDetection: BuffettDetection | null = null;

  constructor(config?: Partial<BuffettConfig>) {
    this.config = resolveBuffettConfig(config);
  }

  detect(
    context: BuffettDetectionContext | null | undefined
  ): BuffettDetection {
    try {
      if (!context) {
        const empty = createEmptyBuffettDetection(
          ["Buffett detection context is missing."],
          []
        );
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectBuffett({ ...context, config: this.config });
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Buffett detection failed.";
      const empty = createEmptyBuffettDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): BuffettDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): BuffettConfig {
    return resolveBuffettConfig(this.config);
  }
}

let detectorSingleton: BuffettDetector | null = null;

export function getBuffettDetector(
  config?: Partial<BuffettConfig>
): BuffettDetector {
  if (!detectorSingleton) detectorSingleton = new BuffettDetector(config);
  return detectorSingleton;
}

export function resetBuffettDetector(): void {
  detectorSingleton = null;
}
