/**
 * Earnings Momentum Institutional Scoring — Sprint 11B.3T.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  EarningsMomentumDetection,
  EarningsMomentumStrategyInput,
} from "./EarningsMomentumTypes";
import type { EarningsMomentumTradeSetup } from "./EarningsMomentumTradeTypes";

export type EarningsMomentumConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type EarningsMomentumSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface EarningsMomentumInstitutionalScore {
  conviction: number;
  grade: EarningsMomentumConvictionGrade;
  signalGrade: EarningsMomentumSignalGrade;
  confidence: number;
}

export interface EarningsMomentumConvictionWeights {
  readonly epsSurprise: number;
  readonly revenueSurprise: number;
  readonly guidance: number;
  readonly institutionalBuying: number;
  readonly priceAction: number;
  readonly volumeConfirmation: number;
  readonly relativeStrength: number;
  readonly breadth: number;
  readonly marketRegime: number;
  readonly riskReward: number;
}

export interface EarningsMomentumScoringConfig {
  readonly weights: EarningsMomentumConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
  readonly minimumRiskReward: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly signalGrade: {
    readonly aPlusMin: number;
    readonly aMin: number;
    readonly bPlusMin: number;
    readonly bMin: number;
    readonly cMin: number;
    readonly dMin: number;
  };
  readonly signalBlend: {
    readonly conviction: number;
    readonly quality: number;
    readonly risk: number;
    readonly market: number;
  };
}

export const DEFAULT_EARNINGS_MOMENTUM_CONVICTION_WEIGHTS: EarningsMomentumConvictionWeights =
  {
    epsSurprise: 0.2,
    revenueSurprise: 0.15,
    guidance: 0.15,
    institutionalBuying: 0.15,
    priceAction: 0.1,
    volumeConfirmation: 0.1,
    relativeStrength: 0.05,
    breadth: 0.05,
    marketRegime: 0.05,
    riskReward: 0.05,
  };

export const DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG: EarningsMomentumScoringConfig =
  {
    weights: DEFAULT_EARNINGS_MOMENTUM_CONVICTION_WEIGHTS,
    exceptionalMin: 95,
    highMin: 85,
    goodMin: 70,
    averageMin: 55,
    minimumRiskReward: 2.5,
    scoreFloor: 0,
    scoreCeiling: 100,
    signalGrade: {
      aPlusMin: 92,
      aMin: 85,
      bPlusMin: 78,
      bMin: 70,
      cMin: 60,
      dMin: 50,
    },
    signalBlend: {
      conviction: 0.4,
      quality: 0.3,
      risk: 0.15,
      market: 0.15,
    },
  };

export function resolveEarningsMomentumScoringConfig(
  partial?: Partial<EarningsMomentumScoringConfig> & {
    weights?: Partial<EarningsMomentumConvictionWeights>;
    signalGrade?: Partial<EarningsMomentumScoringConfig["signalGrade"]>;
    signalBlend?: Partial<EarningsMomentumScoringConfig["signalBlend"]>;
  }
): EarningsMomentumScoringConfig {
  return {
    ...DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyEarningsMomentumConvictionGrade(
  conviction: number,
  config: EarningsMomentumScoringConfig = DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG
): EarningsMomentumConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyEarningsMomentumSignalGrade(
  composite: number,
  config: EarningsMomentumScoringConfig = DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG
): EarningsMomentumSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface EarningsMomentumFactorScores {
  epsSurprise: number;
  revenueSurprise: number;
  guidance: number;
  institutionalBuying: number;
  priceAction: number;
  volumeConfirmation: number;
  relativeStrength: number;
  breadth: number;
  marketRegime: number;
  riskReward: number;
}

export function scoreEarningsMomentumConvictionFactors(input: {
  detection: EarningsMomentumDetection;
  setup: Pick<
    EarningsMomentumTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  emInput: EarningsMomentumStrategyInput;
  config?: EarningsMomentumScoringConfig;
}): EarningsMomentumFactorScores {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.emInput.earningsMomentum;
  const signed = d.direction === "SELL" ? -1 : 1;

  const epsSurprise = clamp(
    50 + signed * d.epsSurprise * 200,
    0,
    100
  );
  const revenueSurprise = clamp(
    50 + signed * d.revenueSurprise * 150,
    0,
    100
  );
  const guidance = clamp(d.guidanceQuality, 0, 100);
  const institutionalBuying = d.institutionalConfirmed ? 85 : 35;
  const priceAction = d.priceConfirmed
    ? clamp(d.priceConfirmation, 50, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 50, 100)
    : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(payload.relativeStrength ?? 55, 0, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 0, 100)
    : 25;
  const riskReward =
    input.setup.entry > 0
      ? clamp(
          (input.setup.riskReward / Math.max(config.minimumRiskReward, 0.1)) *
            70,
          0,
          100
        )
      : 15;

  return {
    epsSurprise,
    revenueSurprise,
    guidance,
    institutionalBuying,
    priceAction,
    volumeConfirmation,
    relativeStrength,
    breadth,
    marketRegime,
    riskReward,
  };
}

function weightSum(weights: EarningsMomentumConvictionWeights): number {
  return (
    weights.epsSurprise +
    weights.revenueSurprise +
    weights.guidance +
    weights.institutionalBuying +
    weights.priceAction +
    weights.volumeConfirmation +
    weights.relativeStrength +
    weights.breadth +
    weights.marketRegime +
    weights.riskReward
  );
}

export function calculateEarningsMomentumConviction(
  factors: EarningsMomentumFactorScores,
  config: EarningsMomentumScoringConfig = DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.epsSurprise * w.epsSurprise +
      factors.revenueSurprise * w.revenueSurprise +
      factors.guidance * w.guidance +
      factors.institutionalBuying * w.institutionalBuying +
      factors.priceAction * w.priceAction +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.relativeStrength * w.relativeStrength +
      factors.breadth * w.breadth +
      factors.marketRegime * w.marketRegime +
      factors.riskReward * w.riskReward) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateEarningsMomentumSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: EarningsMomentumScoringConfig;
}): EarningsMomentumSignalGrade {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG;
  const blend = config.signalBlend;
  const riskComponent = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 75,
    0,
    100
  );
  const composite = clamp(
    round(
      input.conviction * blend.conviction +
        input.qualityScore * blend.quality +
        riskComponent * blend.risk +
        clamp(input.marketStrength, 0, 100) * blend.market,
      1
    ),
    0,
    100
  );
  return classifyEarningsMomentumSignalGrade(composite, config);
}

export function buildEarningsMomentumInstitutionalScore(input: {
  detection: EarningsMomentumDetection;
  setup: Pick<
    EarningsMomentumTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  emInput: EarningsMomentumStrategyInput;
  config?: EarningsMomentumScoringConfig;
}): EarningsMomentumInstitutionalScore {
  try {
    const config = resolveEarningsMomentumScoringConfig(input.config);
    const factors = scoreEarningsMomentumConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateEarningsMomentumConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyEarningsMomentumConvictionGrade(conviction, config),
      signalGrade: calculateEarningsMomentumSignalGrade({
        conviction,
        qualityScore: input.setup.qualityScore,
        riskReward: input.setup.riskReward,
        marketStrength: input.marketContext.marketStrength,
        config,
      }),
      confidence: clamp(round(input.detection.confidence, 1), 0, 100),
    };
  } catch {
    return {
      conviction: 20,
      grade: "Weak",
      signalGrade: "F",
      confidence: clamp(input.detection.confidence || 0, 0, 100),
    };
  }
}
