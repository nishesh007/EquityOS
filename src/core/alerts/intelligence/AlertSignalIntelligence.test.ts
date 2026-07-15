/**
 * Alert intelligence R4 — Technical / Fundamental / Market / Sector.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAlertEngine, resetAlertEngine } from "../AlertFacade";
import {
  FUNDAMENTAL_ALERT_KINDS,
  MARKET_ALERT_KINDS,
  SECTOR_ALERT_KINDS,
  SIGNAL_ALERT_EMPTY,
  TECHNICAL_ALERT_KINDS,
  detectFundamentalSignals,
  detectMarketSignals,
  detectSectorSignals,
  detectTechnicalSignals,
  generateFundamentalAlerts,
  generateMarketAlerts,
  generateSectorAlerts,
  generateTechnicalAlerts,
  resetAlertIntelligence,
  scoreAlerts,
  type FundamentalAlertSnapshot,
  type MarketAlertSnapshot,
  type SectorAlertSnapshot,
  type TechnicalAlertSnapshot,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function tech(
  overrides: Partial<TechnicalAlertSnapshot> = {}
): TechnicalAlertSnapshot {
  return {
    ticker: "RELIANCE",
    company: "Reliance Industries",
    sector: "Energy",
    rsi: 75,
    macdHistogram: 0.5,
    prevMacdHistogram: -0.2,
    ema20: 2950,
    ema50: 2850,
    ema200: 2800,
    prevEma20: 2780,
    prevEma50: 2790,
    atrPct: 4.2,
    volumeRatio: 2.1,
    momentum: 78,
    trendScore: 10,
    prevTrendScore: -8,
    priceTo52wHigh: 0.99,
    price: 3000,
    support: 2850,
    resistance: 2980,
    changePercent: 3.1,
    closingStrength: 85,
    inPortfolio: true,
    confidenceScore: 72,
    technicalStrength: 80,
    ...overrides,
  };
}

function fund(
  overrides: Partial<FundamentalAlertSnapshot> = {}
): FundamentalAlertSnapshot {
  return {
    ticker: "TCS",
    company: "Tata Consultancy",
    sector: "IT",
    pe: 50,
    prevPe: 60,
    revenueGrowth: 18,
    epsGrowth: 15,
    operatingMargin: 26,
    prevOperatingMargin: 24,
    roe: 42,
    prevRoe: 38,
    roce: 48,
    prevRoce: 44,
    debtToEquity: 0.1,
    prevDebtToEquity: 0.2,
    freeCashFlow: 12000,
    prevFreeCashFlow: 9000,
    promoterChangeQoQ: 0.8,
    institutionalChangeQoQ: 1.2,
    inWatchlist: true,
    confidenceScore: 74,
    fundamentalStrength: 78,
    ...overrides,
  };
}

function market(
  overrides: Partial<MarketAlertSnapshot> = {}
): MarketAlertSnapshot {
  return {
    id: "m1",
    asOf: "2026-07-15",
    marketTrend: "Bullish",
    prevMarketTrend: "Neutral",
    indiaVix: 23,
    indiaVixChange: 10,
    breadthScore: 70,
    prevBreadthScore: 50,
    advances: 1200,
    declines: 500,
    indexChangePercent: 1.5,
    volatility: 28,
    liquidityScore: 80,
    prevLiquidityScore: 60,
    rotatingSector: "Banking",
    confidenceScore: 70,
    marketStrength: 75,
    ...overrides,
  };
}

function sector(
  overrides: Partial<SectorAlertSnapshot> = {}
): SectorAlertSnapshot {
  return {
    sector: "IT",
    changePercent: 2.5,
    breadth: 68,
    prevChangePercent: -1.5,
    momentum: 72,
    marketChangePercent: 0.4,
    relativeStrength: 80,
    confidenceScore: 66,
    sectorStrength: 78,
    ...overrides,
  };
}

describe("Alert Intelligence R4 (Technical / Fundamental / Market)", () => {
  beforeEach(() => {
    resetAlertEngine();
    resetAlertIntelligence();
    registerAlertEngine();
  });

  afterEach(() => {
    resetAlertIntelligence();
    resetAlertEngine();
  });

  describe("Technical alerts", () => {
    it("generates RSI / MACD / cross / breakout / gap kinds", () => {
      expect(TECHNICAL_ALERT_KINDS.length).toBe(19);
      const batch = generateTechnicalAlerts({ symbols: [tech()], now: NOW });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("rsi_overbought")).toBe(true);
      expect(kinds.has("macd_bullish_cross")).toBe(true);
      expect(kinds.has("golden_cross")).toBe(true);
      expect(kinds.has("ema_cross")).toBe(true);
      expect(kinds.has("volume_breakout")).toBe(true);
      expect(kinds.has("price_breakout")).toBe(true);
      expect(kinds.has("week_52_high")).toBe(true);
      expect(kinds.has("atr_expansion")).toBe(true);
      expect(kinds.has("gap_up")).toBe(true);
      expect(kinds.has("trend_reversal")).toBe(true);
      expect(kinds.has("momentum_strength")).toBe(true);
      expect(batch.signalCards[0]!.signal).toBeTruthy();
      expect(batch.signalCards[0]!.relatedIndicators.length).toBeGreaterThan(0);
    });

    it("detects oversold / death cross / support / gap down", () => {
      const decisions = detectTechnicalSignals(
        tech({
          rsi: 25,
          macdHistogram: -0.3,
          prevMacdHistogram: 0.2,
          ema50: 2700,
          ema200: 2800,
          prevEma50: 2850,
          ema20: 2680,
          prevEma20: 2900,
          prevEma50: 2850,
          price: 2600,
          support: 2650,
          resistance: 3000,
          priceTo52wHigh: 0.04,
          changePercent: -3,
          closingStrength: 15,
          momentum: 20,
          volumeRatio: 1,
          atrPct: 1,
          trendScore: -5,
          prevTrendScore: -5,
        })
      );
      const kinds = new Set(decisions.map((d) => d.kind));
      expect(kinds.has("rsi_oversold")).toBe(true);
      expect(kinds.has("macd_bearish_cross")).toBe(true);
      expect(kinds.has("death_cross")).toBe(true);
      expect(kinds.has("support_broken")).toBe(true);
      expect(kinds.has("week_52_low")).toBe(true);
      expect(kinds.has("gap_down")).toBe(true);
      expect(kinds.has("momentum_weakness")).toBe(true);
    });

    it("returns No Technical Alerts empty state", () => {
      const batch = generateTechnicalAlerts({ symbols: [], now: NOW });
      expect(batch.emptyMessage).toBe(SIGNAL_ALERT_EMPTY.noTechnical);
    });
  });

  describe("Fundamental alerts", () => {
    it("generates growth / margin / holdings kinds", () => {
      expect(FUNDAMENTAL_ALERT_KINDS.length).toBe(18);
      const batch = generateFundamentalAlerts({ symbols: [fund()], now: NOW });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("pe_improved")).toBe(true);
      expect(kinds.has("pe_overvalued")).toBe(true);
      expect(kinds.has("revenue_growth")).toBe(true);
      expect(kinds.has("eps_growth")).toBe(true);
      expect(kinds.has("margin_expansion")).toBe(true);
      expect(kinds.has("roe_improved")).toBe(true);
      expect(kinds.has("roce_improved")).toBe(true);
      expect(kinds.has("debt_reduced")).toBe(true);
      expect(kinds.has("cash_flow_improved")).toBe(true);
      expect(kinds.has("promoter_holding_increased")).toBe(true);
      expect(kinds.has("institutional_holding_increased")).toBe(true);
    });

    it("detects decline / compression / debt increase", () => {
      const decisions = detectFundamentalSignals(
        fund({
          pe: 20,
          prevPe: 20,
          revenueGrowth: -8,
          epsGrowth: -10,
          operatingMargin: 20,
          prevOperatingMargin: 25,
          debtToEquity: 1.5,
          prevDebtToEquity: 1.0,
          freeCashFlow: 5000,
          prevFreeCashFlow: 9000,
          promoterChangeQoQ: -1,
          institutionalChangeQoQ: -0.8,
          roe: 30,
          prevRoe: 30,
          roce: 30,
          prevRoce: 30,
        })
      );
      const kinds = new Set(decisions.map((d) => d.kind));
      expect(kinds.has("revenue_decline")).toBe(true);
      expect(kinds.has("eps_decline")).toBe(true);
      expect(kinds.has("margin_compression")).toBe(true);
      expect(kinds.has("debt_increased")).toBe(true);
      expect(kinds.has("cash_flow_weakening")).toBe(true);
      expect(kinds.has("promoter_holding_reduced")).toBe(true);
      expect(kinds.has("institutional_holding_reduced")).toBe(true);
    });

    it("returns No Fundamental Alerts empty state", () => {
      expect(
        generateFundamentalAlerts({ symbols: [], now: NOW }).emptyMessage
      ).toBe(SIGNAL_ALERT_EMPTY.noFundamental);
    });
  });

  describe("Market & sector alerts", () => {
    it("generates market trend / VIX / breadth alerts", () => {
      expect(MARKET_ALERT_KINDS.length).toBe(11);
      const batch = generateMarketAlerts({ markets: [market()], now: NOW });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("market_trend_changed")).toBe(true);
      expect(kinds.has("sector_rotation")).toBe(true);
      expect(kinds.has("index_breakout")).toBe(true);
      expect(kinds.has("high_volatility")).toBe(true);
      expect(kinds.has("vix_spike")).toBe(true);
      expect(kinds.has("breadth_improvement")).toBe(true);
      expect(kinds.has("liquidity_increase")).toBe(true);
    });

    it("detects market weakness paths", () => {
      const decisions = detectMarketSignals(
        market({
          marketTrend: "Bearish",
          prevMarketTrend: "Bullish",
          indexChangePercent: -1.8,
          indiaVix: 12,
          indiaVixChange: 0,
          volatility: 8,
          breadthScore: 30,
          prevBreadthScore: 60,
          advances: 400,
          declines: 1400,
          liquidityScore: 40,
          prevLiquidityScore: 80,
          rotatingSector: null,
        })
      );
      const kinds = new Set(decisions.map((d) => d.kind));
      expect(kinds.has("index_breakdown")).toBe(true);
      expect(kinds.has("low_volatility")).toBe(true);
      expect(kinds.has("breadth_weakness")).toBe(true);
      expect(kinds.has("liquidity_decline")).toBe(true);
    });

    it("generates sector leadership / recovery / outperformance", () => {
      expect(SECTOR_ALERT_KINDS.length).toBe(7);
      const batch = generateSectorAlerts({ sectors: [sector()], now: NOW });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("sector_leadership")).toBe(true);
      expect(kinds.has("sector_momentum")).toBe(true);
      expect(kinds.has("sector_recovery")).toBe(true);
      expect(kinds.has("sector_outperformance")).toBe(true);
    });

    it("detects sector weakness / underperformance", () => {
      const decisions = detectSectorSignals(
        sector({
          changePercent: -2.5,
          prevChangePercent: 1.2,
          momentum: 40,
          marketChangePercent: 1,
          relativeStrength: 30,
          breadth: 30,
        })
      );
      const kinds = new Set(decisions.map((d) => d.kind));
      expect(kinds.has("sector_weakness")).toBe(true);
      expect(kinds.has("sector_breakdown")).toBe(true);
      expect(kinds.has("sector_underperformance")).toBe(true);
    });

    it("returns empty states for market and sector", () => {
      expect(generateMarketAlerts({ markets: [], now: NOW }).emptyMessage).toBe(
        SIGNAL_ALERT_EMPTY.noMarket
      );
      expect(generateSectorAlerts({ sectors: [], now: NOW }).emptyMessage).toBe(
        SIGNAL_ALERT_EMPTY.noSector
      );
    });
  });

  describe("Scoring & presentation", () => {
    it("scores alerts with multi-factor model", () => {
      const batch = generateTechnicalAlerts({
        symbols: [tech()],
        now: NOW,
      });
      const scored = scoreAlerts(batch.alerts);
      expect(scored.length).toBe(batch.alerts.length);
      expect(scored[0]!.rank).toBe(1);
      expect(scored[0]!.score).toBeGreaterThan(0);
      expect(scored[0]!.factors.aiConfidence).toBeGreaterThanOrEqual(0);
      expect(scored[0]!.factors.technicalStrength).toBeGreaterThan(0);
    });

    it("never exposes nullish signal card fields", () => {
      const batch = generateTechnicalAlerts({
        symbols: [tech({ company: "", sector: null })],
        now: NOW,
      });
      for (const card of batch.signalCards) {
        expect(card.signal).toBeTruthy();
        expect(card.summary).toBeTruthy();
        expect(card.score).not.toMatch(/null|undefined|NaN/i);
        expect(card.affectedSymbol).toBeTruthy();
        expect(card.confidence).toBeTruthy();
      }
    });

    it("exposes public APIs", () => {
      expect(typeof generateTechnicalAlerts).toBe("function");
      expect(typeof generateFundamentalAlerts).toBe("function");
      expect(typeof generateMarketAlerts).toBe("function");
      expect(typeof generateSectorAlerts).toBe("function");
      expect(typeof scoreAlerts).toBe("function");
    });
  });
});
