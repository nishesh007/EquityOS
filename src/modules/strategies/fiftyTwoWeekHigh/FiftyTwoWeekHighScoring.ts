/**
 * 52-Week High Institutional Scoring — Sprint 11B.3S.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighStrategyInput,
} from "./FiftyTwoWeekHighTypes";
import type { FiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighTradeTypes";

export type FiftyTwoWeekHighConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type FiftyTwoWeekHighSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface FiftyTwoWeekHighInstitutionalScore {
  conviction: number;
  grade: FiftyTwoWeekHighConvictionGrade;
  signalGrade: FiftyTwoWeekHighSignalGrade;
  confidence: number;
}

export interface FiftyTwoWeekHighConvictionWeights {
  readonly institutionalParticipation: number;
  readonly breakoutStrength: number;
  readonly relativeStrength: number;
  readonly momentumPersistence: number;
  readonly volumeConfirmation: number;
  readonly sectorStrength: number;
  readonly breadth: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface FiftyTwoWeekHighScoringConfig {
  readonly weights: FiftyTwoWeekHighConvictionWeights;
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

export const DEFAULT_FIFTY_TWO_WEEK_HIGH_CONVICTION_WEIGHTS: FiftyTwoWeekHighConvictionWeights =
  {
    institutionalParticipation: 0.2,
    breakoutStrength: 0.2,
    relativeStrength: 0.15,
    momentumPersistence: 0.1,
    volumeConfirmation: 0.1,
    sectorStrength: 0.1,
    breadth: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG: FiftyTwoWeekHighScoringConfig =
  {
    weights: DEFAULT_FIFTY_TWO_WEEK_HIGH_CONVICTION_WEIGHTS,
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

export function resolveFiftyTwoWeekHighScoringConfig(
  partial?: Partial<FiftyTwoWeekHighScoringConfig> & {
    weights?: Partial<FiftyTwoWeekHighConvictionWeights>;
    signalGrade?: Partial<FiftyTwoWeekHighScoringConfig["signalGrade"]>;
    signalBlend?: Partial<FiftyTwoWeekHighScoringConfig["signalBlend"]>;
  }
): FiftyTwoWeekHighScoringConfig {
  return {
    ...DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyFiftyTwoWeekHighConvictionGrade(
  conviction: number,
  config: FiftyTwoWeekHighScoringConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG
): FiftyTwoWeekHighConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyFiftyTwoWeekHighSignalGrade(
  composite: number,
  config: FiftyTwoWeekHighScoringConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG
): FiftyTwoWeekHighSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface FiftyTwoWeekHighFactorScores {
  institutionalParticipation: number;
  breakoutStrength: number;
  relativeStrength: number;
  momentumPersistence: number;
  volumeConfirmation: number;
  sectorStrength: number;
  breadth: number;
  riskReward: number;
  liquidity: number;
}

export function scoreFiftyTwoWeekHighConvictionFactors(input: {
  detection: FiftyTwoWeekHighDetection;
  setup: Pick<
    FiftyTwoWeekHighTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  ftwInput: FiftyTwoWeekHighStrategyInput;
  config?: FiftyTwoWeekHighScoringConfig;
}): FiftyTwoWeekHighFactorScores {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.ftwInput.fiftyTwoWeekHigh;

  const institutionalParticipation = d.institutionalConfirmed
    ? 85
    : d.volumeConfirmed
      ? 70
      : 30;
  const breakoutStrength = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 50, 100)
    : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(payload.relativeStrength ?? 65, 40, 100)
    : 25;
  const momentumPersistence = d.detected
    ? clamp(d.momentumPersistence, 40, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 50, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(
        input.marketContext.sectorStrength.length > 0
          ? input.marketContext.sectorStrength.reduce(
              (s, x) => s + x.score,
              0
            ) / input.marketContext.sectorStrength.length
          : 60,
        0,
        100
      )
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);
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
    institutionalParticipation,
    breakoutStrength,
    relativeStrength,
    momentumPersistence,
    volumeConfirmation,
    sectorStrength,
    breadth,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: FiftyTwoWeekHighConvictionWeights): number {
  return (
    weights.institutionalParticipation +
    weights.breakoutStrength +
    weights.relativeStrength +
    weights.momentumPersistence +
    weights.volumeConfirmation +
    weights.sectorStrength +
    weights.breadth +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateFiftyTwoWeekHighConviction(
  factors: FiftyTwoWeekHighFactorScores,
  config: FiftyTwoWeekHighScoringConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.institutionalParticipation * w.institutionalParticipation +
      factors.breakoutStrength * w.breakoutStrength +
      factors.relativeStrength * w.relativeStrength +
      factors.momentumPersistence * w.momentumPersistence +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.sectorStrength * w.sectorStrength +
      factors.breadth * w.breadth +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateFiftyTwoWeekHighSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: FiftyTwoWeekHighScoringConfig;
}): FiftyTwoWeekHighSignalGrade {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG;
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
  return classifyFiftyTwoWeekHighSignalGrade(composite, config);
}

export function buildFiftyTwoWeekHighInstitutionalScore(input: {
  detection: FiftyTwoWeekHighDetection;
  setup: Pick<
    FiftyTwoWeekHighTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  ftwInput: FiftyTwoWeekHighStrategyInput;
  config?: FiftyTwoWeekHighScoringConfig;
}): FiftyTwoWeekHighInstitutionalScore {
  try {
    const config = resolveFiftyTwoWeekHighScoringConfig(input.config);
    const factors = scoreFiftyTwoWeekHighConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateFiftyTwoWeekHighConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyFiftyTwoWeekHighConvictionGrade(conviction, config),
      signalGrade: calculateFiftyTwoWeekHighSignalGrade({
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
