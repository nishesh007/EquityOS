/**
 * Sprint 10C — Executive Intelligence builders (presentation only).
 */

import { describe, expect, it } from "vitest";
import {
  buildDailyBriefing,
  buildFlashCards,
  buildMarketPulseChips,
  buildPortfolioAlerts,
  formatBriefingClock,
} from "./executive-intelligence";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { InstitutionalStrategySlot } from "@/lib/recommendations";
import type { SharedRecommendation } from "@/lib/recommendations";
import type {
  MarketBreadth,
  MarketIndex,
  MarketPulse,
  PortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";

function intelligence(
  overrides: Partial<MarketIntelligenceSnapshot> = {}
): MarketIntelligenceSnapshot {
  return {
    context: {
      marketTrend: "Neutral",
      marketStrength: 52,
      contextScore: 55,
      contextConfidence: 70,
      riskMode: "Balanced",
      volatilityRegime: "Normal",
      volatilityScore: 40,
      breadthScore: 58,
      breadthQuality: "Constructive",
      advanceCount: 820,
      declineCount: 620,
      advanceDeclineRatio: 1.32,
      sectorBreadth: 0.6,
      momentum: 0.1,
      liquidity: 0.5,
      institutionalParticipation: 0.4,
      leadingSectors: ["Banking", "Capital Goods"],
      weakSectors: ["IT"],
      summary: ["Market remains range-bound with improving breadth."],
      warnings: [],
      components: {
        trend: "Neutral",
        volatility: "Normal",
        breadthScore: 58,
        breadthQuality: "Constructive",
        advanceDeclineRatio: 1.32,
        marketStrength: 52,
        riskMode: "Balanced",
        momentumHint: 0.1,
        liquidityHint: 0.5,
        institutionalParticipation: 0.4,
        leadingSectors: ["Banking"],
        weakSectors: ["IT"],
        healthScore: 60,
        qualityGrade: "B",
      },
      timestamp: "2026-07-25T06:30:00.000Z",
    },
    regime: {
      regime: "Range-Bound",
      confidence: 72,
      confidenceGrade: "B",
      priority: 2,
      reasons: [],
      triggeredRules: [],
      positiveReasons: [],
      negativeReasons: [],
      summary: ["Range-bound regime with constructive participation."],
      components: {
        trendStrength: 40,
        momentum: 35,
        volatility: 40,
        breadth: 58,
        risk: "Balanced",
        contributions: [],
      },
      timestamp: "2026-07-25T06:30:00.000Z",
    },
    confidence: 72,
    confidenceGrade: "B",
    pipelineHealth: null,
    pipelineHealthGrade: null,
    eligibleStrategyCount: 7,
    timestamp: "2026-07-25T06:30:00.000Z",
    source: "context-regime",
    ...overrides,
  };
}

const indices: MarketIndex[] = [
  {
    id: "1",
    name: "Nifty 50",
    symbol: "NIFTY",
    value: 24500,
    change: 80,
    changePercent: 0.33,
    high: 24550,
    low: 24380,
    sparkline: [],
  },
  {
    id: "2",
    name: "Sensex",
    symbol: "SENSEX",
    value: 80500,
    change: -40,
    changePercent: -0.05,
    high: 80600,
    low: 80300,
    sparkline: [],
  },
];

const pulse: MarketPulse = {
  indiaVix: 13.2,
  indiaVixChange: -0.4,
  institutionalFlow: { fii: 1, dii: 1, asOf: "2026-07-25" },
  putCallRatio: 0.9,
  marketTrend: "Neutral",
  breadthScore: 58,
};

const breadth: MarketBreadth = {
  advances: 820,
  declines: 620,
  unchanged: 40,
  newHighs: 12,
  newLows: 4,
  sectors: [],
  gainers: [],
  losers: [],
  weekHighs: [
    {
      symbol: "RELIANCE",
      name: "Reliance",
      price: 3000,
      changePercent: 1.2,
      volume: "2.1M",
    },
  ],
  weekLows: [],
  mostActive: [
    {
      symbol: "HDFCBANK",
      name: "HDFC Bank",
      price: 1700,
      changePercent: 0.8,
      volume: "12.4M",
    },
  ],
  marketMood: "Cautiously Bullish",
  marketStatusLabel: "Open",
};

describe("executive intelligence builders", () => {
  it("builds ten pulse chips from live index and MI fields", () => {
    const chips = buildMarketPulseChips({
      indices,
      pulse,
      intelligence: intelligence(),
      breadth,
    });
    expect(chips).toHaveLength(10);
    expect(chips.map((c) => c.label)).toEqual([
      "NIFTY",
      "SENSEX",
      "BANKNIFTY",
      "INDIA VIX",
      "Market Status",
      "Market Regime",
      "Breadth",
      "Risk",
      "Volatility",
      "Market Mood",
    ]);
    expect(chips[0].value).toContain("%");
    expect(chips.every((c) => c.href.length > 0)).toBe(true);
  });

  it("builds briefing bullets only from provided dashboard facts", () => {
    const slots: InstitutionalStrategySlot[] = [
      {
        strategyId: "swing",
        label: "Swing",
        emoji: "",
        href: "/opportunities",
        pick: {
          strategyId: "swing",
          company: "TCS",
          symbol: "TCS",
          currentPrice: 4000,
          entry: 3980,
          entryMode: "ideal",
          entryLow: null,
          entryHigh: null,
          entryAtMarket: true,
          primaryTarget: 4200,
          expectedUpsidePercent: 5,
          conviction: 88,
          lastScanTime: "2026-07-25T06:00:00.000Z",
        },
        lastScanTime: "2026-07-25T06:00:00.000Z",
      },
    ];
    const portfolio: PortfolioSummary = {
      totalValue: 1_000_000,
      dayChange: -5000,
      dayChangePercent: -0.5,
      totalInvested: 900_000,
      totalGain: 100_000,
      totalGainPercent: 11,
      holdings: [
        {
          id: "1",
          symbol: "INFY",
          name: "Infosys",
          quantity: 10,
          avgPrice: 1400,
          currentPrice: 1410,
          changePercent: 0.5,
        },
      ],
    };
    const { bullets, updatedAt } = buildDailyBriefing({
      intelligence: intelligence(),
      breadth,
      slots,
      portfolio,
      recommendations: [],
      results: [
        {
          id: "r1",
          company: "Infosys",
          symbol: "INFY",
          date: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
          quarter: "Q1",
          sector: "IT",
          marketCap: "Large",
        },
      ],
    });
    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets.length).toBeLessThanOrEqual(6);
    expect(bullets.some((b) => b.text.includes("Banking"))).toBe(true);
    expect(bullets.some((b) => b.text.includes("high-conviction"))).toBe(true);
    expect(bullets.some((b) => b.text.includes("INFY") || b.text.includes("result"))).toBe(
      true
    );
    expect(formatBriefingClock(updatedAt)).toMatch(/\d{2}:\d{2}/);
  });

  it("emits actionable flash cards without placeholders", () => {
    const cards = buildFlashCards({
      slots: [
        {
          strategyId: "swing",
          label: "Swing",
          emoji: "",
          href: "/opportunities",
          pick: {
            strategyId: "swing",
            company: "TCS",
            symbol: "TCS",
            currentPrice: 4000,
            entry: 3980,
            entryMode: "ideal",
            entryLow: null,
            entryHigh: null,
            entryAtMarket: true,
            primaryTarget: 4200,
            expectedUpsidePercent: 5,
            conviction: 88,
            lastScanTime: "2026-07-25T06:00:00.000Z",
          },
          lastScanTime: "2026-07-25T06:00:00.000Z",
        },
      ],
      breadth,
      portfolio: {
        totalValue: 100,
        dayChange: 0,
        dayChangePercent: 0,
        totalInvested: 100,
        totalGain: 0,
        totalGainPercent: 0,
        holdings: [],
      },
      recommendations: [],
      watchlist: [] as WatchlistItem[],
      results: [] as UpcomingResult[],
      intelligence: intelligence(),
    });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.insight.trim().length > 0)).toBe(true);
    expect(cards.some((c) => c.category === "BUY SIGNAL")).toBe(true);
  });

  it("caps portfolio alerts at five and sorts by priority", () => {
    const portfolio: PortfolioSummary = {
      totalValue: 100_000,
      dayChange: -2000,
      dayChangePercent: -2,
      totalInvested: 90_000,
      totalGain: 10_000,
      totalGainPercent: 11,
      holdings: [
        {
          id: "1",
          symbol: "A",
          name: "A",
          quantity: 50,
          avgPrice: 1000,
          currentPrice: 1000,
          changePercent: -6,
        },
        {
          id: "2",
          symbol: "B",
          name: "B",
          quantity: 30,
          avgPrice: 500,
          currentPrice: 520,
          changePercent: 6,
        },
      ],
    };
    const recommendations = [
      {
        id: "r1",
        symbol: "A",
        company: "A",
        category: "swing",
        action: "BUY",
        primaryStrategy: "Swing",
        primaryStrategyId: "swing",
        matchedStrategies: [],
        supportingStrategies: [],
        opposingStrategies: [],
        strategyCount: 1,
        agreementPercent: 80,
        conflictPercent: 0,
        opportunityScore: 80,
        frameworkScore: 80,
        confidence: 80,
        conviction: 80,
        entry: 1000,
        stopLoss: 990,
        targets: [1100],
        risk: 10,
        reward: 100,
        riskReward: 10,
        holdingPeriod: "5D",
        marketContext: "",
        marketRegime: "",
        riskMode: "",
        eligibility: "eligible",
        reasons: [],
        evidence: [],
        matchedFrameworks: {
          technical: [],
          fundamental: [],
          valuation: [],
          growth: [],
        },
        validation: {
          valid: true,
          score: 80,
          checks: {
            tradeLevels: true,
            institutionalTradeLevels: true,
            confidence: true,
            opportunityScore: true,
            agreement: true,
            marketContext: true,
            marketRegime: true,
            eligibility: true,
          },
          reasons: [],
        },
        longTermRanking: null,
        timestamp: "2026-07-25T06:00:00.000Z",
        source: "OpportunityEngine",
      },
    ] as SharedRecommendation[];

    const alerts = buildPortfolioAlerts({
      portfolio,
      recommendations,
      results: [],
    });
    expect(alerts.length).toBeLessThanOrEqual(5);
    expect(alerts[0].priority).toBeLessThanOrEqual(alerts.at(-1)!.priority);
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length);
  });
});
