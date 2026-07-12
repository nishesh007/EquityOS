/**
 * Decision confidence engine — data quality and model confidence scoring.
 */

import { clamp, round } from "@/lib/engine/utils";
import { calculateValuationConfidence } from "@/lib/valuation";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { RetrievedChunk } from "@/lib/rag/retriever";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";
import type { DecisionScoreBundle } from "@/lib/ai/decision/scoringEngine";
import type { EquityIntelligence } from "@/types";

export interface DecisionConfidence {
  score: number;
  label: "High" | "Medium" | "Low";
  drivers: string[];
}

export function buildDecisionConfidence(input: {
  context: CompanyContext;
  valuation: InstitutionalValuation;
  scores: DecisionScoreBundle;
  intelligence: EquityIntelligence | null;
  ragChunks: RetrievedChunk[];
}): DecisionConfidence {
  const { context, valuation, scores, intelligence, ragChunks } = input;
  const fi = context.financialIntelligence;

  const valuationConfidence = calculateValuationConfidence({
    businessScore: scores.moatScore,
    financialScore: scores.financialStrengthScore,
    technicalScore: scores.technicalScore,
    valuationConfidence: valuation.analysis.confidence,
    riskScore: 100 - scores.riskScore,
    profile: {
      sector: context.profile.sector,
      industry: context.profile.industry,
      changePercent: context.profile.changePercent,
    },
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.fairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.analysis.expectedCagr,
      models: valuation.analysis.models,
      blendedConfidence: valuation.analysis.confidence,
      overallVerdict: valuation.analysis.overallVerdict,
      available: valuation.analysis.available,
    },
  });

  let score = valuationConfidence.overall;

  if (fi) score = round((score + fi.scores.financialHealthScore) / 2);
  if (intelligence?.researchConfidence) {
    score = round((score + intelligence.researchConfidence.overall) / 2);
  }

  score = round(
    clamp(
      score * 0.7 +
        scores.ragCoverageScore * 0.15 +
        (context.financialIntelligence ? 12 : 0) +
        (ragChunks.length > 0 ? 8 : 0)
    )
  );

  const label: DecisionConfidence["label"] =
    score >= 72 ? "High" : score >= 52 ? "Medium" : "Low";

  const drivers = [
    `Valuation model confidence ${valuation.analysis.confidence}%`,
    fi
      ? `Financial intelligence health ${fi.scores.financialHealthScore}/100`
      : "Financial intelligence partially available",
    ragChunks.length > 0
      ? `${ragChunks.length} indexed filing chunks retrieved`
      : "No indexed filing chunks matched",
    intelligence
      ? `Equity intelligence research confidence ${intelligence.researchConfidence.overall}%`
      : "Equity intelligence layer unavailable",
  ];

  return { score, label, drivers };
}
