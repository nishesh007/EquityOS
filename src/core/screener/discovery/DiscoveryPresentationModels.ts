/**
 * AI Discovery Engine — presentation models (Sprint 9D.R6).
 * Empty states & cards. Never surface null / undefined / NaN.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import type { ScreenGrade } from "../intelligence/ScreenPresentationModels";
import { gradeFromScore } from "../intelligence/ScreenPresentationModels";

export const DISCOVERY_EMPTY = {
  noOpportunities: "No Opportunities",
  awaitingMarketData: "Awaiting Market Data",
  noActiveThemes: "No Active Themes",
} as const;

export type DiscoveryEmptyMessage =
  (typeof DISCOVERY_EMPTY)[keyof typeof DISCOVERY_EMPTY];

export const DISCOVERY_IDEA_CATEGORIES = [
  "Highest Conviction",
  "High Growth",
  "Strong Momentum",
  "Undervalued",
  "Turnaround",
  "Income",
  "Safe Compounders",
  "High Risk High Reward",
  "Emerging Leaders",
  "Portfolio Candidates",
  "Watchlist Candidates",
] as const;

export type DiscoveryIdeaCategory = (typeof DISCOVERY_IDEA_CATEGORIES)[number];

export const DISCOVERY_KINDS = [
  "Fresh Breakouts",
  "High Conviction Buys",
  "Accumulation Candidates",
  "Momentum Leaders",
  "Early Trend Reversals",
  "Quality Compounders",
  "Deep Value Opportunities",
  "Growth Leaders",
  "Sector Leaders",
  "Institutional Buying",
  "High Trust Opportunities",
  "High Validation Opportunities",
  "Low Risk Entries",
  "Multi-bagger Candidates",
] as const;

export type DiscoveryKind = (typeof DISCOVERY_KINDS)[number];

export const THEME_IDS = [
  "defence",
  "railways",
  "capital_goods",
  "power",
  "banks",
  "it",
  "pharma",
  "consumption",
  "auto",
  "real_estate",
  "manufacturing",
  "green_energy",
  "semiconductors",
  "ai",
  "telecom",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  defence: "Defence",
  railways: "Railways",
  capital_goods: "Capital Goods",
  power: "Power",
  banks: "Banks",
  it: "IT",
  pharma: "Pharma",
  consumption: "Consumption",
  auto: "Auto",
  real_estate: "Real Estate",
  manufacturing: "Manufacturing",
  green_energy: "Green Energy",
  semiconductors: "Semiconductors",
  ai: "AI",
  telecom: "Telecom",
};

/** Sector / industry / tag needles for theme matching (compose only). */
export const THEME_MATCHERS: Record<ThemeId, string[]> = {
  defence: ["defence", "defense", "aerospace", "ordnance", "military"],
  railways: ["railway", "railways", "rail"],
  capital_goods: ["capital goods", "industrial", "engineering", "machinery"],
  power: ["power", "utilities", "electricity", "energy utility"],
  banks: ["bank", "banks", "banking", "nbfc", "financials"],
  it: ["it", "information technology", "software", "technology"],
  pharma: ["pharma", "pharmaceutical", "healthcare", "biotech"],
  consumption: ["fmcg", "consumer", "consumption", "retail"],
  auto: ["auto", "automobile", "automotive", "ev"],
  real_estate: ["real estate", "realty", "housing", "construction"],
  manufacturing: ["manufacturing", "industrials", "factory"],
  green_energy: ["green energy", "renewable", "solar", "wind", "clean energy"],
  semiconductors: ["semiconductor", "chip", "fabs", "electronics"],
  ai: ["ai", "artificial intelligence", "machine learning", "genai"],
  telecom: ["telecom", "telecommunications", "wireless", "5g"],
};

export interface DiscoveryScoreFactors {
  technical: number;
  fundamental: number;
  growth: number;
  momentum: number;
  quality: number;
  risk: number;
  trust: number;
  validation: number;
  aiConviction: number;
  sectorStrength: number;
  themeStrength: number;
  liquidity: number;
  marketBreadth: number;
  /** Overall discovery score 0–100 */
  overallDiscoveryScore: number;
}

/** Injected discovery candidate — compose metric bags, never recalculate indicators. */
export interface DiscoveryCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  metrics?: Record<string, number | string | null | undefined> | null;
  tags?: string[] | null;
  themeTags?: string[] | null;
  domain?: "portfolio" | "watchlist" | "opportunity" | null;
  inPortfolio?: boolean | null;
  inWatchlist?: boolean | null;
  trustScore?: number | null;
  validationScore?: number | null;
  aiConviction?: number | null;
  opportunityScore?: number | null;
  confidence?: number | null;
  momentum?: number | null;
  technical?: number | null;
  growth?: number | null;
  quality?: number | null;
  risk?: number | null;
  fundamentalStrength?: number | null;
  liquidity?: number | null;
  sectorStrength?: number | null;
  themeStrength?: number | null;
  marketBreadth?: number | null;
  sectorFlow?: number | null;
  income?: number | null;
  value?: number | null;
  riskReward?: number | null;
  evidence?: string[] | null;
  reasonSummary?: string | null;
}

export interface DiscoveryIdeaCard {
  company: string;
  ticker: string;
  sector: string;
  industry: string;
  grade: ScreenGrade;
  category: DiscoveryIdeaCategory;
  kinds: DiscoveryKind[];
  themes: ThemeId[];
  badges: string[];
  discoveryScore: number;
  institutionalScore: number;
  confidence: number;
  trust: number;
  validation: number;
  aiConviction: number;
  reasonSummary: string;
  drivers: string[];
  evidence: string[];
  rank: number;
  factors: DiscoveryScoreFactors;
  empty: boolean;
  emptyMessage: DiscoveryEmptyMessage;
}

export interface ThemeCard {
  themeId: ThemeId;
  label: string;
  strength: number;
  candidateCount: number;
  leaders: string[];
  sectors: string[];
  empty: boolean;
  emptyMessage: DiscoveryEmptyMessage;
}

export interface SectorRotationCard {
  sector: string;
  moneyFlow: number;
  strength: number;
  leadershipChange: boolean;
  breakout: boolean;
  weakness: boolean;
  leaders: string[];
  candidateCount: number;
  empty: boolean;
  emptyMessage: DiscoveryEmptyMessage;
}

export interface DiscoveryInsight {
  ticker: string;
  whyDiscovered: string;
  supportingFactors: string[];
  drivers: string[];
  validation: string;
  trust: string;
  evidence: string[];
  risk: string;
  expectedHorizon: string;
  confidence: number;
  suggestedAllocation: string;
  empty: boolean;
  emptyMessage: DiscoveryEmptyMessage;
}

export interface DiscoveryResult {
  ideas: DiscoveryIdeaCard[];
  themes: ThemeCard[];
  sectorRotation: SectorRotationCard[];
  insights: DiscoveryInsight[];
  totalIdeas: number;
  empty: boolean;
  emptyMessage: DiscoveryEmptyMessage;
  generatedAt: string;
}

export function emptyDiscoveryScoreFactors(): DiscoveryScoreFactors {
  return {
    technical: 0,
    fundamental: 0,
    growth: 0,
    momentum: 0,
    quality: 0,
    risk: 0,
    trust: 0,
    validation: 0,
    aiConviction: 0,
    sectorStrength: 0,
    themeStrength: 0,
    liquidity: 0,
    marketBreadth: 0,
    overallDiscoveryScore: 0,
  };
}

export function emptyDiscoveryIdeaCard(
  message: DiscoveryEmptyMessage = DISCOVERY_EMPTY.noOpportunities
): DiscoveryIdeaCard {
  return {
    company: message,
    ticker: "—",
    sector: "—",
    industry: "—",
    grade: "F",
    category: "Watchlist Candidates",
    kinds: [],
    themes: [],
    badges: [],
    discoveryScore: 0,
    institutionalScore: 0,
    confidence: 0,
    trust: 0,
    validation: 0,
    aiConviction: 0,
    reasonSummary: message,
    drivers: [],
    evidence: [],
    rank: 0,
    factors: emptyDiscoveryScoreFactors(),
    empty: true,
    emptyMessage: message,
  };
}

export function emptyThemeCard(
  message: DiscoveryEmptyMessage = DISCOVERY_EMPTY.noActiveThemes,
  themeId: ThemeId = "defence"
): ThemeCard {
  return {
    themeId,
    label: THEME_LABELS[themeId],
    strength: 0,
    candidateCount: 0,
    leaders: [],
    sectors: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptySectorRotationCard(
  message: DiscoveryEmptyMessage = DISCOVERY_EMPTY.awaitingMarketData
): SectorRotationCard {
  return {
    sector: message,
    moneyFlow: 0,
    strength: 0,
    leadershipChange: false,
    breakout: false,
    weakness: false,
    leaders: [],
    candidateCount: 0,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyDiscoveryInsight(
  ticker?: string | null,
  message: DiscoveryEmptyMessage = DISCOVERY_EMPTY.awaitingMarketData
): DiscoveryInsight {
  return {
    ticker: safeScreenText(ticker, "—").toUpperCase(),
    whyDiscovered: message,
    supportingFactors: [],
    drivers: [],
    validation: message,
    trust: message,
    evidence: [],
    risk: message,
    expectedHorizon: "—",
    confidence: 0,
    suggestedAllocation: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyDiscoveryResult(
  message: DiscoveryEmptyMessage = DISCOVERY_EMPTY.awaitingMarketData
): DiscoveryResult {
  return {
    ideas: [],
    themes: [],
    sectorRotation: [],
    insights: [],
    totalIdeas: 0,
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
  };
}

function normalizeStringList(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => safeScreenText(v, "")).filter(Boolean);
}

function normalizeThemeList(values: ThemeId[] | null | undefined): ThemeId[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set<string>(THEME_IDS);
  return values.filter((t): t is ThemeId => allowed.has(t));
}

function normalizeKindList(values: DiscoveryKind[] | null | undefined): DiscoveryKind[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set<string>(DISCOVERY_KINDS);
  return values.filter((k): k is DiscoveryKind => allowed.has(k));
}

export function normalizeDiscoveryScoreFactors(
  input?: Partial<DiscoveryScoreFactors> | null
): DiscoveryScoreFactors {
  const base = emptyDiscoveryScoreFactors();
  if (!input) return base;
  return {
    technical: safeScreenNumber(input.technical, 0),
    fundamental: safeScreenNumber(input.fundamental, 0),
    growth: safeScreenNumber(input.growth, 0),
    momentum: safeScreenNumber(input.momentum, 0),
    quality: safeScreenNumber(input.quality, 0),
    risk: safeScreenNumber(input.risk, 0),
    trust: safeScreenNumber(input.trust, 0),
    validation: safeScreenNumber(input.validation, 0),
    aiConviction: safeScreenNumber(input.aiConviction, 0),
    sectorStrength: safeScreenNumber(input.sectorStrength, 0),
    themeStrength: safeScreenNumber(input.themeStrength, 0),
    liquidity: safeScreenNumber(input.liquidity, 0),
    marketBreadth: safeScreenNumber(input.marketBreadth, 0),
    overallDiscoveryScore: safeScreenNumber(input.overallDiscoveryScore, 0),
  };
}

export function normalizeDiscoveryIdeaCard(input: {
  company?: string | null;
  ticker?: string | null;
  sector?: string | null;
  industry?: string | null;
  grade?: ScreenGrade | null;
  category?: DiscoveryIdeaCategory | null;
  kinds?: DiscoveryKind[] | null;
  themes?: ThemeId[] | null;
  badges?: string[] | null;
  discoveryScore?: number | null;
  institutionalScore?: number | null;
  confidence?: number | null;
  trust?: number | null;
  validation?: number | null;
  aiConviction?: number | null;
  reasonSummary?: string | null;
  drivers?: string[] | null;
  evidence?: string[] | null;
  rank?: number | null;
  factors?: Partial<DiscoveryScoreFactors> | null;
  empty?: boolean | null;
  emptyMessage?: DiscoveryEmptyMessage | null;
}): DiscoveryIdeaCard {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? DISCOVERY_EMPTY.noOpportunities;
  const factors = normalizeDiscoveryScoreFactors(input.factors);
  const score = safeScreenNumber(
    input.discoveryScore,
    factors.overallDiscoveryScore
  );
  const category =
    input.category &&
    (DISCOVERY_IDEA_CATEGORIES as readonly string[]).includes(input.category)
      ? input.category
      : "Watchlist Candidates";

  return {
    company: safeScreenText(input.company, empty ? message : "—"),
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    sector: safeScreenText(input.sector, "—"),
    industry: safeScreenText(input.industry, "—"),
    grade: input.grade ?? gradeFromScore(score),
    category,
    kinds: normalizeKindList(input.kinds),
    themes: normalizeThemeList(input.themes),
    badges: normalizeStringList(input.badges),
    discoveryScore: score,
    institutionalScore: safeScreenNumber(input.institutionalScore, 0),
    confidence: safeScreenNumber(input.confidence, factors.aiConviction),
    trust: safeScreenNumber(input.trust, factors.trust),
    validation: safeScreenNumber(input.validation, factors.validation),
    aiConviction: safeScreenNumber(input.aiConviction, factors.aiConviction),
    reasonSummary: safeScreenText(
      input.reasonSummary,
      empty ? message : "No reason available"
    ),
    drivers: normalizeStringList(input.drivers),
    evidence: normalizeStringList(input.evidence),
    rank: Math.max(0, Math.floor(safeScreenNumber(input.rank, 0))),
    factors,
    empty,
    emptyMessage: message,
  };
}

export function normalizeThemeCard(input: {
  themeId?: ThemeId | null;
  label?: string | null;
  strength?: number | null;
  candidateCount?: number | null;
  leaders?: string[] | null;
  sectors?: string[] | null;
  empty?: boolean | null;
  emptyMessage?: DiscoveryEmptyMessage | null;
}): ThemeCard {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? DISCOVERY_EMPTY.noActiveThemes;
  const themeId =
    input.themeId && (THEME_IDS as readonly string[]).includes(input.themeId)
      ? input.themeId
      : "defence";
  return {
    themeId,
    label: safeScreenText(input.label, THEME_LABELS[themeId]),
    strength: safeScreenNumber(input.strength, 0),
    candidateCount: Math.max(
      0,
      Math.floor(safeScreenNumber(input.candidateCount, 0))
    ),
    leaders: normalizeStringList(input.leaders).map((t) => t.toUpperCase()),
    sectors: normalizeStringList(input.sectors),
    empty,
    emptyMessage: message,
  };
}

export function normalizeSectorRotationCard(input: {
  sector?: string | null;
  moneyFlow?: number | null;
  strength?: number | null;
  leadershipChange?: boolean | null;
  breakout?: boolean | null;
  weakness?: boolean | null;
  leaders?: string[] | null;
  candidateCount?: number | null;
  empty?: boolean | null;
  emptyMessage?: DiscoveryEmptyMessage | null;
}): SectorRotationCard {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? DISCOVERY_EMPTY.awaitingMarketData;
  return {
    sector: safeScreenText(input.sector, empty ? message : "—"),
    moneyFlow: safeScreenNumber(input.moneyFlow, 0),
    strength: safeScreenNumber(input.strength, 0),
    leadershipChange: input.leadershipChange === true,
    breakout: input.breakout === true,
    weakness: input.weakness === true,
    leaders: normalizeStringList(input.leaders).map((t) => t.toUpperCase()),
    candidateCount: Math.max(
      0,
      Math.floor(safeScreenNumber(input.candidateCount, 0))
    ),
    empty,
    emptyMessage: message,
  };
}

export function normalizeDiscoveryInsight(input: {
  ticker?: string | null;
  whyDiscovered?: string | null;
  supportingFactors?: string[] | null;
  drivers?: string[] | null;
  validation?: string | null;
  trust?: string | null;
  evidence?: string[] | null;
  risk?: string | null;
  expectedHorizon?: string | null;
  confidence?: number | null;
  suggestedAllocation?: string | null;
  empty?: boolean | null;
  emptyMessage?: DiscoveryEmptyMessage | null;
}): DiscoveryInsight {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? DISCOVERY_EMPTY.awaitingMarketData;
  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    whyDiscovered: safeScreenText(
      input.whyDiscovered,
      empty ? message : "Discovered via institutional composition"
    ),
    supportingFactors: normalizeStringList(input.supportingFactors),
    drivers: normalizeStringList(input.drivers),
    validation: safeScreenText(
      input.validation,
      empty ? message : "Validation baseline"
    ),
    trust: safeScreenText(input.trust, empty ? message : "Trust baseline"),
    evidence: normalizeStringList(input.evidence),
    risk: safeScreenText(input.risk, empty ? message : "Risk assessed"),
    expectedHorizon: safeScreenText(input.expectedHorizon, "Medium-term"),
    confidence: safeScreenNumber(input.confidence, 0),
    suggestedAllocation: safeScreenText(
      input.suggestedAllocation,
      empty ? message : "Monitor"
    ),
    empty,
    emptyMessage: message,
  };
}
