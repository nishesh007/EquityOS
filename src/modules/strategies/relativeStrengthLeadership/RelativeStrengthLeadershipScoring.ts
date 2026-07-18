/**
 * Relative Strength Leadership Institutional Scoring — Sprint 11B.3O.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipStrategyInput,
} from "./RelativeStrengthLeadershipTypes";
import type { RelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipTradeTypes";
import { averageSectorScore } from "./RelativeStrengthLeadershipUtils";

export type RelativeStrengthLeadershipConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type RelativeStrengthLeadershipSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface RelativeStrengthLeadershipInstitutionalScore {
  conviction: number;
  grade: RelativeStrengthLeadershipConvictionGrade;
  signalGrade: RelativeStrengthLeadershipSignalGrade;
  confidence: number;
}

export interface RelativeStrengthLeadershipConvictionWeights {
  readonly rsMomentum: number;
  readonly institutionalLeadership: number;
  readonly trendConfirmation: number;
  readonly relativeVolume: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface RelativeStrengthLeadershipScoringConfig {
  readonly weights: RelativeStrengthLeadershipConvictionWeights;
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

export const DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONVICTION_WEIGHTS: RelativeStrengthLeadershipConvictionWeights =
  {
    rsMomentum: 0.2,
    institutionalLeadership: 0.2,
    trendConfirmation: 0.15,
    relativeVolume: 0.1,
    breadth: 0.1,
    sectorStrength: 0.1,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG: RelativeStrengthLeadershipScoringConfig =
  {
    weights: DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONVICTION_WEIGHTS,
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

export function resolveRelativeStrengthLeadershipScoringConfig(
  partial?: Partial<RelativeStrengthLeadershipScoringConfig> & {
    weights?: Partial<RelativeStrengthLeadershipConvictionWeights>;
    signalGrade?: Partial<
      RelativeStrengthLeadershipScoringConfig["signalGrade"]
    >;
    signalBlend?: Partial<
      RelativeStrengthLeadershipScoringConfig["signalBlend"]
    >;
  }
): RelativeStrengthLeadershipScoringConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyRelativeStrengthLeadershipConvictionGrade(
  conviction: number,
  config: RelativeStrengthLeadershipScoringConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG
): RelativeStrengthLeadershipConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyRelativeStrengthLeadershipSignalGrade(
  composite: number,
  config: RelativeStrengthLeadershipScoringConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG
): RelativeStrengthLeadershipSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface RelativeStrengthLeadershipFactorScores {
  rsMomentum: number;
  institutionalLeadership: number;
  trendConfirmation: number;
  relativeVolume: number;
  breadth: number;
  sectorStrength: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreRelativeStrengthLeadershipConvictionFactors(input: {
  detection: RelativeStrengthLeadershipDetection;
  setup: Pick<
    RelativeStrengthLeadershipTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthLeadershipStrategyInput;
  config?: RelativeStrengthLeadershipScoringConfig;
}): RelativeStrengthLeadershipFactorScores {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.rsInput.relativeStrengthLeadership;

  const rsMomentum = d.rsIncreasing
    ? clamp(50 + d.rsMomentum * 8 + d.momentumPersistence * 0.25, 0, 100)
    : 25;

  const institutionalLeadership = d.detected
    ? clamp(
        d.leadershipPercentile * 0.55 +
          d.relativeStrengthScore * 0.35 +
          (d.outperformingBenchmark && d.outperformingSector ? 10 : 0),
        0,
        100
      )
    : 25;

  const trendConfirmation = d.detected
    ? clamp(d.trendQuality, 40, 100)
    : 25;

  const relativeVolume = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 50, 100)
    : 25;

  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);

  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    vwapAlignment = input.setup.entry >= d.vwap ? 85 : 35;
  }

  const riskReward =
    input.setup.entry > 0
      ? clamp(
          (input.setup.riskReward / Math.max(config.minimumRiskReward, 0.1)) *
            70,
          0,
          100
        )
      : 15;

  const liquidity =
    payload.relativeVolume === null ||
    !Number.isFinite(payload.relativeVolume) ||
    (payload.relativeVolume ?? 0) >= 1
      ? 80
      : 35;

  return {
    rsMomentum,
    institutionalLeadership,
    trendConfirmation,
    relativeVolume,
    breadth,
    sectorStrength,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(
  weights: RelativeStrengthLeadershipConvictionWeights
): number {
  return (
    weights.rsMomentum +
    weights.institutionalLeadership +
    weights.trendConfirmation +
    weights.relativeVolume +
    weights.breadth +
    weights.sectorStrength +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateRelativeStrengthLeadershipConviction(
  factors: RelativeStrengthLeadershipFactorScores,
  config: RelativeStrengthLeadershipScoringConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.rsMomentum * w.rsMomentum +
      factors.institutionalLeadership * w.institutionalLeadership +
      factors.trendConfirmation * w.trendConfirmation +
      factors.relativeVolume * w.relativeVolume +
      factors.breadth * w.breadth +
      factors.sectorStrength * w.sectorStrength +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateRelativeStrengthLeadershipSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: RelativeStrengthLeadershipScoringConfig;
}): RelativeStrengthLeadershipSignalGrade {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG;
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
  return classifyRelativeStrengthLeadershipSignalGrade(composite, config);
}

export function buildRelativeStrengthLeadershipInstitutionalScore(input: {
  detection: RelativeStrengthLeadershipDetection;
  setup: Pick<
    RelativeStrengthLeadershipTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthLeadershipStrategyInput;
  config?: RelativeStrengthLeadershipScoringConfig;
}): RelativeStrengthLeadershipInstitutionalScore {
  try {
    const config = resolveRelativeStrengthLeadershipScoringConfig(input.config);
    const factors = scoreRelativeStrengthLeadershipConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateRelativeStrengthLeadershipConviction(
      factors,
      config
    );
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyRelativeStrengthLeadershipConvictionGrade(
        conviction,
        config
      ),
      signalGrade: calculateRelativeStrengthLeadershipSignalGrade({
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
