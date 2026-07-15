/**
 * AI Discovery Engine — tests (Sprint 9D.R6).
 */

import { describe, expect, it } from "vitest";
import {
  DISCOVERY_EMPTY,
  DISCOVERY_KINDS,
  THEME_IDS,
  assertNoSentinelText,
  buildDiscoveryInsights,
  classifyDiscoveryKinds,
  composeDiscoveryScoreFactors,
  discoverIdeas,
  discoverSectorRotation,
  discoverThemes,
  emptyDiscoveryResult,
  generateInstitutionalIdeas,
  normalizeDiscoveryIdeaCard,
  normalizeDiscoveryInsight,
  normalizeSectorRotationCard,
  normalizeThemeCard,
  rankIdeas,
  registerAIScreener,
  toDiscoveryCandidate,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
} from "../index";

const elite: DiscoveryCandidate = {
  ticker: "HAL",
  company: "Hindustan Aeronautics",
  sector: "Defence",
  industry: "Aerospace & Defence",
  tags: ["breakout", "institutional_buying", "fresh_breakout"],
  themeTags: ["defence"],
  trustScore: 92,
  validationScore: 88,
  aiConviction: 90,
  opportunityScore: 85,
  confidence: 88,
  momentum: 82,
  technical: 80,
  growth: 78,
  quality: 84,
  risk: 72,
  fundamentalStrength: 80,
  liquidity: 78,
  sectorStrength: 85,
  themeStrength: 88,
  marketBreadth: 70,
  sectorFlow: 75,
  riskReward: 2.8,
  income: 30,
  value: 45,
  metrics: {
    price_above_ema50: 1,
    momentum: 82,
    trust_score: 92,
    validation_score: 88,
    ai_conviction: 90,
    quality_score: 84,
    revenue_yoy: 28,
    eps_growth: 32,
  },
  evidence: ["Order book expansion", "FII accumulation"],
  reasonSummary: "Defence breakout with institutional flow",
};

const growthName: DiscoveryCandidate = {
  ticker: "PERSISTENT",
  company: "Persistent Systems",
  sector: "IT",
  industry: "Information Technology",
  tags: ["growth", "sector_leader"],
  themeTags: ["it", "ai"],
  trustScore: 72,
  validationScore: 70,
  aiConviction: 74,
  opportunityScore: 80,
  momentum: 76,
  technical: 74,
  growth: 88,
  quality: 80,
  risk: 68,
  fundamentalStrength: 82,
  liquidity: 70,
  sectorStrength: 78,
  themeStrength: 80,
  marketBreadth: 66,
  metrics: {
    growth: 88,
    revenue_yoy: 30,
    price_above_ema50: 1,
  },
};

const valueName: DiscoveryCandidate = {
  ticker: "VALUECO",
  company: "Value Co",
  sector: "Banks",
  industry: "Private Banks",
  tags: ["value", "accumulation"],
  trustScore: 70,
  validationScore: 68,
  aiConviction: 60,
  momentum: 42,
  technical: 48,
  growth: 35,
  quality: 72,
  risk: 70,
  fundamentalStrength: 74,
  liquidity: 65,
  sectorStrength: 55,
  value: 78,
  income: 65,
  metrics: {
    value: 78,
    dividend_yield: 3.2,
    pe: 8,
  },
};

const weak: DiscoveryCandidate = {
  ticker: "WEAKCO",
  company: "Weak Co",
  sector: "Misc",
  trustScore: 20,
  validationScore: 18,
  aiConviction: 15,
  momentum: 22,
  technical: 20,
  growth: 10,
  quality: 25,
  risk: 30,
  liquidity: 25,
  sectorStrength: 20,
};

describe("AI Discovery Engine (9D.R6)", () => {
  describe("discoverIdeas kinds", () => {
    it("tags Fresh Breakouts and High Conviction Buys", () => {
      const kinds = classifyDiscoveryKinds(elite);
      expect(kinds).toContain("Fresh Breakouts");
      expect(kinds).toContain("High Conviction Buys");
      expect(kinds).toContain("Institutional Buying");
    });

    it("tags Momentum / Growth / Sector Leaders", () => {
      const kinds = classifyDiscoveryKinds(growthName);
      expect(kinds).toContain("Momentum Leaders");
      expect(kinds).toContain("Growth Leaders");
      expect(kinds).toContain("Sector Leaders");
    });

    it("tags Accumulation and Deep Value", () => {
      const kinds = classifyDiscoveryKinds(valueName);
      expect(kinds).toContain("Accumulation Candidates");
      expect(kinds).toContain("Deep Value Opportunities");
    });

    it("discoverIdeas returns non-empty ranked ideas", () => {
      const result = discoverIdeas([elite, growthName, valueName], {
        resultLimit: 10,
      });
      expect(result.empty).toBe(false);
      expect(result.totalIdeas).toBeGreaterThan(0);
      expect(result.ideas[0].rank).toBe(1);
      expect(result.ideas[0].kinds.length).toBeGreaterThan(0);
      expect(DISCOVERY_KINDS.length).toBe(14);
    });

    it("filters by kind option", () => {
      const result = discoverIdeas([elite, weak], {
        kinds: ["Fresh Breakouts"],
        minDiscoveryScore: 0,
      });
      expect(result.empty).toBe(false);
      expect(
        result.ideas.every((i) => i.kinds.includes("Fresh Breakouts"))
      ).toBe(true);
    });
  });

  describe("theme discovery", () => {
    it("detects Defence and IT/AI themes", () => {
      const themes = discoverThemes([elite, growthName]);
      expect(themes.some((t) => t.themeId === "defence" && !t.empty)).toBe(
        true
      );
      expect(themes.some((t) => t.themeId === "it" && !t.empty)).toBe(true);
      expect(THEME_IDS.length).toBe(15);
    });

    it("returns No Active Themes empty state", () => {
      const themes = discoverThemes([
        { ticker: "X", sector: "Unknown", industry: "N/A" },
      ]);
      expect(themes[0].empty).toBe(true);
      expect(themes[0].emptyMessage).toBe(DISCOVERY_EMPTY.noActiveThemes);
    });
  });

  describe("sector rotation", () => {
    it("aggregates money flow by sector", () => {
      const cards = discoverSectorRotation([
        elite,
        { ...elite, ticker: "BEL", sector: "Defence", momentum: 70 },
        growthName,
      ]);
      expect(cards.some((c) => c.sector === "Defence" && !c.empty)).toBe(true);
      expect(cards[0].moneyFlow).toBeGreaterThan(0);
    });

    it("flags leadership change / breakout via tags", () => {
      const cards = discoverSectorRotation([
        {
          ...elite,
          tags: ["leadership_change", "sector_breakout", "breakout"],
        },
      ]);
      const defence = cards.find((c) => c.sector === "Defence");
      expect(defence?.leadershipChange).toBe(true);
      expect(defence?.breakout).toBe(true);
    });

    it("empty when no sector data", () => {
      const cards = discoverSectorRotation([]);
      expect(cards[0].empty).toBe(true);
      expect(cards[0].emptyMessage).toBe(DISCOVERY_EMPTY.awaitingMarketData);
    });
  });

  describe("idea ranking order", () => {
    it("ranks higher discovery score first", () => {
      const low = normalizeDiscoveryIdeaCard({
        ticker: "LOW",
        company: "Low",
        discoveryScore: 40,
        confidence: 40,
        empty: false,
      });
      const high = normalizeDiscoveryIdeaCard({
        ticker: "HIGH",
        company: "High",
        discoveryScore: 90,
        confidence: 80,
        empty: false,
      });
      const ranked = rankIdeas([low, high]);
      expect(ranked[0].ticker).toBe("HIGH");
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });

    it("composeDiscoveryScoreFactors includes overlays", () => {
      const factors = composeDiscoveryScoreFactors(elite);
      expect(factors.overallDiscoveryScore).toBeGreaterThan(50);
      expect(factors.sectorStrength).toBeGreaterThan(0);
      expect(factors.themeStrength).toBeGreaterThan(0);
      expect(factors.liquidity).toBeGreaterThan(0);
      expect(factors.marketBreadth).toBeGreaterThan(0);
      expect(factors.trust).toBeGreaterThan(80);
    });
  });

  describe("generateInstitutionalIdeas categories", () => {
    it("classifies Highest Conviction for elite names", () => {
      const cards = generateInstitutionalIdeas([elite]);
      expect(cards[0].empty).toBe(false);
      expect(cards[0].category).toBe("Highest Conviction");
    });

    it("classifies High Growth", () => {
      const cards = generateInstitutionalIdeas([growthName]);
      expect(cards[0].category).toBe("High Growth");
    });

    it("classifies Portfolio / Watchlist candidates", () => {
      const port = generateInstitutionalIdeas([
        { ...elite, inPortfolio: true },
      ]);
      expect(port[0].category).toBe("Portfolio Candidates");
      const watch = generateInstitutionalIdeas([
        { ...valueName, inWatchlist: true, domain: "watchlist" },
      ]);
      expect(watch[0].category).toBe("Watchlist Candidates");
    });

    it("returns No Opportunities when empty", () => {
      const cards = generateInstitutionalIdeas([]);
      expect(cards[0].empty).toBe(true);
      expect(cards[0].emptyMessage).toBe(DISCOVERY_EMPTY.noOpportunities);
    });
  });

  describe("buildDiscoveryInsights explainability", () => {
    it("fills why / drivers / validation / trust / risk / horizon / allocation", () => {
      const result = discoverIdeas([elite], { resultLimit: 1 });
      const insight = buildDiscoveryInsights(result.ideas[0]);
      expect(insight.empty).toBe(false);
      expect(insight.whyDiscovered.length).toBeGreaterThan(0);
      expect(insight.supportingFactors.length).toBeGreaterThan(0);
      expect(insight.drivers.length).toBeGreaterThan(0);
      expect(insight.validation).toMatch(/Validation/i);
      expect(insight.trust).toMatch(/Trust/i);
      expect(insight.evidence.length).toBeGreaterThan(0);
      expect(insight.risk.length).toBeGreaterThan(0);
      expect(insight.expectedHorizon.length).toBeGreaterThan(0);
      expect(insight.confidence).toBeGreaterThan(0);
      expect(insight.suggestedAllocation.length).toBeGreaterThan(0);
      expect(assertNoSentinelText(insight.whyDiscovered)).toBe(true);
    });

    it("works from raw candidate", () => {
      const insight = buildDiscoveryInsights(elite, {
        matchedSignals: ["breakout"],
      });
      expect(insight.ticker).toBe("HAL");
      expect(insight.empty).toBe(false);
    });
  });

  describe("presentation normalize no sentinels", () => {
    it("normalizeDiscoveryIdeaCard never emits sentinels", () => {
      const card = normalizeDiscoveryIdeaCard({
        ticker: null,
        company: "undefined",
        sector: "NaN",
        discoveryScore: Number.NaN,
        reasonSummary: null,
        badges: ["null", "ok"],
        empty: false,
      });
      expect(card.ticker).toBe("—");
      expect(assertNoSentinelText(card.company)).toBe(true);
      expect(assertNoSentinelText(card.sector)).toBe(true);
      expect(Number.isFinite(card.discoveryScore)).toBe(true);
      expect(card.badges).toEqual(["ok"]);
    });

    it("normalizeThemeCard / SectorRotation / Insight are sentinel-free", () => {
      const theme = normalizeThemeCard({
        label: "null",
        leaders: ["undefined", "HAL"],
        empty: false,
        themeId: "defence",
      });
      expect(assertNoSentinelText(theme.label)).toBe(true);
      expect(theme.leaders).toEqual(["HAL"]);

      const sector = normalizeSectorRotationCard({
        sector: undefined,
        moneyFlow: Number.NaN,
        empty: false,
      });
      expect(assertNoSentinelText(sector.sector)).toBe(true);
      expect(Number.isFinite(sector.moneyFlow)).toBe(true);

      const insight = normalizeDiscoveryInsight({
        ticker: "tcs",
        whyDiscovered: "NaN",
        empty: false,
      });
      expect(insight.ticker).toBe("TCS");
      expect(assertNoSentinelText(insight.whyDiscovered)).toBe(true);
    });
  });

  describe("empty states", () => {
    it("emptyDiscoveryResult awaiting market data", () => {
      const empty = emptyDiscoveryResult();
      expect(empty.empty).toBe(true);
      expect(empty.emptyMessage).toBe(DISCOVERY_EMPTY.awaitingMarketData);
      expect(empty.ideas).toEqual([]);
    });

    it("discoverIdeas empty universe → Awaiting Market Data", () => {
      const result = discoverIdeas([]);
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(DISCOVERY_EMPTY.awaitingMarketData);
    });

    it("expose No Opportunities / No Active Themes constants", () => {
      expect(DISCOVERY_EMPTY.noOpportunities).toBe("No Opportunities");
      expect(DISCOVERY_EMPTY.noActiveThemes).toBe("No Active Themes");
      expect(DISCOVERY_EMPTY.awaitingMarketData).toBe("Awaiting Market Data");
    });
  });

  describe("public API typeof checks", () => {
    it("exports callable discovery APIs", () => {
      registerAIScreener();
      expect(typeof discoverIdeas).toBe("function");
      expect(typeof discoverThemes).toBe("function");
      expect(typeof discoverSectorRotation).toBe("function");
      expect(typeof rankIdeas).toBe("function");
      expect(typeof generateInstitutionalIdeas).toBe("function");
      expect(typeof buildDiscoveryInsights).toBe("function");
      expect(typeof composeDiscoveryScoreFactors).toBe("function");
      expect(typeof toDiscoveryCandidate).toBe("function");
    });

    it("public discoverIdeas never throws on junk", () => {
      const result = discoverIdeas([
        { ticker: "", company: null, metrics: { momentum: "NaN" as unknown as number } },
      ] as DiscoveryCandidate[]);
      expect(result).toBeTruthy();
      expect(typeof result.empty).toBe("boolean");
    });
  });

  describe("regression", () => {
    it("maps institutional-like bags without recalculating indicators", () => {
      const mapped = toDiscoveryCandidate({
        ticker: "infy",
        sector: "IT",
        trustScore: 77,
        metrics: { momentum: 61, liquidity: 55 },
      });
      expect(mapped.ticker).toBe("INFY");
      expect(mapped.trustScore).toBe(77);
      const factors = composeDiscoveryScoreFactors(mapped);
      expect(Number.isFinite(factors.overallDiscoveryScore)).toBe(true);
    });

    it("discovery result includes themes and sector rotation side-cars", () => {
      const result = discoverIdeas([elite, growthName, valueName]);
      expect(result.themes.length).toBeGreaterThan(0);
      expect(result.sectorRotation.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("ranking is stable on equal confidence fallback", () => {
      const a: DiscoveryIdeaCard = normalizeDiscoveryIdeaCard({
        ticker: "A",
        discoveryScore: 70,
        confidence: 50,
        empty: false,
      });
      const b: DiscoveryIdeaCard = normalizeDiscoveryIdeaCard({
        ticker: "B",
        discoveryScore: 70,
        confidence: 90,
        empty: false,
      });
      const ranked = rankIdeas([a, b]);
      expect(ranked[0].ticker).toBe("B");
    });

    it("Quality Compounders / Low Risk heuristics fire", () => {
      const kinds = classifyDiscoveryKinds({
        ...elite,
        quality: 90,
        risk: 85,
        momentum: 55,
        tags: [],
      });
      expect(kinds).toContain("Quality Compounders");
      expect(kinds).toContain("Low Risk Entries");
    });
  });
});
