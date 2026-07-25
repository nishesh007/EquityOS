/**
 * Sprint 11A.3 — Research Intelligence presenters.
 * Presentation-only projection of existing CompanyResearch / EquityIntelligence
 * outputs. Never recalculates engines or invents scores.
 */

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type {
  CompanyResearch,
  EquityIntelligence,
  QualityScoreItem,
  RedFlag,
  Signal,
  ValuationModelOutput,
  ValuationVerdict,
} from "@/types";
import type { LinkedSymbolEvent } from "@/types/eventIntegration";

export type SummaryVerdictTone = "positive" | "neutral" | "negative" | "info" | "ai";

export interface SummaryMetric {
  label: string;
  value: string;
  tone?: SummaryVerdictTone;
}

export interface TechnicalSummaryView {
  available: boolean;
  verdict: string;
  metrics: SummaryMetric[];
  explanation: string;
  companyHref: string;
}

export interface FundamentalSummaryView {
  available: boolean;
  overallRating: string;
  overallScore: number | null;
  metrics: SummaryMetric[];
  highlights: string[];
  overallVerdict: string;
  explanation: string;
  companyHref: string;
}

export interface ValuationModelChip {
  label: string;
  verdict: string;
  fairValue: string;
}

export interface ValuationSummaryView {
  available: boolean;
  overallVerdict: string;
  intrinsicValue: string;
  marginOfSafety: string;
  fairValueStatus: string;
  models: ValuationModelChip[];
  explanation: string;
  companyHref: string;
}

export interface RiskAnalysisView {
  available: boolean;
  overallRiskLevel: string;
  riskTone: SummaryVerdictTone;
  topRisks: Array<{ label: string; severity: string; description: string }>;
  positiveFactors: string[];
  riskTrend: string;
  explanation: string;
  companyHref: string;
}

export interface CatalystEventRow {
  id: string;
  title: string;
  category: string;
  date: string;
  countdown: string;
  impact: string;
  href: string;
}

export interface EventsCatalystsView {
  available: boolean;
  upcomingEarnings: string;
  corporateActions: string;
  macroEvents: string;
  keyCatalysts: string[];
  expectedImpact: string;
  events: CatalystEventRow[];
  calendarHref: string;
}

export interface QualityCardView {
  id: string;
  label: string;
  value: string;
  verdict: string;
  explanation: string;
  tone: SummaryVerdictTone;
}

export interface FinancialQualitySnapshotView {
  available: boolean;
  overallScore: number | null;
  overallVerdict: string;
  cards: QualityCardView[];
  companyHref: string;
}

export interface RelatedResearchLink {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface RelatedResearchView {
  links: RelatedResearchLink[];
}

export interface ResearchIntelligenceView {
  technical: TechnicalSummaryView;
  fundamental: FundamentalSummaryView;
  valuation: ValuationSummaryView;
  risk: RiskAnalysisView;
  events: EventsCatalystsView;
  quality: FinancialQualitySnapshotView;
  related: RelatedResearchView;
}

const PLACEHOLDER = "Research package unavailable for this symbol.";

function companyHref(symbol: string): string {
  return `/company/${symbol.toUpperCase()}`;
}

function toneFromScore(score: number | null | undefined): SummaryVerdictTone {
  if (score == null || !Number.isFinite(score)) return "neutral";
  if (score >= 70) return "positive";
  if (score >= 50) return "info";
  return "negative";
}

function toneFromSignal(signal: Signal | string | null | undefined): SummaryVerdictTone {
  const s = String(signal ?? "").toLowerCase();
  if (s.includes("bull") || s === "buy") return "positive";
  if (s.includes("bear") || s === "sell") return "negative";
  return "neutral";
}

function formatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}`;
}

function verdictFromScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "Awaiting data";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Constructive";
  if (score >= 45) return "Mixed";
  return "Weak";
}

function findScore(
  scores: QualityScoreItem[],
  key: string
): QualityScoreItem | undefined {
  return scores.find((item) => item.key === key);
}

function technicalVerdictLabel(signal: Signal | undefined, score: number | null): string {
  if (signal === "bullish") return "Bullish";
  if (signal === "bearish") return "Bearish";
  if (signal === "neutral") return "Neutral";
  return verdictFromScore(score);
}

function valuationTone(verdict: ValuationVerdict | string): SummaryVerdictTone {
  const v = String(verdict);
  if (v.includes("Under")) return "positive";
  if (v.includes("Over")) return "negative";
  return "neutral";
}

function modelLabel(model: ValuationModelOutput): string {
  const map: Record<string, string> = {
    dcf: "DCF",
    graham: "Graham",
    epv: "Buffett / EPV",
    "relative-pe": "Relative PE",
    "relative-pb": "Relative PB",
    "ev-ebitda": "EV/EBITDA",
    "sector-comparison": "Sector",
  };
  return map[model.key] ?? model.label;
}

function riskLevelFromMeter(
  meter: number | null | undefined,
  flagCount: number
): { label: string; tone: SummaryVerdictTone } {
  if (meter == null || !Number.isFinite(meter)) {
    if (flagCount >= 4) return { label: "Elevated", tone: "negative" };
    if (flagCount >= 2) return { label: "Moderate", tone: "neutral" };
    return { label: "Contained", tone: "positive" };
  }
  if (meter >= 70) return { label: "High", tone: "negative" };
  if (meter >= 45) return { label: "Moderate", tone: "neutral" };
  return { label: "Low", tone: "positive" };
}

function severitySort(a: RedFlag, b: RedFlag): number {
  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  return rank[a.severity] - rank[b.severity];
}

function eventCategoryLabel(eventType: string): string {
  if (eventType.includes("result") || eventType.includes("earning")) return "Earnings";
  if (
    eventType.includes("dividend") ||
    eventType.includes("bonus") ||
    eventType.includes("split") ||
    eventType.includes("buyback") ||
    eventType.includes("agm")
  ) {
    return "Corporate";
  }
  if (eventType.includes("macro") || eventType.includes("rbi") || eventType.includes("fed")) {
    return "Macro";
  }
  return "Event";
}

function emptyTechnical(symbol: string, shared: SharedRecommendation | null): TechnicalSummaryView {
  const frameworks = shared?.matchedFrameworks.technical ?? [];
  return {
    available: frameworks.length > 0,
    verdict: frameworks.length > 0 ? "Constructive" : "Awaiting data",
    metrics: [
      { label: "Trend", value: frameworks[0] ?? "—" },
      { label: "Momentum", value: frameworks[1] ?? "—" },
      { label: "Support", value: "—" },
      { label: "Resistance", value: "—" },
      { label: "Volume Strength", value: "—" },
      { label: "Technical Confidence", value: shared ? formatScore(shared.confidence) : "—" },
    ],
    explanation:
      frameworks.length > 0
        ? frameworks.slice(0, 2).join(" · ")
        : PLACEHOLDER,
    companyHref: companyHref(symbol),
  };
}

export function buildTechnicalSummaryView(
  symbol: string,
  research: CompanyResearch | null,
  intelligence: EquityIntelligence | null,
  shared: SharedRecommendation | null
): TechnicalSummaryView {
  if (!research) return emptyTechnical(symbol, shared);

  const score = research.technicals.score;
  const ai = research.ai;
  const decisionTech = intelligence?.decision.technical;
  const support = decisionTech?.support || ai.support;
  const resistance = decisionTech?.resistance || ai.resistance;

  return {
    available: true,
    verdict: technicalVerdictLabel(research.technicals.summary, score),
    metrics: [
      { label: "Trend", value: ai.trend || "—", tone: toneFromSignal(research.technicals.summary) },
      { label: "Momentum", value: ai.momentum || "—", tone: toneFromScore(score) },
      { label: "Support", value: formatInr(support) },
      { label: "Resistance", value: formatInr(resistance) },
      {
        label: "Volume Strength",
        value: ai.volumeAnalysis || "—",
        tone: "info",
      },
      {
        label: "Technical Confidence",
        value: `${formatScore(score)}`,
        tone: toneFromScore(score),
      },
    ],
    explanation:
      ai.investmentThesis?.slice(0, 220) ||
      (score >= 60
        ? "Price remains constructive versus key levels with improving momentum and healthy volume participation."
        : score >= 45
          ? "Technical structure is mixed — confirmation above resistance and volume follow-through remain important."
          : "Technical backdrop is soft; respect support and avoid chasing weakness until momentum stabilizes."),
    companyHref: companyHref(symbol),
  };
}

export function buildFundamentalSummaryView(
  symbol: string,
  intelligence: EquityIntelligence | null,
  shared: SharedRecommendation | null
): FundamentalSummaryView {
  const quality = intelligence?.financialQuality;
  const scores = quality?.scores ?? [];
  const href = companyHref(symbol);

  if (!quality) {
    const highlights = [
      ...(shared?.matchedFrameworks.fundamental ?? []),
      ...(shared?.matchedFrameworks.growth ?? []),
    ].slice(0, 4);
    return {
      available: highlights.length > 0,
      overallRating: highlights.length > 0 ? "Partial" : "Awaiting data",
      overallScore: null,
      metrics: [
        { label: "Revenue Growth", value: "—" },
        { label: "Profit Growth", value: "—" },
        { label: "ROE", value: "—" },
        { label: "ROCE", value: "—" },
        { label: "Debt", value: "—" },
        { label: "Cash Flow", value: "—" },
        { label: "Promoter Quality", value: "—" },
        { label: "Institutional Ownership", value: "—" },
      ],
      highlights: highlights.length > 0 ? highlights : [PLACEHOLDER],
      overallVerdict: highlights[0] ?? "Awaiting data",
      explanation: highlights.slice(0, 2).join(" · ") || PLACEHOLDER,
      companyHref: href,
    };
  }

  const pick = (key: string) => findScore(scores, key);
  const metric = (key: string, label: string): SummaryMetric => {
    const item = pick(key);
    return {
      label,
      value: item ? formatScore(item.score) : "—",
      tone: item ? toneFromScore(item.score) : "neutral",
    };
  };

  const highlights = scores
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.explanation || `${item.label}: ${Math.round(item.score)}`);

  return {
    available: true,
    overallRating: verdictFromScore(quality.overallScore),
    overallScore: Math.round(quality.overallScore),
    metrics: [
      metric("revenue-growth", "Revenue Growth"),
      metric("profit-growth", "Profit Growth"),
      metric("roe", "ROE"),
      metric("roce", "ROCE"),
      metric("debt", "Debt"),
      metric("free-cash-flow", "Cash Flow"),
      metric("promoter-holding", "Promoter Quality"),
      metric("institutional-holding", "Institutional Ownership"),
    ],
    highlights,
    overallVerdict: verdictFromScore(quality.overallScore),
    explanation:
      intelligence.thesis.managementQuality?.slice(0, 220) ||
      intelligence.summary.summary?.slice(0, 220) ||
      highlights.slice(0, 2).join(" · "),
    companyHref: href,
  };
}

export function buildValuationSummaryView(
  symbol: string,
  intelligence: EquityIntelligence | null,
  shared: SharedRecommendation | null
): ValuationSummaryView {
  const valuation = intelligence?.valuation;
  const href = companyHref(symbol);

  if (!valuation || !valuation.available) {
    const tags = shared?.matchedFrameworks.valuation ?? [];
    return {
      available: tags.length > 0,
      overallVerdict: tags[0] ?? "Awaiting data",
      intrinsicValue: "—",
      marginOfSafety: "—",
      fairValueStatus: tags[0] ?? "—",
      models: [
        { label: "DCF", verdict: "—", fairValue: "—" },
        { label: "Graham", verdict: "—", fairValue: "—" },
        { label: "Buffett", verdict: "—", fairValue: "—" },
        { label: "Relative", verdict: "—", fairValue: "—" },
      ],
      explanation: tags.slice(0, 2).join(" · ") || PLACEHOLDER,
      companyHref: href,
    };
  }

  const preferredKeys = ["dcf", "graham", "epv", "relative-pe"];
  const byKey = new Map(valuation.models.map((m) => [m.key, m]));
  const selected = preferredKeys
    .map((key) => byKey.get(key))
    .filter(Boolean) as ValuationModelOutput[];
  const models: ValuationModelChip[] = (
    selected.length > 0 ? selected : valuation.models.slice(0, 4)
  ).map((model) => ({
    label: modelLabel(model),
    verdict: model.verdict,
    fairValue: formatInr(model.fairValue),
  }));

  while (models.length < 4) {
    models.push({ label: "—", verdict: "—", fairValue: "—" });
  }

  return {
    available: true,
    overallVerdict: valuation.overallVerdict,
    intrinsicValue: formatInr(valuation.intrinsicValue || valuation.estimatedFairValue),
    marginOfSafety: formatPct(valuation.marginOfSafety),
    fairValueStatus: valuation.overallVerdict,
    models: models.slice(0, 4),
    explanation:
      valuation.summary?.slice(0, 220) ||
      intelligence.thesis.valuationOpinion?.slice(0, 220) ||
      `${valuation.overallVerdict} on a blended multi-model read with ${formatPct(valuation.marginOfSafety)} margin of safety.`,
    companyHref: href,
  };
}

export function buildRiskAnalysisView(
  symbol: string,
  intelligence: EquityIntelligence | null,
  shared: SharedRecommendation | null
): RiskAnalysisView {
  const href = companyHref(symbol);
  const flags = [...(intelligence?.redFlags ?? [])].sort(severitySort);
  const opportunities = intelligence?.opportunities ?? [];
  const meter = intelligence?.decision.risk.overallRiskMeter ?? null;
  const level = riskLevelFromMeter(meter, flags.length);

  if (!intelligence && !shared) {
    return {
      available: false,
      overallRiskLevel: "Awaiting data",
      riskTone: "neutral",
      topRisks: [],
      positiveFactors: [],
      riskTrend: "—",
      explanation: PLACEHOLDER,
      companyHref: href,
    };
  }

  const topRisks = flags.slice(0, 5).map((flag) => ({
    label: flag.label,
    severity: flag.severity,
    description: flag.description,
  }));

  if (topRisks.length === 0 && shared) {
    topRisks.push({
      label: "Published risk mode",
      severity: "Medium",
      description: `Risk mode ${shared.riskMode} · R:R ${shared.riskReward.toFixed(2)}`,
    });
  }

  const positiveFactors = [
    ...opportunities.slice(0, 3).map((item) => item.description || item.label),
    ...(intelligence?.decision.aiSummary.greenFlags ?? []).slice(0, 3),
  ].slice(0, 3);

  const improving = flags.filter((f) => f.severity === "Low").length;
  const deteriorating = flags.filter((f) => f.severity === "High").length;
  const riskTrend =
    deteriorating > improving
      ? "Deteriorating"
      : improving > deteriorating
        ? "Improving"
        : "Stable";

  return {
    available: true,
    overallRiskLevel: level.label,
    riskTone: level.tone,
    topRisks,
    positiveFactors:
      positiveFactors.length > 0
        ? positiveFactors
        : ["No material positive offsets published in this package."],
    riskTrend,
    explanation:
      intelligence?.decision.aiSummary.majorRisks.slice(0, 2).join(" · ") ||
      (shared
        ? `Risk posture ${shared.riskMode} with published R:R ${shared.riskReward.toFixed(2)}.`
        : "Risks are framed by published red flags and decision risk meter."),
    companyHref: href,
  };
}

export function buildEventsCatalystsView(
  symbol: string,
  intelligence: EquityIntelligence | null,
  linkedEvents: LinkedSymbolEvent[]
): EventsCatalystsView {
  const earnings = linkedEvents.filter((item) =>
    /result|earning/i.test(item.event.eventType)
  );
  const corporate = linkedEvents.filter((item) =>
    /dividend|bonus|split|buyback|agm|corporate/i.test(item.event.eventType)
  );
  const macro = linkedEvents.filter(
    (item) =>
      item.matchReason === "sector" ||
      /macro|rbi|fed|central/i.test(item.event.eventType) ||
      item.awareness.includes("macro") ||
      item.awareness.includes("central_bank")
  );

  const events: CatalystEventRow[] = linkedEvents.slice(0, 5).map((item) => ({
    id: item.event.id,
    title: item.event.title,
    category: eventCategoryLabel(item.event.eventType),
    date: item.event.date,
    countdown: item.countdown.label,
    impact:
      item.impactScore != null
        ? `Impact ${Math.round(item.impactScore)}`
        : item.riskLabel,
    href: `/events?event=${encodeURIComponent(item.event.id)}`,
  }));

  const keyCatalysts = [
    ...(intelligence?.thesis.keyCatalysts ?? []),
    ...(intelligence?.decision.aiSummary.catalysts ?? []),
    ...events.map((event) => event.title),
  ]
    .filter(Boolean)
    .slice(0, 5);

  const highImpact = linkedEvents.filter(
    (item) => (item.impactScore ?? 0) >= 70 || item.riskLabel === "risk"
  );

  return {
    available: events.length > 0 || keyCatalysts.length > 0,
    upcomingEarnings:
      earnings[0] != null
        ? `${earnings[0].event.title} · ${earnings[0].countdown.label}`
        : "None scheduled in catalog",
    corporateActions:
      corporate[0] != null
        ? `${corporate[0].event.title} · ${corporate[0].countdown.label}`
        : "None scheduled in catalog",
    macroEvents:
      macro[0] != null
        ? `${macro[0].event.title} · ${macro[0].countdown.label}`
        : "No high-importance macro overlay",
    keyCatalysts:
      keyCatalysts.length > 0 ? keyCatalysts : ["No near-term catalysts published."],
    expectedImpact:
      highImpact.length > 0
        ? `${highImpact.length} elevated-impact item(s) in the near window.`
        : "Near-term event impact appears contained on current catalog reads.",
    events,
    calendarHref: "/events",
  };
}

function qualityCardFromItems(
  id: string,
  label: string,
  items: Array<QualityScoreItem | undefined>,
  fallbackExplanation: string
): QualityCardView {
  const present = items.filter(Boolean) as QualityScoreItem[];
  if (present.length === 0) {
    return {
      id,
      label,
      value: "—",
      verdict: "Awaiting data",
      explanation: fallbackExplanation,
      tone: "neutral",
    };
  }
  const avg = present.reduce((sum, item) => sum + item.score, 0) / present.length;
  const best = present.slice().sort((a, b) => b.score - a.score)[0]!;
  return {
    id,
    label,
    value: formatScore(avg),
    verdict: verdictFromScore(avg),
    explanation: best.explanation || fallbackExplanation,
    tone: toneFromScore(avg),
  };
}

export function buildFinancialQualitySnapshotView(
  symbol: string,
  intelligence: EquityIntelligence | null
): FinancialQualitySnapshotView {
  const href = companyHref(symbol);
  const quality = intelligence?.financialQuality;
  if (!quality) {
    return {
      available: false,
      overallScore: null,
      overallVerdict: "Awaiting data",
      cards: [
        "Revenue",
        "Profitability",
        "Efficiency",
        "Balance Sheet",
        "Cash Flow",
        "Capital Allocation",
        "Overall Quality",
      ].map((label) => ({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        value: "—",
        verdict: "Awaiting data",
        explanation: PLACEHOLDER,
        tone: "neutral" as const,
      })),
      companyHref: href,
    };
  }

  const scores = quality.scores;
  const pick = (key: string) => findScore(scores, key);

  const cards: QualityCardView[] = [
    qualityCardFromItems(
      "revenue",
      "Revenue",
      [pick("revenue-growth")],
      "Top-line growth quality."
    ),
    qualityCardFromItems(
      "profitability",
      "Profitability",
      [pick("profit-growth"), pick("roe"), pick("net-margin")],
      "Earnings power and return on equity."
    ),
    qualityCardFromItems(
      "efficiency",
      "Efficiency",
      [pick("roce"), pick("operating-margin"), pick("working-capital")],
      "Capital and operating efficiency."
    ),
    qualityCardFromItems(
      "balance-sheet",
      "Balance Sheet",
      [pick("debt"), pick("interest-coverage")],
      "Leverage and coverage resilience."
    ),
    qualityCardFromItems(
      "cash-flow",
      "Cash Flow",
      [pick("free-cash-flow"), pick("cash-conversion")],
      "Cash generation versus reported earnings."
    ),
    qualityCardFromItems(
      "capital-allocation",
      "Capital Allocation",
      [pick("capital-allocation"), pick("dividend-consistency")],
      "Deployment of capital and shareholder returns."
    ),
    {
      id: "overall",
      label: "Overall Quality",
      value: formatScore(quality.overallScore),
      verdict: verdictFromScore(quality.overallScore),
      explanation:
        intelligence.score.explanation?.slice(0, 160) ||
        "Composite financial quality across published score cards.",
      tone: toneFromScore(quality.overallScore),
    },
  ];

  return {
    available: true,
    overallScore: Math.round(quality.overallScore),
    overallVerdict: verdictFromScore(quality.overallScore),
    cards,
    companyHref: href,
  };
}

export function buildRelatedResearchView(symbol: string): RelatedResearchView {
  const base = companyHref(symbol);
  return {
    links: [
      {
        id: "company",
        label: "Company Details",
        description: "Full institutional company workspace",
        href: base,
      },
      {
        id: "technical",
        label: "Technical Analysis",
        description: "Charts, indicators, and swing setup",
        href: base,
      },
      {
        id: "financials",
        label: "Financial Statements",
        description: "Statements and multi-year trends",
        href: base,
      },
      {
        id: "peers",
        label: "Peer Comparison",
        description: "Relative positioning versus peers",
        href: "/ai/compare",
      },
      {
        id: "quarterly",
        label: "Quarterly Results",
        description: "Recent prints and earnings trajectory",
        href: base,
      },
      {
        id: "news",
        label: "Latest News",
        description: "Company news and market commentary",
        href: base,
      },
      {
        id: "events",
        label: "Event Calendar",
        description: "Earnings, corporate actions, and macro",
        href: "/events",
      },
    ],
  };
}

export function buildResearchIntelligenceView(input: {
  symbol: string;
  research: CompanyResearch | null;
  intelligence: EquityIntelligence | null;
  shared: SharedRecommendation | null;
  linkedEvents: LinkedSymbolEvent[];
}): ResearchIntelligenceView {
  const { symbol, research, intelligence, shared, linkedEvents } = input;
  return {
    technical: buildTechnicalSummaryView(symbol, research, intelligence, shared),
    fundamental: buildFundamentalSummaryView(symbol, intelligence, shared),
    valuation: buildValuationSummaryView(symbol, intelligence, shared),
    risk: buildRiskAnalysisView(symbol, intelligence, shared),
    events: buildEventsCatalystsView(symbol, intelligence, linkedEvents),
    quality: buildFinancialQualitySnapshotView(symbol, intelligence),
    related: buildRelatedResearchView(symbol),
  };
}

/** Empty shell while research loads or when symbol has no package. */
export function buildEmptyResearchIntelligenceView(
  symbol: string,
  shared: SharedRecommendation | null = null
): ResearchIntelligenceView {
  return buildResearchIntelligenceView({
    symbol,
    research: null,
    intelligence: null,
    shared,
    linkedEvents: [],
  });
}
