/**
 * Institutional moat engine — competitive advantage assessment across 8 dimensions.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { CompanyProfile, EquityIntelligence } from "@/types";

export type MoatDimension =
  | "brand"
  | "costAdvantage"
  | "switchingCost"
  | "networkEffect"
  | "scale"
  | "distribution"
  | "patents"
  | "marketShare";

export interface MoatDimensionScore {
  dimension: MoatDimension;
  label: string;
  score: number;
  maxScore: number;
  assessment: string;
}

export interface InstitutionalMoatAssessment {
  dimensions: MoatDimensionScore[];
  overallMoatScore: number;
  moatVerdict: "Wide" | "Narrow" | "None";
  summary: string;
}

const MOAT_LABELS: Record<MoatDimension, string> = {
  brand: "Brand",
  costAdvantage: "Cost Advantage",
  switchingCost: "Switching Cost",
  networkEffect: "Network Effect",
  scale: "Scale",
  distribution: "Distribution",
  patents: "Patents / IP",
  marketShare: "Market Share",
};

function sectorMoatBias(sector: string, industry: string): Partial<Record<MoatDimension, number>> {
  const s = sector.toLowerCase();
  const i = industry.toLowerCase();
  const bias: Partial<Record<MoatDimension, number>> = {};

  if (s.includes("fmcg") || i.includes("consumer")) {
    bias.brand = 2;
    bias.distribution = 2;
    bias.scale = 1;
  }
  if (s.includes("it") || i.includes("software")) {
    bias.switchingCost = 2;
    bias.networkEffect = 1;
  }
  if (s.includes("bank")) {
    bias.switchingCost = 2;
    bias.scale = 2;
  }
  if (i.includes("pharma")) {
    bias.patents = 3;
    bias.brand = 1;
  }
  if (s.includes("auto")) {
    bias.brand = 1;
    bias.scale = 2;
    bias.distribution = 1;
  }
  if (i.includes("platform") || i.includes("exchange")) {
    bias.networkEffect = 3;
    bias.switchingCost = 2;
  }

  return bias;
}

function scoreBrand(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const npm = profile.fundamentals?.netMargin ?? profile.financials.roe / 5;
  const score = clamp(4 + bias + (npm >= 15 ? 3 : npm >= 10 ? 2 : npm >= 5 ? 1 : 0), 0, 10);
  return {
    dimension: "brand",
    label: MOAT_LABELS.brand,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "Premium brand positioning supported by above-average margins."
        : score >= 5
          ? "Recognised brand with moderate pricing power."
          : "Limited brand differentiation in a competitive category.",
  };
}

function scoreCostAdvantage(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const roce = profile.financials.roce;
  const opm = profile.fundamentals?.operatingMargin ?? null;
  const score = clamp(
    3 + bias + (roce >= 22 ? 3 : roce >= 18 ? 2 : roce >= 14 ? 1 : 0) + (opm && opm >= 18 ? 1 : 0),
    0,
    10
  );
  return {
    dimension: "costAdvantage",
    label: MOAT_LABELS.costAdvantage,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? `Superior cost structure with ROCE at ${roce}% vs industry norms.`
        : score >= 5
          ? "Competitive cost position but not a clear industry leader."
          : "Cost position does not confer a durable advantage.",
  };
}

function scoreSwitchingCost(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const score = clamp(3 + bias + (profile.sector === "Banking" ? 2 : 0), 0, 10);
  return {
    dimension: "switchingCost",
    label: MOAT_LABELS.switchingCost,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "High customer stickiness reduces churn and pricing pressure."
        : score >= 5
          ? "Moderate switching friction for core customer segments."
          : "Low switching costs; customers can move to competitors easily.",
  };
}

function scoreNetworkEffect(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const score = clamp(2 + bias, 0, 10);
  return {
    dimension: "networkEffect",
    label: MOAT_LABELS.networkEffect,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "Network effects reinforce user adoption and engagement."
        : score >= 4
          ? "Some platform or ecosystem benefits, but not dominant."
          : "Business model does not exhibit strong network effects.",
  };
}

function scoreScale(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const marketCapCr = Number.parseFloat(profile.marketCap.replace(/[^\d.]/g, "")) || 0;
  const isLarge = profile.marketCap.includes("L Cr") || marketCapCr > 100_000;
  const score = clamp(
    3 +
      bias +
      (isLarge ? 3 : marketCapCr > 20_000 || profile.marketCap.includes("000") ? 2 : 1),
    0,
    10
  );
  return {
    dimension: "scale",
    label: MOAT_LABELS.scale,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? `Scale advantages at ${profile.marketCap} market cap support procurement and overhead leverage.`
        : score >= 5
          ? "Meaningful scale within sub-sector but not a national champion."
          : "Sub-scale relative to larger peers; limited operating leverage.",
  };
}

function scoreDistribution(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const revenueGrowth = profile.financials.revenueGrowth;
  const score = clamp(
    3 + bias + (revenueGrowth >= 12 ? 2 : revenueGrowth >= 6 ? 1 : 0),
    0,
    10
  );
  return {
    dimension: "distribution",
    label: MOAT_LABELS.distribution,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "Wide distribution reach supports volume leadership and shelf dominance."
        : score >= 5
          ? "Adequate distribution footprint with room to deepen penetration."
          : "Distribution reach is not a distinguishing advantage.",
  };
}

function scorePatents(profile: CompanyProfile, bias: number): MoatDimensionScore {
  const industry = profile.industry.toLowerCase();
  const score = clamp(
    2 +
      bias +
      (industry.includes("pharma") || industry.includes("tech") ? 2 : 0),
    0,
    10
  );
  return {
    dimension: "patents",
    label: MOAT_LABELS.patents,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "IP portfolio and proprietary technology create entry barriers."
        : score >= 4
          ? "Some proprietary processes; IP not the primary moat driver."
          : "Limited patent or IP protection in the business model.",
  };
}

function scoreMarketShare(profile: CompanyProfile): MoatDimensionScore {
  const subject = profile.peers.length > 0;
  const peRank =
    subject && profile.peers.every((peer) => profile.financials.pe <= peer.pe)
      ? 2
      : 1;
  const revenueGrowth = profile.financials.revenueGrowth;
  const score = clamp(3 + peRank + (revenueGrowth >= 15 ? 2 : revenueGrowth >= 8 ? 1 : 0), 0, 10);

  return {
    dimension: "marketShare",
    label: MOAT_LABELS.marketShare,
    score,
    maxScore: 10,
    assessment:
      score >= 7
        ? "Market share trajectory and peer positioning indicate leadership."
        : score >= 5
          ? "Stable share in a fragmented competitive landscape."
          : "Losing or marginal share position versus listed peers.",
  };
}

export function buildInstitutionalMoatAssessment(
  context: CompanyContext,
  profile: CompanyProfile,
  intelligence: EquityIntelligence | null
): InstitutionalMoatAssessment {
  const bias = sectorMoatBias(profile.sector, profile.industry);

  const dimensions: MoatDimensionScore[] = [
    scoreBrand(profile, bias.brand ?? 0),
    scoreCostAdvantage(profile, bias.costAdvantage ?? 0),
    scoreSwitchingCost(profile, bias.switchingCost ?? 0),
    scoreNetworkEffect(profile, bias.networkEffect ?? 0),
    scoreScale(profile, bias.scale ?? 0),
    scoreDistribution(profile, bias.distribution ?? 0),
    scorePatents(profile, bias.patents ?? 0),
    scoreMarketShare(profile),
  ];

  const overallMoatScore = round(
    dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length,
    1
  );

  const moatVerdict: InstitutionalMoatAssessment["moatVerdict"] =
    overallMoatScore >= 7 ? "Wide" : overallMoatScore >= 4.5 ? "Narrow" : "None";

  const thesisMoat = intelligence?.thesis.moat;
  const summary = thesisMoat
    ? `${thesisMoat} Overall moat score: ${overallMoatScore}/10 (${moatVerdict}).`
    : `Overall moat score: ${overallMoatScore}/10 (${moatVerdict}) based on eight competitive dimensions.`;

  return {
    dimensions,
    overallMoatScore,
    moatVerdict,
    summary,
  };
}

export function formatMoatSection(assessment: InstitutionalMoatAssessment): string {
  const table = [
    `| Dimension | Score | Assessment |`,
    `| --- | --- | --- |`,
    ...assessment.dimensions.map(
      (item) => `| ${item.label} | ${item.score.toFixed(1)} / ${item.maxScore} | ${item.assessment} |`
    ),
  ].join("\n");

  return `${assessment.summary}\n\n${table}`;
}
