/**
 * Magic Formula Detector — Sprint 11B.3X.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isStrategyEligible } from "../StrategyUtils";
import {
  MAGIC_FORMULA_STRATEGY_ID,
  type MagicFormulaConfig,
} from "./MagicFormulaConstants";
import { analyzeEarningsYield } from "./MagicFormulaEarningsYieldAnalyzer";
import { analyzeFinancialStrength } from "./MagicFormulaFinancialAnalyzer";
import { computeMagicFormulaRanking } from "./MagicFormulaRankingEngine";
import { analyzeReturnOnCapital } from "./MagicFormulaROCAnalyzer";
import type {
  MagicFormulaDetection,
  MagicFormulaDetectionContext,
  MagicFormulaValidationResult,
} from "./MagicFormulaTypes";
import {
  calculateMagicFormulaQualityScore,
  createEmptyMagicFormulaDetection,
  dedupeStrings,
  resolveMagicFormulaConfig,
  resolveRecommendation,
} from "./MagicFormulaUtils";

export function validateMagicFormulaContext(
  context: MagicFormulaDetectionContext | null | undefined,
  config: MagicFormulaConfig
): MagicFormulaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!context) {
    return {
      valid: false,
      errors: ["Magic Formula detection context is missing."],
      warnings: [],
    };
  }
  const data = context.input?.magicFormula;
  if (!data) {
    return {
      valid: false,
      errors: ["Missing Magic Formula market data payload."],
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
    MAGIC_FORMULA_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    errors.push("Eligible Strategy gate failed for Magic Formula.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function detectMagicFormula(
  context: MagicFormulaDetectionContext
): MagicFormulaDetection {
  const config = resolveMagicFormulaConfig(context.config);
  const validation = validateMagicFormulaContext(context, config);
  if (!validation.valid) {
    return createEmptyMagicFormulaDetection(
      [...validation.errors, ...validation.warnings],
      validation.errors
    );
  }

  const data = context.input.magicFormula;

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyMagicFormulaDetection(
      ["Risk Off blocks Magic Formula investing."],
      ["Risk Off — Magic Formula strategy blocked."]
    );
  }
  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyMagicFormulaDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Magic Formula."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyMagicFormulaDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Magic Formula."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyMagicFormulaDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyMagicFormulaDetection(
      ["Volatility too high for Magic Formula compounding."],
      ["High volatility — Magic Formula screen deferred."]
    );
  }

  const earningsYield = analyzeEarningsYield(data.current, config);
  const roc = analyzeReturnOnCapital(data.current, config);
  const ranking = computeMagicFormulaRanking({
    symbol: context.input.symbol,
    current: data.current,
    earningsYield: earningsYield.earningsYield,
    returnOnCapital: roc.returnOnCapital,
    peers: data.peers,
    config,
  });
  const financial = analyzeFinancialStrength(
    data.financialHistory,
    data.current,
    config
  );

  const governanceScore = data.current.governanceRedFlags
    ? 20
    : data.current.accountingConcerns
      ? 35
      : clamp(data.current.corporateGovernanceScore, 0, 100);

  const qualityScore = calculateMagicFormulaQualityScore({
    rankScore: ranking.score,
    rocScore: roc.score,
    earningsYieldScore: earningsYield.score,
    financialScore: financial.score,
    cashFlowQuality: financial.cashFlowQuality,
    governanceScore,
    config,
  });

  const decision = resolveRecommendation({
    earningsYield,
    roc,
    ranking,
    financial,
    institutionalHolding: data.current.institutionalHolding,
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
    earningsYield,
    roc,
    ranking,
    financial,
    qualityScore,
    confidence,
    reasons: dedupeStrings([
      ...decision.reasons,
      ...earningsYield.reasons,
      ...roc.reasons,
      ...ranking.reasons,
    ]),
    warnings: dedupeStrings([
      ...decision.warnings,
      ...earningsYield.warnings,
      ...roc.warnings,
      ...ranking.warnings,
      ...financial.warnings,
    ]),
  };
}

export class MagicFormulaDetector {
  private readonly config: MagicFormulaConfig;
  private lastDetection: MagicFormulaDetection | null = null;

  constructor(config?: Partial<MagicFormulaConfig>) {
    this.config = resolveMagicFormulaConfig(config);
  }

  detect(
    context: MagicFormulaDetectionContext | null | undefined
  ): MagicFormulaDetection {
    try {
      if (!context) {
        const empty = createEmptyMagicFormulaDetection(
          ["Magic Formula detection context is missing."],
          []
        );
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectMagicFormula({
        ...context,
        config: this.config,
      });
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Magic Formula detection failed.";
      const empty = createEmptyMagicFormulaDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): MagicFormulaDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): MagicFormulaConfig {
    return resolveMagicFormulaConfig(this.config);
  }
}

let detectorSingleton: MagicFormulaDetector | null = null;

export function getMagicFormulaDetector(
  config?: Partial<MagicFormulaConfig>
): MagicFormulaDetector {
  if (!detectorSingleton) detectorSingleton = new MagicFormulaDetector(config);
  return detectorSingleton;
}

export function resetMagicFormulaDetector(): void {
  detectorSingleton = null;
}
