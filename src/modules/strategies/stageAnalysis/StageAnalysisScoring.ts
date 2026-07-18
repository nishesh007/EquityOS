/**
 * Stage Analysis Institutional Scoring — Sprint 11B.3M.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  StageAnalysisDetection,
  StageAnalysisStrategyInput,
} from "./StageAnalysisTypes";
import type { StageAnalysisTradeSetup } from "./StageAnalysisTradeTypes";

export type StageAnalysisConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type StageAnalysisSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface StageAnalysisInstitutionalScore {
  conviction: number;
  grade: StageAnalysisConvictionGrade;
  signalGrade: StageAnalysisSignalGrade;
  confidence: number;
}

export interface StageAnalysisConvictionWeights {
  readonly stageTransition: number;
  readonly trendConfirmation: number;
  readonly institutionalActivity: number;
  readonly relativeStrength: number;
  readonly volume: number;
  readonly breadth: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface StageAnalysisScoringConfig {
  readonly weights: StageAnalysisConvictionWeights;
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

export const DEFAULT_STAGE_ANALYSIS_CONVICTION_WEIGHTS: StageAnalysisConvictionWeights =
  {
    stageTransition: 0.2,
    trendConfirmation: 0.2,
    institutionalActivity: 0.15,
    relativeStrength: 0.1,
    volume: 0.1,
    breadth: 0.1,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG: StageAnalysisScoringConfig =
  {
    weights: DEFAULT_STAGE_ANALYSIS_CONVICTION_WEIGHTS,
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

export function resolveStageAnalysisScoringConfig(
  partial?: Partial<StageAnalysisScoringConfig> & {
    weights?: Partial<StageAnalysisConvictionWeights>;
    signalGrade?: Partial<StageAnalysisScoringConfig["signalGrade"]>;
    signalBlend?: Partial<StageAnalysisScoringConfig["signalBlend"]>;
  }
): StageAnalysisScoringConfig {
  return {
    ...DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyStageAnalysisConvictionGrade(
  conviction: number,
  config: StageAnalysisScoringConfig = DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG
): StageAnalysisConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyStageAnalysisSignalGrade(
  composite: number,
  config: StageAnalysisScoringConfig = DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG
): StageAnalysisSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface StageAnalysisFactorScores {
  stageTransition: number;
  trendConfirmation: number;
  institutionalActivity: number;
  relativeStrength: number;
  volume: number;
  breadth: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreStageAnalysisConvictionFactors(input: {
  detection: StageAnalysisDetection;
  setup: Pick<
    StageAnalysisTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  saInput: StageAnalysisStrategyInput;
  config?: StageAnalysisScoringConfig;
}): StageAnalysisFactorScores {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.saInput.stageAnalysis;

  const stageTransition =
    d.transition !== "none"
      ? clamp(d.transitionConfidence, 40, 100)
      : d.detected
        ? 55
        : 25;

  const trendConfirmation = clamp(d.trendStructure, 0, 100);

  const institutionalActivity = d.institutionalAccumulation
    ? 88
    : d.distribution
      ? 70
      : 35;

  const relativeStrength = clamp(d.relativeStrengthScore, 0, 100);

  const volume = d.volumeConfirmed ? clamp(d.volumeQuality, 40, 100) : 30;

  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwapAlignment = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap)
      vwapAlignment = 85;
    else vwapAlignment = 35;
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
    payload.relativeVolume >= 1
      ? 80
      : 35;

  return {
    stageTransition,
    trendConfirmation,
    institutionalActivity,
    relativeStrength,
    volume,
    breadth,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: StageAnalysisConvictionWeights): number {
  return (
    weights.stageTransition +
    weights.trendConfirmation +
    weights.institutionalActivity +
    weights.relativeStrength +
    weights.volume +
    weights.breadth +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateStageAnalysisConviction(
  factors: StageAnalysisFactorScores,
  config: StageAnalysisScoringConfig = DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.stageTransition * w.stageTransition +
      factors.trendConfirmation * w.trendConfirmation +
      factors.institutionalActivity * w.institutionalActivity +
      factors.relativeStrength * w.relativeStrength +
      factors.volume * w.volume +
      factors.breadth * w.breadth +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateStageAnalysisSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: StageAnalysisScoringConfig;
}): StageAnalysisSignalGrade {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG;
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
  return classifyStageAnalysisSignalGrade(composite, config);
}

export function buildStageAnalysisInstitutionalScore(input: {
  detection: StageAnalysisDetection;
  setup: Pick<
    StageAnalysisTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  saInput: StageAnalysisStrategyInput;
  config?: StageAnalysisScoringConfig;
}): StageAnalysisInstitutionalScore {
  try {
    const config = resolveStageAnalysisScoringConfig(input.config);
    const factors = scoreStageAnalysisConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateStageAnalysisConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyStageAnalysisConvictionGrade(conviction, config),
      signalGrade: calculateStageAnalysisSignalGrade({
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
