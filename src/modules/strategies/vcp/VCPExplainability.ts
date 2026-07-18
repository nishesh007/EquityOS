/**
 * VCP Explainability — Sprint 11B.3L.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { VCPDetection, VCPStrategyInput } from "./VCPTypes";
import type { VCPTradeSetup } from "./VCPTradeTypes";
import type { VCPFactorScores, VCPInstitutionalScore } from "./VCPScoring";
import {
  DEFAULT_VCP_SCORING_CONFIG,
  scoreVCPConvictionFactors,
  type VCPScoringConfig,
} from "./VCPScoring";

export type VCPExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface VCPExplanationFactor {
  title: string;
  description: string;
  impact: VCPExplanationImpact;
  contribution: number;
}

export interface VCPExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: VCPExplanationFactor[];
}

export const DEFAULT_VCP_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type VCPExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveVCPExplainabilityConfig(
  partial?: Partial<VCPExplainabilityConfig>
): VCPExplainabilityConfig {
  return {
    ...DEFAULT_VCP_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: VCPExplainabilityConfig
): VCPExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildVCPExplanationFactors(input: {
  detection: VCPDetection;
  setup: VCPTradeSetup;
  marketContext: InstitutionalMarketContext;
  vcpInput: VCPStrategyInput;
  factors?: VCPFactorScores;
  scoringConfig?: VCPScoringConfig;
  explainConfig?: VCPExplainabilityConfig;
}): VCPExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_VCP_SCORING_CONFIG;
  const explain = resolveVCPExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreVCPConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      vcpInput: input.vcpInput,
      config: scoring,
    });
  const d = input.detection;
  const countLabel =
    d.contractionCount === 2
      ? "Two"
      : d.contractionCount === 3
        ? "Three"
        : d.contractionCount === 4
          ? "Four"
          : d.contractionCount === 5
            ? "Five"
            : `${d.contractionCount}`;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Pattern Integrity",
      description: d.detected
        ? `${countLabel} successful volatility contractions detected.`
        : "VCP pattern integrity insufficient.",
      score: scores.patternIntegrity,
      weight: w.patternIntegrity,
    },
    {
      title: "Supply Dry-Up",
      description: d.volumeDryUp
        ? "Volume dried up near pivot."
        : "Supply dry-up not confirmed near pivot.",
      score: scores.supplyDryUp,
      weight: w.supplyDryUp,
    },
    {
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Breakout confirmed with institutional participation."
        : "Breakout strength insufficient.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Volume Confirmation",
      description:
        scores.volumeConfirmation >= 60
          ? "Breakout volume confirms demand expansion."
          : "Weak breakout volume.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Sector Leadership",
      description: d.sectorConfirmed
        ? "Sector leadership supports continuation."
        : "Weak sector — leadership missing.",
      score: scores.sectorLeadership,
      weight: w.sectorLeadership,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Breadth confirmation supports VCP breakout."
        : "Weak breadth — participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Market regime supportive for VCP continuation."
        : "Market regime incompatible with VCP.",
      score: scores.marketRegime,
      weight: w.marketRegime,
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
      title: "Data Quality",
      description:
        scores.dataQuality >= 60
          ? "Pattern meets Minervini VCP criteria."
          : "Data quality incomplete for institutional VCP.",
      score: scores.dataQuality,
      weight: w.dataQuality,
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

export function buildVCPExplainability(input: {
  detection: VCPDetection;
  setup: VCPTradeSetup;
  marketContext: InstitutionalMarketContext;
  vcpInput: VCPStrategyInput;
  institutionalScore?: VCPInstitutionalScore;
  scoringConfig?: VCPScoringConfig;
  explainConfig?: Partial<VCPExplainabilityConfig>;
}): VCPExplainability {
  try {
    const explain = resolveVCPExplainabilityConfig(input.explainConfig);
    const factors = buildVCPExplanationFactors({
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
      summary: buildVCPSummary({
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
      summary: ["VCP explainability unavailable."],
      factors: [],
    };
  }
}

export function buildVCPSummary(input: {
  detection: VCPDetection;
  setup: VCPTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: VCPInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_VCP_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.contractionCount >= 2) {
    const label =
      d.contractionCount === 3
        ? "Three"
        : d.contractionCount === 2
          ? "Two"
          : d.contractionCount === 5
            ? "Five"
            : `${d.contractionCount}`;
    points.push(`${label} successful volatility contractions detected.`);
  } else {
    points.push("VCP setup not confirmed.");
  }

  if (d.volumeDryUp) points.push("Volume dried up near pivot.");
  if (d.breakoutConfirmed) {
    points.push("Breakout confirmed with institutional participation.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership supports continuation.");
  }
  if (d.detected) {
    points.push("Pattern meets Minervini VCP criteria.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >= DEFAULT_VCP_SCORING_CONFIG.highMin
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

export function createEmptyVCPExplainability(
  warnings: string[] = []
): VCPExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["VCP explainability not available."],
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
