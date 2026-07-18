/**
 * Sector Rotation Explainability — Sprint 11B.3J.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./SectorRotationUtils";
import type {
  SectorRotationDetection,
  SectorRotationStrategyInput,
} from "./SectorRotationTypes";
import type { SectorRotationTradeSetup } from "./SectorRotationTradeTypes";
import type {
  SectorRotationFactorScores,
  SectorRotationInstitutionalScore,
} from "./SectorRotationScoring";
import {
  DEFAULT_SECTOR_ROTATION_SCORING_CONFIG,
  scoreSectorRotationConvictionFactors,
  type SectorRotationScoringConfig,
} from "./SectorRotationScoring";

export type SectorRotationExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface SectorRotationExplanationFactor {
  title: string;
  description: string;
  impact: SectorRotationExplanationImpact;
  contribution: number;
}

export interface SectorRotationExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: SectorRotationExplanationFactor[];
}

export const DEFAULT_SECTOR_ROTATION_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type SectorRotationExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveSectorRotationExplainabilityConfig(
  partial?: Partial<SectorRotationExplainabilityConfig>
): SectorRotationExplainabilityConfig {
  return {
    ...DEFAULT_SECTOR_ROTATION_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: SectorRotationExplainabilityConfig
): SectorRotationExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildSectorRotationExplanationFactors(input: {
  detection: SectorRotationDetection;
  setup: SectorRotationTradeSetup;
  marketContext: InstitutionalMarketContext;
  srInput: SectorRotationStrategyInput;
  factors?: SectorRotationFactorScores;
  scoringConfig?: SectorRotationScoringConfig;
  explainConfig?: SectorRotationExplainabilityConfig;
}): SectorRotationExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_SECTOR_ROTATION_SCORING_CONFIG;
  const explain = resolveSectorRotationExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreSectorRotationConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      srInput: input.srInput,
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
      title: "Sector Leadership",
      description: d.sectorConfirmed
        ? "Sector has become the strongest performer."
        : "Weak Sector — leadership insufficient.",
      score: scores.sectorLeadership,
      weight: w.sectorLeadership,
    },
    {
      title: "Capital Rotation",
      description: d.sectorOutperformsBenchmark
        ? "Institutional capital rotating into this sector."
        : "Capital rotation not confirmed vs benchmark.",
      score: scores.capitalRotation,
      weight: w.capitalRotation,
    },
    {
      title: "Stock Leadership",
      description: d.stockOutperformsSector
        ? "Stock outperforming both benchmark and sector."
        : "Weak stock vs sector — leadership insufficient.",
      score: scores.stockLeadership,
      weight: w.stockLeadership,
    },
    {
      title: "Sector Breadth",
      description: d.breadthConfirmed
        ? "Sector breadth improving across constituents."
        : "Declining breadth — sector participation weak.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Volume confirms sector rotation participation."
        : "Low volume — weak confirmation of institutional participation.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for sector rotation."
          : "VWAP alignment weak for sector rotation.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "Trend Quality",
      description:
        d.detected && d.direction !== "NONE"
          ? "Momentum supported by healthy market regime."
          : "Weak Trend — structure not clearly directional.",
      score: scores.trendQuality,
      weight: w.trendQuality,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Momentum supported by healthy market regime."
        : "Market regime not supportive.",
      score: d.marketConfirmed ? clampMarket(d.confidence) : 25,
      weight: 0.05,
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
          ? "Liquidity acceptable for sector rotation."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
  ];

  if (d.sectorConfirmed) {
    catalog.push({
      title: "Sector Strength",
      description: `Sector ${d.sectorName || "leadership"} supports rotation (avg ${round(averageSectorScore(input.marketContext), 0)}).`,
      score: scores.sectorLeadership,
      weight: 0.05,
    });
  }

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

function clampMarket(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function buildSectorRotationExplainability(input: {
  detection: SectorRotationDetection;
  setup: SectorRotationTradeSetup;
  marketContext: InstitutionalMarketContext;
  srInput: SectorRotationStrategyInput;
  institutionalScore?: SectorRotationInstitutionalScore;
  scoringConfig?: SectorRotationScoringConfig;
  explainConfig?: Partial<SectorRotationExplainabilityConfig>;
}): SectorRotationExplainability {
  try {
    const explain = resolveSectorRotationExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildSectorRotationExplanationFactors({
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
      summary: buildSectorRotationSummary({
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
      summary: ["Sector Rotation explainability unavailable."],
      factors: [],
    };
  }
}

export function buildSectorRotationSummary(input: {
  detection: SectorRotationDetection;
  setup: SectorRotationTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: SectorRotationInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_SECTOR_ROTATION_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.sectorConfirmed) {
    points.push("Sector has become the strongest performer.");
  } else {
    points.push("Sector Rotation setup not confirmed.");
  }

  if (d.sectorOutperformsBenchmark) {
    points.push("Institutional capital rotating into this sector.");
  }
  if (d.stockOutperformsSector) {
    points.push("Stock outperforming both benchmark and sector.");
  }
  if (d.breadthConfirmed) {
    points.push("Sector breadth improving across constituents.");
  }
  if (d.marketConfirmed) {
    points.push("Momentum supported by healthy market regime.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_SECTOR_ROTATION_SCORING_CONFIG.highMin
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

export function createEmptySectorRotationExplainability(
  warnings: string[] = []
): SectorRotationExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Sector Rotation explainability not available."],
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
