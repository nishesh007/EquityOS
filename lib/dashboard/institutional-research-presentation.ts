/**
 * Institutional AI Research & Recommendation Intelligence — presentation only (9F.R3).
 * Composes Sprint 9A/9D/9E opportunity + explainability fields. No engine recalculation.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type {
  ContributionRow,
  InstitutionalCandidateView,
  TimelineEvent,
} from "@/lib/opportunity-engine/institutional-presentation";
import { formatOptionalText, formatOptionalTimestamp } from "@/lib/dashboard/display-value";

const NA = "N/A";
const INSUFFICIENT = "Insufficient Evidence";
const AWAITING = "Awaiting Validation";

export interface ResearchTextBlock {
  title: string;
  body: string;
}

export interface ResearchDriverGroup {
  title: string;
  rows: ContributionRow[];
  emptyLabel: string;
}

export interface ResearchCaseView {
  probability: string;
  expectedMove: string;
  evidence: string[];
  catalystsOrRisks: string[];
}

export interface ResearchRiskPanelView {
  executionRisk: string;
  liquidityRisk: string;
  volatility: string;
  gapRisk: string;
  eventRisk: string;
  sectorRisk: string;
  overallRiskGrade: string;
  chips: string[];
}

export interface ResearchHistoricalSimilarityView {
  similarSetups: string[];
  averageOutcome: string;
  winRate: string;
  averageHoldingPeriod: string;
  averageReturn: string;
  empty: boolean;
  emptyMessage: string;
}

export interface ResearchScorecardView {
  aiConviction: string;
  validationScore: string;
  trustScore: string;
  qualityScore: string;
  riskScore: string;
  executionScore: string;
  overallGrade: string;
  radar: Array<{ label: string; value: number | null }>;
}

export interface ResearchConfidenceBreakdownView {
  confidence: string;
  supportingWeight: string;
  negativeWeight: string;
  netScore: string;
  drivers: ContributionRow[];
}

export interface InstitutionalResearchDrawerView {
  executiveSummary: string;
  investmentThesis: {
    businessSummary: string;
    currentOpportunity: string;
    expectedEdge: string;
    marketContext: string;
    primaryDrivers: string[];
    secondaryDrivers: string[];
    aiSummary: string;
  };
  whyThisStock: ResearchDriverGroup[];
  whyNotOthers: {
    rejectedCandidates: string[];
    reasons: string[];
    categories: Array<{ label: string; matched: boolean }>;
  };
  bullCase: ResearchCaseView;
  bearCase: ResearchCaseView;
  riskPanel: ResearchRiskPanelView;
  catalystTimeline: TimelineEvent[];
  recommendationTimeline: TimelineEvent[];
  confidenceTimeline: TimelineEvent[];
  historicalSimilarity: ResearchHistoricalSimilarityView;
  scorecard: ResearchScorecardView;
  confidenceBreakdown: ResearchConfidenceBreakdownView;
  sectorContribution: string;
  catalystChips: string[];
  badges: InstitutionalCandidateView["badges"];
}

function disp(
  value: number | null | undefined,
  options?: { suffix?: string; fallback?: string }
): string {
  if (value == null || !Number.isFinite(value)) {
    return options?.fallback ?? NA;
  }
  if (value === 0) return options?.fallback ?? NA;
  return `${Math.round(value)}${options?.suffix ?? ""}`;
}

function pct(value: number | null | undefined, fallback = NA): string {
  if (value == null || !Number.isFinite(value) || value === 0) return fallback;
  return `${Math.round(value)}%`;
}

function midEntry(candidate: OpportunityCandidate | null | undefined): number | null {
  if (!candidate) return null;
  const mid = (candidate.entryZone.low + candidate.entryZone.high) / 2;
  return Number.isFinite(mid) && mid > 0 ? mid : null;
}

function upsidePercent(candidate: OpportunityCandidate | null | undefined): number | null {
  const entry = midEntry(candidate);
  if (!candidate || entry == null) return null;
  const upside = ((candidate.target1 - entry) / entry) * 100;
  return Number.isFinite(upside) ? upside : null;
}

function downsidePercent(candidate: OpportunityCandidate | null | undefined): number | null {
  const entry = midEntry(candidate);
  if (!candidate || entry == null) return null;
  const down = ((candidate.stopLoss - entry) / entry) * 100;
  return Number.isFinite(down) ? down : null;
}

function sumPositive(rows: ContributionRow[]): number {
  return rows.filter((r) => r.contribution > 0).reduce((s, r) => s + r.contribution, 0);
}

function sumNegative(rows: ContributionRow[]): number {
  return rows.filter((r) => r.contribution < 0).reduce((s, r) => s + r.contribution, 0);
}

function riskGrade(rating: string | null | undefined): string {
  if (!rating) return AWAITING;
  if (rating === "Low") return "A — Low Risk";
  if (rating === "Medium") return "B — Moderate Risk";
  if (rating === "High") return "C — Elevated Risk";
  return NA;
}

function overallGrade(view: InstitutionalCandidateView): string {
  const scores = [
    view.overallScore,
    view.confidence,
    view.trustScore,
    view.validationScore,
    view.recommendationQuality,
  ].filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (scores.length === 0) return AWAITING;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 85) return "A — Institutional";
  if (avg >= 75) return "B — Strong";
  if (avg >= 65) return "C — Watch";
  return "D — Caution";
}

function driverGroup(
  title: string,
  rows: ContributionRow[],
  emptyLabel = INSUFFICIENT
): ResearchDriverGroup {
  return { title, rows, emptyLabel };
}

function filterDrivers(
  rows: ContributionRow[],
  pattern: RegExp
): ContributionRow[] {
  return rows.filter((r) => pattern.test(r.label));
}

function buildWhyNotCategories(
  candidate: OpportunityCandidate | null | undefined,
  view: InstitutionalCandidateView
): Array<{ label: string; matched: boolean }> {
  const failures = (candidate?.nearestFilterFailures ?? []).join(" ").toLowerCase();
  const negatives = view.negativeFactors.map((f) => f.label.toLowerCase()).join(" ");
  const blob = `${failures} ${negatives} ${candidate?.reasonMissed ?? ""}`.toLowerCase();

  return [
    { label: "Lower Confidence", matched: /confidence|conviction/.test(blob) || view.confidence < 65 },
    { label: "Failed Validation", matched: /validat|rule|filter/.test(blob) },
    { label: "Weak Momentum", matched: /momentum|trend/.test(blob) },
    { label: "Low Liquidity", matched: /liquid|volume|delivery/.test(blob) },
    { label: "Risk Too High", matched: /risk|drawdown|volatil/.test(blob) || view.riskRating === "High" },
    { label: "Trust Too Low", matched: /trust/.test(blob) || (view.trustScore != null && view.trustScore < 60) },
  ];
}

function buildCatalystTimeline(
  candidate: OpportunityCandidate | null | undefined,
  view: InstitutionalCandidateView
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "detected",
      label: "Detected",
      at: view.generatedAt,
      available: Boolean(view.generatedAt),
    },
    {
      id: "validated",
      label: "Validated",
      at: view.supportingFactors.length > 0 ? view.generatedAt : null,
      available: view.supportingFactors.length > 0 || view.validationTrace.length > 0,
    },
    {
      id: "ranked",
      label: "Ranked",
      at: candidate?.rank ? view.lastUpdatedAt : null,
      available: Boolean(candidate?.rank),
    },
    {
      id: "watchlist",
      label: "Added To Watchlist",
      at: view.generatedAt,
      available: true,
    },
    {
      id: "recommendation",
      label: "Recommendation Generated",
      at: view.generatedAt,
      available: view.primaryReasons.length > 0 || Boolean(candidate?.reason),
    },
    {
      id: "updated",
      label: "Last Updated",
      at: view.lastUpdatedAt,
      available: Boolean(view.lastUpdatedAt),
    },
    {
      id: "next_review",
      label: "Next Review",
      at: null,
      available: true,
    },
  ];

  return events.map((e) =>
    e.id === "next_review"
      ? { ...e, at: null, available: true }
      : e
  );
}

function buildConfidenceTimeline(view: InstitutionalCandidateView): TimelineEvent[] {
  return [
    {
      id: "conf_generated",
      label: "Confidence Established",
      at: view.generatedAt,
      available: view.confidence > 0,
    },
    {
      id: "conf_drivers",
      label: "Drivers Attributed",
      at: view.confidenceDistribution.length > 0 ? view.lastUpdatedAt : null,
      available: view.confidenceDistribution.length > 0,
    },
    {
      id: "conf_updated",
      label: "Confidence Last Updated",
      at: view.lastUpdatedAt,
      available: Boolean(view.lastUpdatedAt),
    },
  ].filter((e) => e.available);
}

function buildHistoricalSimilarity(
  candidate: OpportunityCandidate | null | undefined,
  view: InstitutionalCandidateView
): ResearchHistoricalSimilarityView {
  const hasEvidence =
    candidate?.maximumGainAfterSignal != null ||
    candidate?.setupDurationHours != null ||
    candidate?.moveAfterSignalPercent != null ||
    view.historicalValidationAccuracy != null ||
    view.historicalSimilarity != null;

  if (!hasEvidence) {
    return {
      similarSetups: [],
      averageOutcome: INSUFFICIENT,
      winRate: NA,
      averageHoldingPeriod: NA,
      averageReturn: NA,
      empty: true,
      emptyMessage: INSUFFICIENT,
    };
  }

  const similarSetups: string[] = [];
  if (view.historicalSimilarity) similarSetups.push(view.historicalSimilarity);
  if (candidate?.expiredOutcome) {
    similarSetups.push(`Prior setup outcome: ${candidate.expiredOutcome}`);
  }
  if (view.historicalValidationAccuracy != null) {
    similarSetups.push(
      `Historical validation accuracy ${disp(view.historicalValidationAccuracy)}`
    );
  }
  if (similarSetups.length === 0) {
    similarSetups.push("Similar setups inferred from signal history fields");
  }

  return {
    similarSetups,
    averageOutcome:
      candidate?.expiredOutcome ??
      (candidate?.moveAfterSignalPercent != null
        ? `Move after signal ${pct(candidate.moveAfterSignalPercent)}`
        : INSUFFICIENT),
    winRate:
      view.historicalValidationAccuracy != null
        ? pct(view.historicalValidationAccuracy)
        : NA,
    averageHoldingPeriod:
      candidate?.setupDurationHours != null && candidate.setupDurationHours > 0
        ? `${Math.round(candidate.setupDurationHours)}h`
        : NA,
    averageReturn:
      candidate?.maximumGainAfterSignal != null && candidate.maximumGainAfterSignal !== 0
        ? pct(candidate.maximumGainAfterSignal)
        : candidate?.moveAfterSignalPercent != null && candidate.moveAfterSignalPercent !== 0
          ? pct(candidate.moveAfterSignalPercent)
          : NA,
    empty: false,
    emptyMessage: INSUFFICIENT,
  };
}

/**
 * Build full institutional research drawer model from existing candidate + view.
 */
export function buildInstitutionalResearchDrawerView(
  view: InstitutionalCandidateView,
  candidate: OpportunityCandidate | null = null
): InstitutionalResearchDrawerView {
  const allDrivers = [
    ...view.topPositiveDrivers,
    ...view.supportingFactors,
    ...view.confidenceDistribution,
  ];
  const components = candidate?.convictionComponents;

  const componentRows: ContributionRow[] = components
    ? [
        { label: "Technical", contribution: components.technical },
        { label: "Momentum", contribution: components.momentum },
        { label: "Trend / Relative Strength", contribution: components.relativeStrength },
        { label: "Volume", contribution: components.volume },
        { label: "Liquidity", contribution: components.liquidity },
        { label: "Fundamentals", contribution: components.fundamentals },
        { label: "Market Regime", contribution: components.marketRegime },
        { label: "Reward / Risk", contribution: components.rewardRisk },
      ]
    : [];

  const whyThisStock: ResearchDriverGroup[] = [
    driverGroup("Positive Drivers", view.topPositiveDrivers),
    driverGroup(
      "Fundamental Drivers",
      [
        ...filterDrivers(allDrivers, /fundamental|valuation|earnings|quality/i),
        ...(view.fundamentalContribution != null
          ? [{ label: "Fundamental Contribution", contribution: view.fundamentalContribution }]
          : []),
        ...componentRows.filter((r) => r.label === "Fundamentals"),
      ]
    ),
    driverGroup(
      "Technical Drivers",
      [
        ...filterDrivers(allDrivers, /technical|breakout|trend|chart/i),
        ...componentRows.filter((r) => r.label === "Technical"),
      ]
    ),
    driverGroup(
      "Sector Drivers",
      [
        ...(view.sectorContribution != null
          ? [{ label: "Sector Contribution", contribution: view.sectorContribution }]
          : []),
        ...(view.sectorStrength != null
          ? [{ label: "Sector Strength", contribution: view.sectorStrength }]
          : []),
      ]
    ),
    driverGroup(
      "Liquidity Drivers",
      [
        ...filterDrivers(allDrivers, /liquid|delivery/i),
        ...componentRows.filter((r) => r.label === "Liquidity"),
        ...(view.institutionalFlow != null
          ? [{ label: "Institutional Flow", contribution: view.institutionalFlow }]
          : []),
      ]
    ),
    driverGroup(
      "Relative Strength",
      componentRows.filter((r) => /Relative Strength/i.test(r.label))
    ),
    driverGroup(
      "Momentum",
      [
        ...(view.momentumContribution != null
          ? [{ label: "Momentum Contribution", contribution: view.momentumContribution }]
          : []),
        ...componentRows.filter((r) => r.label === "Momentum"),
      ]
    ),
    driverGroup(
      "Volume",
      [
        ...(view.volumeContribution != null
          ? [{ label: "Volume Contribution", contribution: view.volumeContribution }]
          : []),
        ...componentRows.filter((r) => r.label === "Volume"),
      ]
    ),
    driverGroup(
      "Valuation",
      filterDrivers(allDrivers, /valuation|fair|underval|reward/i).length > 0
        ? filterDrivers(allDrivers, /valuation|fair|underval|reward/i)
        : componentRows.filter((r) => r.label === "Reward / Risk")
    ),
  ];

  const whyCategories = buildWhyNotCategories(candidate, view);
  const rejectedCandidates =
    candidate?.nearestFilterFailures?.length
      ? candidate.nearestFilterFailures.map((f) => `Filter: ${f}`)
      : view.negativeFactors.map((f) => f.label);

  const upside = upsidePercent(candidate);
  const downside = downsidePercent(candidate);
  const bullProb = Math.min(
    90,
    Math.max(
      10,
      Math.round(
        view.confidence * 0.55 +
          (view.overallScore || 0) * 0.25 +
          (candidate?.gapProbability ?? 40) * 0.2
      )
    )
  );
  const bearProb = Math.max(5, 100 - bullProb);

  const supportingWeight = sumPositive(view.confidenceDistribution);
  const negativeWeight = sumNegative(view.confidenceDistribution);
  const netScore = supportingWeight + negativeWeight;

  const catalystChips = [
    view.expectedCatalyst,
    candidate?.openingBias,
    candidate?.gapProbabilityLevel
      ? `Gap ${candidate.gapProbabilityLevel}`
      : null,
  ].filter((c): c is string => Boolean(c && c.trim()));

  const executiveSummary = [
    `${view.primaryReasons[0] ?? candidate?.reason?.split("\n")[0] ?? "Institutional opportunity under review."}`,
    `Conviction ${disp(view.overallScore)} · Confidence ${pct(view.confidence)} · Risk ${formatOptionalText(view.riskRating, AWAITING)}.`,
    view.expectedCatalyst
      ? `Catalyst focus: ${view.expectedCatalyst}.`
      : "Catalyst: Awaiting Validation.",
  ].join(" ");

  return {
    executiveSummary,
    investmentThesis: {
      businessSummary: formatOptionalText(
        candidate?.company
          ? `${candidate.company} (${candidate.symbol}) — ${candidate.category} ${candidate.side} setup.`
          : null,
        INSUFFICIENT
      ),
      currentOpportunity: formatOptionalText(
        view.primaryReasons[0] ?? candidate?.reason?.split("\n")[0],
        AWAITING
      ),
      expectedEdge:
        candidate && candidate.riskReward > 0
          ? `Risk/Reward ${candidate.riskReward.toFixed(2)} · Target1 relative edge ${pct(upside, INSUFFICIENT)}`
          : INSUFFICIENT,
      marketContext: formatOptionalText(
        view.marketRegimeContribution != null
          ? `Market regime contribution ${view.marketRegimeContribution}`
          : candidate?.timeHorizon
            ? `Horizon: ${candidate.timeHorizon}`
            : null,
        NA
      ),
      primaryDrivers: view.primaryReasons.length
        ? view.primaryReasons
        : [INSUFFICIENT],
      secondaryDrivers: view.supportingFactors
        .slice(0, 5)
        .map((r) => `${r.label} (+${r.contribution})`),
      aiSummary: formatOptionalText(
        candidate?.bestCallReasons?.[0] ??
          view.decisionTrace[0] ??
          view.primaryReasons[0],
        AWAITING
      ),
    },
    whyThisStock,
    whyNotOthers: {
      rejectedCandidates:
        rejectedCandidates.length > 0 ? rejectedCandidates : [INSUFFICIENT],
      reasons:
        view.negativeFactors.length > 0
          ? view.negativeFactors.map((f) => `${f.label} (${f.contribution})`)
          : candidate?.reasonMissed
            ? [candidate.reasonMissed]
            : [NA],
      categories: whyCategories,
    },
    bullCase: {
      probability: pct(bullProb),
      expectedMove: pct(upside, INSUFFICIENT),
      evidence:
        view.topPositiveDrivers.length > 0
          ? view.topPositiveDrivers
              .slice(0, 5)
              .map((d) => `${d.label} (+${d.contribution})`)
          : view.primaryReasons.slice(0, 4),
      catalystsOrRisks: catalystChips.length > 0 ? catalystChips : [AWAITING],
    },
    bearCase: {
      probability: pct(bearProb),
      expectedMove: pct(downside, INSUFFICIENT),
      evidence:
        view.topNegativeDrivers.length > 0
          ? view.topNegativeDrivers
              .slice(0, 5)
              .map((d) => `${d.label} (${d.contribution})`)
          : view.riskFactors.slice(0, 4).map((r) => r.label),
      catalystsOrRisks:
        view.riskFactors.length > 0
          ? view.riskFactors.slice(0, 4).map((r) => r.label)
          : [NA],
    },
    riskPanel: {
      executionRisk: disp(components?.rewardRisk, { fallback: AWAITING }),
      liquidityRisk: disp(components?.liquidity, { fallback: AWAITING }),
      volatility: formatOptionalText(
        candidate?.scanMetrics && typeof candidate.scanMetrics.volatility === "number"
          ? String(Math.round(candidate.scanMetrics.volatility as number))
          : null,
        NA
      ),
      gapRisk: pct(candidate?.gapProbability, AWAITING),
      eventRisk: formatOptionalText(view.expectedCatalyst, NA),
      sectorRisk: disp(view.sectorStrength ?? view.sectorContribution, {
        fallback: NA,
      }),
      overallRiskGrade: riskGrade(view.riskRating),
      chips: [
        view.riskRating ? `Risk ${view.riskRating}` : null,
        candidate?.gapProbabilityLevel
          ? `Gap ${candidate.gapProbabilityLevel}`
          : null,
        candidate?.maximumDrawdownAfterSignal != null &&
        candidate.maximumDrawdownAfterSignal !== 0
          ? `Max DD ${pct(candidate.maximumDrawdownAfterSignal)}`
          : null,
      ].filter((c): c is string => Boolean(c)),
    },
    catalystTimeline: buildCatalystTimeline(candidate, view),
    recommendationTimeline: view.timeline,
    confidenceTimeline: buildConfidenceTimeline(view),
    historicalSimilarity: buildHistoricalSimilarity(candidate, view),
    scorecard: {
      aiConviction: disp(view.overallScore, { fallback: AWAITING }),
      validationScore: disp(view.validationScore, { fallback: AWAITING }),
      trustScore: disp(view.trustScore, { fallback: AWAITING }),
      qualityScore: disp(view.recommendationQuality, { fallback: AWAITING }),
      riskScore: formatOptionalText(view.riskRating, AWAITING),
      executionScore: disp(view.signalStability, { fallback: AWAITING }),
      overallGrade: overallGrade(view),
      radar: [
        { label: "AI Conviction", value: view.overallScore || null },
        { label: "Confidence", value: view.confidence || null },
        { label: "Trust", value: view.trustScore },
        { label: "Validation", value: view.validationScore },
        { label: "Quality", value: view.recommendationQuality },
        { label: "Stability", value: view.signalStability },
      ],
    },
    confidenceBreakdown: {
      confidence: pct(view.confidence, AWAITING),
      supportingWeight:
        supportingWeight > 0 ? `+${Math.round(supportingWeight)}` : NA,
      negativeWeight:
        negativeWeight < 0 ? String(Math.round(negativeWeight)) : NA,
      netScore: netScore !== 0 ? String(Math.round(netScore)) : NA,
      drivers: view.confidenceDistribution,
    },
    sectorContribution: disp(view.sectorContribution, { fallback: NA }),
    catalystChips: catalystChips.length > 0 ? catalystChips : [AWAITING],
    badges: view.badges,
  };
}

export function formatResearchStamp(iso: string | null | undefined): string {
  if (!iso) return "Awaiting Validation";
  return formatOptionalTimestamp(iso, NA);
}
