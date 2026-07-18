/**
 * Darvas Box Explainability — Sprint 11B.3N.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  DarvasBoxDetection,
  DarvasBoxStrategyInput,
} from "./DarvasBoxTypes";
import type { DarvasBoxTradeSetup } from "./DarvasBoxTradeTypes";
import type {
  DarvasBoxFactorScores,
  DarvasBoxInstitutionalScore,
} from "./DarvasBoxScoring";
import {
  DEFAULT_DARVAS_BOX_SCORING_CONFIG,
  scoreDarvasBoxConvictionFactors,
  type DarvasBoxScoringConfig,
} from "./DarvasBoxScoring";

export type DarvasBoxExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface DarvasBoxExplanationFactor {
  title: string;
  description: string;
  impact: DarvasBoxExplanationImpact;
  contribution: number;
}

export interface DarvasBoxExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: DarvasBoxExplanationFactor[];
}

export const DEFAULT_DARVAS_BOX_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type DarvasBoxExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveDarvasBoxExplainabilityConfig(
  partial?: Partial<DarvasBoxExplainabilityConfig>
): DarvasBoxExplainabilityConfig {
  return {
    ...DEFAULT_DARVAS_BOX_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: DarvasBoxExplainabilityConfig
): DarvasBoxExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildDarvasBoxExplanationFactors(input: {
  detection: DarvasBoxDetection;
  setup: DarvasBoxTradeSetup;
  marketContext: InstitutionalMarketContext;
  dbInput: DarvasBoxStrategyInput;
  factors?: DarvasBoxFactorScores;
  scoringConfig?: DarvasBoxScoringConfig;
  explainConfig?: DarvasBoxExplainabilityConfig;
}): DarvasBoxExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_DARVAS_BOX_SCORING_CONFIG;
  const explain = resolveDarvasBoxExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreDarvasBoxConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      dbInput: input.dbInput,
      config: scoring,
    });
  const d = input.detection;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Breakout occurred with strong institutional volume."
        : "Breakout strength insufficient.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Breakout occurred with strong institutional volume."
        : "Volume confirmation weak.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Pattern Integrity",
      description: d.detected
        ? "Price has formed a valid Darvas Box."
        : "Darvas Box pattern invalid.",
      score: scores.patternIntegrity,
      weight: w.patternIntegrity,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative Strength confirms leadership."
        : "Relative Strength insufficient.",
      score: scores.relativeStrength,
      weight: w.relativeStrength,
    },
    {
      title: "Institutional Participation",
      description:
        d.resistanceTouches >= 2
          ? "Multiple resistance tests confirmed."
          : "Resistance tests insufficient.",
      score: scores.institutionalParticipation,
      weight: w.institutionalParticipation,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Sector and market regime support continuation."
        : "Weak breadth — participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP on breakout."
          : "VWAP alignment weak.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "Risk/Reward",
      description:
        input.setup.riskReward >= scoring.minimumRiskReward
          ? "Risk/Reward exceeds institutional threshold."
          : "Risk/Reward below institutional threshold.",
      score: scores.riskReward,
      weight: w.riskReward,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity acceptable for Darvas Box."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
  ];

  return catalog.map((item) => {
    const contribution = signedContribution(item.score, item.weight);
    return {
      title: item.title,
      description: item.description,
      impact: impactFromContribution(contribution, explain),
      contribution,
    };
  });
}

export function buildDarvasBoxExplainability(input: {
  detection: DarvasBoxDetection;
  setup: DarvasBoxTradeSetup;
  marketContext: InstitutionalMarketContext;
  dbInput: DarvasBoxStrategyInput;
  institutionalScore?: DarvasBoxInstitutionalScore;
  scoringConfig?: DarvasBoxScoringConfig;
  explainConfig?: Partial<DarvasBoxExplainabilityConfig>;
}): DarvasBoxExplainability {
  try {
    const explain = resolveDarvasBoxExplainabilityConfig(input.explainConfig);
    const factors = buildDarvasBoxExplanationFactors({
      ...input,
      explainConfig: explain,
      scoringConfig: input.scoringConfig,
    });

    const positiveReasons: string[] = [];
    const negativeReasons: string[] = [];
    const neutralFactors: string[] = [];

    for (const factor of factors) {
      if (factor.impact === "Positive") positiveReasons.push(factor.description);
      else if (factor.impact === "Negative")
        negativeReasons.push(factor.description);
      else neutralFactors.push(factor.description);
    }

    const warnings = dedupe([
      ...input.setup.warnings,
      ...input.detection.warnings,
      ...input.marketContext.warnings,
    ]);

    return {
      positiveReasons: dedupe(positiveReasons),
      negativeReasons: dedupe(negativeReasons),
      neutralFactors: dedupe(neutralFactors),
      warnings,
      summary: buildDarvasBoxSummary({
        detection: input.detection,
        setup: input.setup,
        positiveReasons,
        negativeReasons,
        institutionalScore: input.institutionalScore,
        maxPoints: explain.summaryMaxPoints,
      }),
      factors: factors.sort(
        (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
      ),
    };
  } catch {
    return {
      positiveReasons: [],
      negativeReasons: ["Explainability engine degraded."],
      neutralFactors: [],
      warnings: ["Explainability failed — conviction reduced via warning."],
      summary: ["Darvas Box explainability unavailable."],
      factors: [],
    };
  }
}

export function buildDarvasBoxSummary(input: {
  detection: DarvasBoxDetection;
  setup: DarvasBoxTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: DarvasBoxInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_DARVAS_BOX_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    points.push("Price has formed a valid Darvas Box.");
  } else {
    points.push("Darvas Box setup not confirmed.");
  }
  if (d.resistanceTouches >= 2) {
    points.push("Multiple resistance tests confirmed.");
  }
  if (d.breakoutConfirmed && d.volumeConfirmed) {
    points.push("Breakout occurred with strong institutional volume.");
  }
  if (d.rsConfirmed) {
    points.push("Relative Strength confirms leadership.");
  }
  if (d.sectorConfirmed && d.marketConfirmed) {
    points.push("Sector and market regime support continuation.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_DARVAS_BOX_SCORING_CONFIG.highMin
  ) {
    points.push(
      `Institutional conviction ${input.institutionalScore.grade} (${input.institutionalScore.signalGrade}).`
    );
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyDarvasBoxExplainability(
  warnings: string[] = []
): DarvasBoxExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Darvas Box explainability not available."],
    factors: [],
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
