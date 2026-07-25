/**
 * Macro Economic Intelligence catalog (Sprint 10D.3).
 * Realistic NSE / RBI / MoSPI / Fed / ECB sample data — never hardcoded in UI.
 */

import type { EventIntelligenceEvent, EventType, MarketDirection } from "@/types/event";
import type {
  MacroAiPlaceholder,
  MacroDetail,
  MacroFrequency,
  MacroRegion,
  MacroTheme,
  MarketImpact,
  SectorImpact,
  VolatilityLevel,
} from "@/types/macro";
import { addDays } from "@/src/core/events/EventFilters";
import {
  buildEconomicIndicator,
  buildHistoricalReadings,
  type IndicatorSpec,
} from "@/src/core/events/repositories/economicIndicatorRepository";
import { buildHistoricalMacroReaction } from "@/src/core/events/repositories/historicalMacroRepository";
import {
  resolveEventStatus,
  stamp,
  tz,
} from "@/src/core/events/repositories/repoUtils";

function aiPlaceholder(topic: string): MacroAiPlaceholder {
  return {
    summary: `AI summary for ${topic} will appear here in a future sprint.`,
    bullCase: "Bull-case interpretation pending AI Macro module.",
    bearCase: "Bear-case interpretation pending AI Macro module.",
    baseCase: "Base-case path pending AI Macro module.",
    keyRisks: [
      "Data surprise vs consensus",
      "Policy communication tone",
      "Cross-asset spillover",
    ],
    marketExpectations:
      "Market-expectation synthesis pending AI Macro module.",
  };
}

function impact(
  direction: MarketDirection,
  volatility: VolatilityLevel,
  indices: MarketImpact["affectedIndices"],
  narrative: string
): MarketImpact {
  return { direction, volatility, affectedIndices: indices, narrative };
}

function sectors(
  positive: string[],
  negative: string[],
  sensitivityNote: string
): SectorImpact {
  return { positive, negative, sensitivityNote };
}

interface MacroRowInput {
  id: string;
  title: string;
  eventType: EventType;
  offset: number;
  time: string | null;
  importance: EventIntelligenceEvent["importance"];
  description: string;
  expectedImpact: string;
  marketDirection: MarketDirection;
  affectedSectors: string[];
  tags: string[];
  industry: string;
  country: string;
  authority: string;
  theme: MacroTheme;
  region: MacroRegion;
  frequency: MacroFrequency;
  indicator: IndicatorSpec;
  indicatorSeed?: number;
  sectorImpact: SectorImpact;
  marketImpact: MarketImpact;
  withHistoricalReaction?: boolean;
  reactionLabel?: string;
  reactionSeed?: number;
  live?: boolean;
}

function toMacroEvent(today: string, row: MacroRowInput): EventIntelligenceEvent {
  const date = addDays(today, row.offset);
  const indicator = buildEconomicIndicator(row.indicator);
  const historicalReadings = buildHistoricalReadings(
    { ...row.indicator, historyAnchorDate: date },
    row.indicatorSeed ?? 2
  );

  const macroDetail: MacroDetail = {
    country: row.country,
    authority: row.authority,
    theme: row.theme,
    region: row.region,
    frequency: row.frequency,
    indicator,
    historicalReadings,
    sectorImpact: row.sectorImpact,
    marketImpact: row.marketImpact,
    historicalReaction: row.withHistoricalReaction
      ? buildHistoricalMacroReaction({
          seriesLabel: row.reactionLabel ?? row.title,
          anchorDate: date,
          seed: row.reactionSeed ?? 4,
        })
      : null,
    aiPlaceholder: aiPlaceholder(row.title),
  };

  return {
    id: row.id,
    title: row.title,
    company: null,
    ticker: null,
    sector: "Macro",
    industry: row.industry,
    exchange: "MACRO",
    eventType: row.eventType,
    date,
    time: row.time,
    timezone: tz(),
    status: resolveEventStatus(date, today, { live: row.live }),
    importance: row.importance,
    description: row.description,
    expectedImpact: row.expectedImpact,
    marketDirection: row.marketDirection,
    affectedStocks: [],
    affectedSectors: row.affectedSectors,
    historicalAvailable: true,
    tags: row.tags,
    marketCap: "unknown",
    macroDetail,
    ...stamp(addDays(today, Math.min(row.offset, -1))),
  };
}

/** Full macro catalog relative to `today`. */
export function listMacroEvents(today: string): EventIntelligenceEvent[] {
  const rows: MacroRowInput[] = [
    /* ── Central Banks ── */
    {
      id: "macro-rbi-mpc",
      title: "RBI Monetary Policy Decision",
      eventType: "rbi_policy",
      offset: 0,
      time: "10:00",
      importance: "critical",
      description:
        "Reserve Bank of India MPC announces the policy repo rate and stance.",
      expectedImpact: "High volatility across rates-sensitive sectors",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "NBFCs", "Realty", "Auto"],
      tags: ["rbi", "mpc", "rates", "india"],
      industry: "Monetary Policy",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "central_bank",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "RBI",
        previous: 6.5,
        forecast: 6.25,
        consensus: 6.25,
        actual: null,
        historicalAverage: 6.4,
        historicalHigh: 6.5,
        historicalLow: 4.0,
      },
      sectorImpact: sectors(
        ["Banks", "NBFC", "Real Estate", "Auto"],
        ["Private Banks (Margins)", "Insurance"],
        "Rate-cut bias typically supports credit growth; NIMs may compress for private banks."
      ),
      marketImpact: impact(
        "bullish",
        "high",
        ["NIFTY", "BANKNIFTY", "FINNIFTY"],
        "A 25 bps cut would be read as growth-supportive; hawkish hold lifts bond yields."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 RBI Meetings",
      reactionSeed: 7,
      live: true,
    },
    {
      id: "macro-rbi-minutes",
      title: "RBI MPC Minutes",
      eventType: "rbi_minutes",
      offset: 14,
      time: "17:00",
      importance: "high",
      description:
        "Publication of Monetary Policy Committee voting record and rationale.",
      expectedImpact: "Rates path expectations may reprice",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "NBFCs"],
      tags: ["rbi", "minutes", "india"],
      industry: "Monetary Policy",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "central_bank",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "votes",
        dataSource: "RBI",
        previous: 4,
        forecast: 4,
        consensus: 4,
        actual: null,
      },
      sectorImpact: sectors(
        ["Banks", "NBFC"],
        ["Duration-sensitive insurers"],
        "Dovish minutes support financials; hawkish dissent lifts yields."
      ),
      marketImpact: impact(
        "neutral",
        "medium",
        ["NIFTY", "BANKNIFTY"],
        "Minutes refine the policy path more than the spot rate itself."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 RBI Minutes Releases",
    },
    {
      id: "macro-rbi-governor",
      title: "RBI Governor Speech",
      eventType: "rbi_governor_speech",
      offset: 9,
      time: "11:30",
      importance: "high",
      description:
        "RBI Governor remarks on growth, inflation and financial stability.",
      expectedImpact: "INR and G-Sec sensitivity to tone",
      marketDirection: "unknown",
      affectedSectors: ["Banks", "Financials"],
      tags: ["rbi", "speech", "india"],
      industry: "Monetary Policy",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "central_bank",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "index",
        dataSource: "RBI",
        previous: 50,
        forecast: 50,
        consensus: 50,
        actual: null,
      },
      sectorImpact: sectors(
        ["Banks", "NBFC"],
        ["High-beta cyclicals on hawkish tone"],
        "Speech tone often moves front-end rates more than spot equity."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["NIFTY", "BANKNIFTY", "FINNIFTY"],
        "Watch guidance on liquidity and inflation tolerance."
      ),
    },
    {
      id: "macro-fed",
      title: "FOMC Rate Decision",
      eventType: "fed_meeting",
      offset: 6,
      time: "23:30",
      importance: "critical",
      description:
        "US Federal Reserve interest rate decision and chair press conference.",
      expectedImpact: "Global risk assets, USDINR and IT flows",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Metals", "Banks"],
      tags: ["fed", "fomc", "global", "us"],
      industry: "Monetary Policy",
      country: "United States",
      authority: "Federal Reserve",
      theme: "central_bank",
      region: "us",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "Federal Reserve",
        previous: 4.5,
        forecast: 4.25,
        consensus: 4.25,
        actual: null,
        historicalHigh: 5.5,
        historicalLow: 0.25,
      },
      sectorImpact: sectors(
        ["IT (on dovish cut)", "Metals"],
        ["Exporters on USD strength", "Rate-sensitive US ADRs"],
        "Dovish Fed supports EM risk; hawkish hold pressures INR and IT."
      ),
      marketImpact: impact(
        "mixed",
        "high",
        ["NIFTY", "BANKNIFTY", "MIDCAP"],
        "India equities react via USDINR, FII flows and global beta."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 FOMC Meetings",
      reactionSeed: 11,
    },
    {
      id: "macro-fomc-minutes",
      title: "FOMC Minutes",
      eventType: "fomc_minutes",
      offset: 20,
      time: "23:30",
      importance: "high",
      description: "Detailed minutes of the prior Federal Open Market Committee meeting.",
      expectedImpact: "USD and EM risk appetite",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Financials"],
      tags: ["fomc", "minutes", "us"],
      industry: "Monetary Policy",
      country: "United States",
      authority: "Federal Reserve",
      theme: "central_bank",
      region: "us",
      frequency: "adhoc",
      indicator: {
        unit: "index",
        dataSource: "Federal Reserve",
        previous: 50,
        forecast: 50,
        consensus: 50,
      },
      sectorImpact: sectors(
        ["IT on dovish lean"],
        ["Banks on higher-for-longer"],
        "Minutes reshape terminal-rate odds."
      ),
      marketImpact: impact(
        "neutral",
        "medium",
        ["NIFTY"],
        "Secondary catalyst after the live decision."
      ),
    },
    {
      id: "macro-ecb",
      title: "ECB Policy Decision",
      eventType: "ecb_policy",
      offset: 11,
      time: "18:15",
      importance: "high",
      description: "European Central Bank deposit facility rate and guidance.",
      expectedImpact: "EUR, global rates and EU-linked exporters",
      marketDirection: "mixed",
      affectedSectors: ["Auto", "Pharma", "Metals"],
      tags: ["ecb", "eurozone", "global"],
      industry: "Monetary Policy",
      country: "Eurozone",
      authority: "European Central Bank",
      theme: "central_bank",
      region: "eurozone",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "ECB",
        previous: 2.5,
        forecast: 2.25,
        consensus: 2.25,
      },
      sectorImpact: sectors(
        ["Auto exporters", "Pharma"],
        ["Import-heavy consumer on EUR strength"],
        "ECB cuts ease global financial conditions modestly for India."
      ),
      marketImpact: impact(
        "neutral",
        "medium",
        ["NIFTY", "MIDCAP"],
        "Indirect via EURUSD and global duration."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 ECB Decisions",
    },
    {
      id: "macro-boj",
      title: "BOJ Policy Decision",
      eventType: "boj_policy",
      offset: 16,
      time: "08:00",
      importance: "medium",
      description: "Bank of Japan policy rate and yield-curve control update.",
      expectedImpact: "JPY carry and Asia risk sentiment",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Financials"],
      tags: ["boj", "japan", "global"],
      industry: "Monetary Policy",
      country: "Japan",
      authority: "Bank of Japan",
      theme: "central_bank",
      region: "japan",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "Bank of Japan",
        previous: 0.5,
        forecast: 0.5,
        consensus: 0.5,
      },
      sectorImpact: sectors(
        ["Global financials on yen unwind"],
        ["Carry-sensitive EM beta"],
        "Surprise tightening can tighten global USD liquidity."
      ),
      marketImpact: impact(
        "neutral",
        "medium",
        ["NIFTY"],
        "Spillover mainly through FX and risk appetite."
      ),
    },

    /* ── Inflation ── */
    {
      id: "macro-cpi",
      title: "India CPI Inflation Print",
      eventType: "cpi",
      offset: 3,
      time: "17:30",
      importance: "high",
      description: "Monthly consumer price inflation release (MoSPI).",
      expectedImpact: "Rates and INR sensitivity; FMCG input costs",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "FMCG", "Consumer Durables"],
      tags: ["cpi", "inflation", "india"],
      industry: "Inflation",
      country: "India",
      authority: "Ministry of Statistics and Programme Implementation",
      theme: "inflation",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "% YoY",
        dataSource: "MoSPI",
        previous: 3.2,
        forecast: 3.4,
        consensus: 3.35,
        actual: null,
        historicalAverage: 4.8,
        historicalHigh: 7.8,
        historicalLow: 2.1,
      },
      sectorImpact: sectors(
        ["FMCG (on soft print)", "Consumer Durables"],
        ["Banks (on hot print → hawkish RBI)", "Discretionary retail"],
        "Soft CPI supports rate-cut odds; hot CPI pressures duration."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["NIFTY", "BANKNIFTY"],
        "Street watches food and core sequentially."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 CPI Prints",
      reactionSeed: 5,
    },
    {
      id: "macro-core-cpi",
      title: "India Core CPI",
      eventType: "core_cpi",
      offset: 3,
      time: "17:30",
      importance: "high",
      description: "Core CPI (ex food & fuel) — underlying inflation pressure.",
      expectedImpact: "Policy-relevant for RBI reaction function",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "NBFC"],
      tags: ["core-cpi", "inflation", "india"],
      industry: "Inflation",
      country: "India",
      authority: "MoSPI",
      theme: "inflation",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "% YoY",
        dataSource: "MoSPI",
        previous: 3.6,
        forecast: 3.7,
        consensus: 3.65,
      },
      sectorImpact: sectors(
        ["Rate-sensitive sectors on soft core"],
        ["Banks on sticky core"],
        "Core stickiness delays easing cycles."
      ),
      marketImpact: impact(
        "neutral",
        "medium",
        ["NIFTY", "BANKNIFTY"],
        "Often priced alongside headline CPI."
      ),
    },
    {
      id: "macro-wpi",
      title: "India WPI Inflation",
      eventType: "wpi",
      offset: 5,
      time: "12:00",
      importance: "medium",
      description: "Wholesale Price Index inflation (Office of the Economic Adviser).",
      expectedImpact: "Corporate input-cost cue",
      marketDirection: "neutral",
      affectedSectors: ["Metals", "Chemicals", "FMCG"],
      tags: ["wpi", "inflation", "india"],
      industry: "Inflation",
      country: "India",
      authority: "Office of the Economic Adviser",
      theme: "inflation",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "% YoY",
        dataSource: "DPIIT / OEA",
        previous: 2.1,
        forecast: 2.4,
        consensus: 2.3,
      },
      sectorImpact: sectors(
        ["Downstream manufacturers on soft WPI"],
        ["Commodity producers on weak pricing"],
        "WPI leads corporate margin conversations."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["NIFTY", "MIDCAP"],
        "Secondary to CPI for policy, relevant for margins."
      ),
    },
    {
      id: "macro-ppi",
      title: "US PPI",
      eventType: "ppi",
      offset: 8,
      time: "18:00",
      importance: "medium",
      description: "US Producer Price Index — upstream inflation pressure.",
      expectedImpact: "Fed path and USD cue",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Metals"],
      tags: ["ppi", "inflation", "us"],
      industry: "Inflation",
      country: "United States",
      authority: "Bureau of Labor Statistics",
      theme: "inflation",
      region: "us",
      frequency: "monthly",
      indicator: {
        unit: "% YoY",
        dataSource: "BLS",
        previous: 2.6,
        forecast: 2.7,
        consensus: 2.65,
      },
      sectorImpact: sectors(
        ["IT on soft PPI / dovish Fed odds"],
        ["Metals on hot pipeline inflation"],
        "PPI surprises feed into Fed funds futures."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["NIFTY"],
        "India reaction via USDINR and risk beta."
      ),
    },

    /* ── Growth ── */
    {
      id: "macro-gdp",
      title: "India GDP Advance Estimates",
      eventType: "gdp",
      offset: 13,
      time: "17:30",
      importance: "high",
      description: "Quarterly GDP advance estimates from MoSPI.",
      expectedImpact: "Broad market sentiment and cyclical sector cue",
      marketDirection: "unknown",
      affectedSectors: ["Capital Goods", "Infrastructure", "Industrials"],
      tags: ["gdp", "growth", "india"],
      industry: "Growth",
      country: "India",
      authority: "MoSPI",
      theme: "growth",
      region: "india",
      frequency: "quarterly",
      indicator: {
        unit: "% YoY",
        dataSource: "MoSPI",
        previous: 7.4,
        forecast: 7.1,
        consensus: 7.0,
        historicalAverage: 6.8,
        historicalHigh: 13.5,
        historicalLow: -23.9,
      },
      sectorImpact: sectors(
        ["Capital Goods", "Infrastructure", "Industrials"],
        ["Defensives on strong beat (rotation)"],
        "Strong GDP supports cyclicals and midcaps."
      ),
      marketImpact: impact(
        "bullish",
        "medium",
        ["NIFTY", "MIDCAP", "SMALLCAP"],
        "Beat typically lifts cyclical beta; miss raises soft-landing doubts."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 GDP Releases",
      reactionSeed: 9,
    },
    {
      id: "macro-qgdp",
      title: "India Quarterly GDP (Provisional)",
      eventType: "quarterly_gdp",
      offset: -20,
      time: "17:30",
      importance: "high",
      description: "Provisional quarterly GDP with expenditure breakdown.",
      expectedImpact: "Revision risk to growth narrative",
      marketDirection: "neutral",
      affectedSectors: ["Industrials", "Banks"],
      tags: ["gdp", "quarterly", "india"],
      industry: "Growth",
      country: "India",
      authority: "MoSPI",
      theme: "growth",
      region: "india",
      frequency: "quarterly",
      indicator: {
        unit: "% YoY",
        dataSource: "MoSPI",
        previous: 7.4,
        forecast: 7.4,
        consensus: 7.4,
        actual: 7.6,
        revision: 0.2,
      },
      sectorImpact: sectors(
        ["Capital Goods", "Infrastructure"],
        ["Quality defensives on hot growth (rotation)"],
        "Expenditure mix matters as much as headline."
      ),
      marketImpact: impact(
        "bullish",
        "low",
        ["NIFTY", "MIDCAP"],
        "Already partially digested; watch GFCF vs consumption."
      ),
    },
    {
      id: "macro-iip",
      title: "India IIP",
      eventType: "iip",
      offset: 7,
      time: "17:30",
      importance: "medium",
      description: "Index of Industrial Production monthly print.",
      expectedImpact: "Industrial and capital-goods cue",
      marketDirection: "neutral",
      affectedSectors: ["Industrials", "Capital Goods", "Metals"],
      tags: ["iip", "growth", "india"],
      industry: "Growth",
      country: "India",
      authority: "MoSPI",
      theme: "growth",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "% YoY",
        dataSource: "MoSPI",
        previous: 4.8,
        forecast: 5.1,
        consensus: 5.0,
      },
      sectorImpact: sectors(
        ["Capital Goods", "Industrials", "Metals"],
        ["Defensives on strong industrial beat"],
        "Manufacturing vs mining split drives sector rotation."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["NIFTY", "MIDCAP"],
        "Usually a secondary growth confirmation print."
      ),
    },
    {
      id: "macro-pmi-mfg",
      title: "India Manufacturing PMI",
      eventType: "pmi",
      offset: -1,
      time: "10:30",
      importance: "medium",
      description: "S&P Global India Manufacturing PMI flash/final.",
      expectedImpact: "Cyclical sector cue",
      marketDirection: "neutral",
      affectedSectors: ["Industrials", "Metals"],
      tags: ["pmi", "manufacturing", "india"],
      industry: "Manufacturing",
      country: "India",
      authority: "S&P Global",
      theme: "growth",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "index",
        dataSource: "S&P Global",
        previous: 58.1,
        forecast: 57.8,
        consensus: 57.9,
        actual: 58.4,
      },
      sectorImpact: sectors(
        ["Industrials", "Metals", "Capital Goods"],
        ["Defensive staples on strong expansion"],
        "Above 50 signals expansion; new orders drive equity beta."
      ),
      marketImpact: impact(
        "bullish",
        "low",
        ["NIFTY", "MIDCAP"],
        "Soft confirmation print unless a large miss."
      ),
    },
    {
      id: "macro-pmi-svc",
      title: "India Services PMI",
      eventType: "pmi_services",
      offset: 2,
      time: "10:30",
      importance: "medium",
      description: "S&P Global India Services PMI.",
      expectedImpact: "Domestic demand and services sector cue",
      marketDirection: "neutral",
      affectedSectors: ["Consumer", "Banks", "Hospitality"],
      tags: ["pmi", "services", "india"],
      industry: "Services",
      country: "India",
      authority: "S&P Global",
      theme: "growth",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "index",
        dataSource: "S&P Global",
        previous: 60.2,
        forecast: 59.5,
        consensus: 59.6,
      },
      sectorImpact: sectors(
        ["Consumer Discretionary", "Banks", "Hospitality"],
        ["Exporters on strong domestic-only impulse"],
        "Services PMI tracks urban demand resilience."
      ),
      marketImpact: impact(
        "bullish",
        "low",
        ["NIFTY", "MIDCAP"],
        "Supportive for domestic consumption narratives."
      ),
    },

    /* ── Employment ── */
    {
      id: "macro-nfp",
      title: "US Non-Farm Payrolls",
      eventType: "nfp",
      offset: 4,
      time: "18:00",
      importance: "critical",
      description: "US non-farm payrolls, unemployment and wage growth.",
      expectedImpact: "Fed path, USD and global risk assets",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Banks", "Metals"],
      tags: ["nfp", "employment", "us"],
      industry: "Employment",
      country: "United States",
      authority: "Bureau of Labor Statistics",
      theme: "employment",
      region: "us",
      frequency: "monthly",
      indicator: {
        unit: "k jobs",
        dataSource: "BLS",
        previous: 180,
        forecast: 165,
        consensus: 170,
        actual: null,
        historicalAverage: 175,
        historicalHigh: 450,
        historicalLow: -20,
      },
      sectorImpact: sectors(
        ["IT on soft NFP / cut odds"],
        ["Rate-sensitive names on hot jobs + wages"],
        "Wage growth often matters more than headline jobs for Fed."
      ),
      marketImpact: impact(
        "mixed",
        "high",
        ["NIFTY", "BANKNIFTY"],
        "Classic high-volatility global macro print for India via USDINR."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 NFP Prints",
      reactionSeed: 13,
    },
    {
      id: "macro-ue-rate",
      title: "US Unemployment Rate",
      eventType: "unemployment_rate",
      offset: 4,
      time: "18:00",
      importance: "high",
      description: "US civilian unemployment rate (released with NFP).",
      expectedImpact: "Fed reaction function",
      marketDirection: "mixed",
      affectedSectors: ["IT", "Financials"],
      tags: ["unemployment", "us", "employment"],
      industry: "Employment",
      country: "United States",
      authority: "Bureau of Labor Statistics",
      theme: "employment",
      region: "us",
      frequency: "monthly",
      indicator: {
        unit: "%",
        dataSource: "BLS",
        previous: 4.1,
        forecast: 4.2,
        consensus: 4.2,
      },
      sectorImpact: sectors(
        ["Risk assets on rising UE (dovish)"],
        ["Cyclicals on sharp labour deterioration"],
        "Sahm-rule thresholds amplify equity reaction."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["NIFTY"],
        "Priced jointly with NFP and average hourly earnings."
      ),
    },

    /* ── Trade ── */
    {
      id: "macro-trade",
      title: "India Trade Balance",
      eventType: "trade_balance",
      offset: 10,
      time: "17:00",
      importance: "medium",
      description: "Merchandise trade deficit / surplus (Commerce Ministry).",
      expectedImpact: "INR and oil-import narrative",
      marketDirection: "neutral",
      affectedSectors: ["Oil & Gas", "Metals", "Exporters"],
      tags: ["trade", "india"],
      industry: "Trade",
      country: "India",
      authority: "Ministry of Commerce & Industry",
      theme: "trade",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "USD bn",
        dataSource: "Commerce Ministry",
        previous: -20.5,
        forecast: -21.0,
        consensus: -20.8,
      },
      sectorImpact: sectors(
        ["Exporters on narrower deficit"],
        ["Oil marketing cos on wider deficit / crude spike"],
        "Gold and oil imports drive monthly swings."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["NIFTY"],
        "INR traders watch more closely than equity beta."
      ),
    },
    {
      id: "macro-cad",
      title: "India Current Account",
      eventType: "current_account",
      offset: 18,
      time: "17:30",
      importance: "medium",
      description: "Current account balance (RBI balance of payments).",
      expectedImpact: "External vulnerability cue for INR",
      marketDirection: "neutral",
      affectedSectors: ["Banks", "Oil & Gas"],
      tags: ["cad", "trade", "india"],
      industry: "Trade",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "trade",
      region: "india",
      frequency: "quarterly",
      indicator: {
        unit: "% of GDP",
        dataSource: "RBI",
        previous: -1.1,
        forecast: -1.2,
        consensus: -1.15,
      },
      sectorImpact: sectors(
        ["Financials on manageable CAD"],
        ["Import-heavy names on CAD blowout"],
        "Services surplus often cushions merchandise deficit."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["NIFTY"],
        "Macro stability print; limited intraday equity impact."
      ),
    },
    {
      id: "macro-fx-reserves",
      title: "India Forex Reserves",
      eventType: "forex_reserves",
      offset: 1,
      time: "17:00",
      importance: "low",
      description: "Weekly foreign exchange reserves update (RBI).",
      expectedImpact: "INR resilience narrative",
      marketDirection: "neutral",
      affectedSectors: ["Banks"],
      tags: ["forex", "reserves", "india"],
      industry: "Trade",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "trade",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "USD bn",
        dataSource: "RBI",
        previous: 698,
        forecast: 700,
        consensus: 699,
        actual: null,
      },
      sectorImpact: sectors(
        ["Banks", "Financials"],
        [],
        "Rising reserves support INR defence capacity."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["NIFTY"],
        "Low equity volatility; FX desks monitor."
      ),
    },

    /* ── Liquidity ── */
    {
      id: "macro-repo",
      title: "Policy Repo Rate",
      eventType: "repo_rate",
      offset: 0,
      time: "10:00",
      importance: "critical",
      description: "Standalone policy repo rate as announced with MPC.",
      expectedImpact: "Banking NIMs, credit growth, realty",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "NBFC", "Realty"],
      tags: ["repo", "liquidity", "rbi", "india"],
      industry: "Liquidity",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "liquidity",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "RBI",
        previous: 6.5,
        forecast: 6.25,
        consensus: 6.25,
      },
      sectorImpact: sectors(
        ["Banks", "NBFC", "Real Estate", "Auto"],
        ["Private Banks (Margins)", "Insurance"],
        "Repo cut expands credit impulse; compresses NIMs with lag."
      ),
      marketImpact: impact(
        "bullish",
        "high",
        ["NIFTY", "BANKNIFTY", "FINNIFTY"],
        "Primary India rates catalyst."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 Repo Decisions",
    },
    {
      id: "macro-rev-repo",
      title: "Reverse Repo Rate",
      eventType: "reverse_repo",
      offset: 0,
      time: "10:00",
      importance: "medium",
      description: "Reverse repo / SDF corridor update with MPC.",
      expectedImpact: "Banking system liquidity cue",
      marketDirection: "neutral",
      affectedSectors: ["Banks"],
      tags: ["reverse-repo", "liquidity", "india"],
      industry: "Liquidity",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "liquidity",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "RBI",
        previous: 3.35,
        forecast: 3.35,
        consensus: 3.35,
      },
      sectorImpact: sectors(
        ["Banks on ample corridor"],
        [],
        "Corridor width guides overnight money-market rates."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["BANKNIFTY", "FINNIFTY"],
        "Usually overshadowed by repo decision."
      ),
    },
    {
      id: "macro-crr",
      title: "Cash Reserve Ratio (CRR)",
      eventType: "crr",
      offset: 22,
      time: "10:00",
      importance: "high",
      description: "RBI CRR decision affecting banking system liquidity.",
      expectedImpact: "Loanable funds and bank NIMs",
      marketDirection: "mixed",
      affectedSectors: ["Banks", "NBFC"],
      tags: ["crr", "liquidity", "india"],
      industry: "Liquidity",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "liquidity",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "RBI",
        previous: 4.0,
        forecast: 4.0,
        consensus: 4.0,
      },
      sectorImpact: sectors(
        ["Banks on CRR cut"],
        ["Banks on CRR hike"],
        "CRR changes are a blunt liquidity tool."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["BANKNIFTY", "FINNIFTY"],
        "Surprise CRR moves reprice financials quickly."
      ),
    },
    {
      id: "macro-slr",
      title: "Statutory Liquidity Ratio (SLR)",
      eventType: "slr",
      offset: 22,
      time: "10:00",
      importance: "medium",
      description: "RBI SLR decision — G-Sec holding requirement for banks.",
      expectedImpact: "Bank treasury and G-Sec demand",
      marketDirection: "neutral",
      affectedSectors: ["Banks"],
      tags: ["slr", "liquidity", "india"],
      industry: "Liquidity",
      country: "India",
      authority: "Reserve Bank of India",
      theme: "liquidity",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "%",
        dataSource: "RBI",
        previous: 18.0,
        forecast: 18.0,
        consensus: 18.0,
      },
      sectorImpact: sectors(
        ["Banks on SLR cut (loanable funds)"],
        ["G-Sec demand on SLR hike"],
        "Rarely changed; high signal when adjusted."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["BANKNIFTY"],
        "Bond desk catalyst more than equity beta."
      ),
    },

    /* ── Others ── */
    {
      id: "macro-budget",
      title: "Union Fiscal Budget",
      eventType: "fiscal_budget",
      offset: 25,
      time: "11:00",
      importance: "critical",
      description: "Union Budget presentation — fiscal deficit, tax and capex.",
      expectedImpact: "Sector rotation across infra, defence, consumption, tax",
      marketDirection: "mixed",
      affectedSectors: ["Infrastructure", "Defence", "PSU Banks", "FMCG"],
      tags: ["budget", "fiscal", "india"],
      industry: "Fiscal",
      country: "India",
      authority: "Ministry of Finance",
      theme: "other",
      region: "india",
      frequency: "annual",
      indicator: {
        unit: "% of GDP (deficit)",
        dataSource: "Ministry of Finance",
        previous: 4.9,
        forecast: 4.5,
        consensus: 4.5,
      },
      sectorImpact: sectors(
        ["Infrastructure", "Defence", "Capital Goods", "PSU Banks"],
        ["High-tax consumption niches", "Stressed PSUs on subsidy cuts"],
        "Capex vs populist mix drives the equity map."
      ),
      marketImpact: impact(
        "mixed",
        "high",
        ["NIFTY", "MIDCAP", "SMALLCAP", "BANKNIFTY"],
        "Highest single-day sector rotation event of the year."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 Budgets",
      reactionSeed: 15,
    },
    {
      id: "macro-gst",
      title: "GST Collection",
      eventType: "gst_collection",
      offset: -2,
      time: "12:00",
      importance: "medium",
      description: "Monthly GST collection print (Finance Ministry).",
      expectedImpact: "Formal economy and consumption cue",
      marketDirection: "neutral",
      affectedSectors: ["FMCG", "Consumer", "Banks"],
      tags: ["gst", "fiscal", "india"],
      industry: "Fiscal",
      country: "India",
      authority: "Ministry of Finance",
      theme: "other",
      region: "india",
      frequency: "monthly",
      indicator: {
        unit: "₹ lakh Cr",
        dataSource: "Ministry of Finance",
        previous: 1.86,
        forecast: 1.9,
        consensus: 1.88,
        actual: 1.92,
      },
      sectorImpact: sectors(
        ["FMCG", "Consumer Discretionary", "Banks"],
        [],
        "Strong GST prints support formal consumption narrative."
      ),
      marketImpact: impact(
        "bullish",
        "low",
        ["NIFTY", "MIDCAP"],
        "Soft confirmation; rarely a standalone mover."
      ),
    },
    {
      id: "macro-gsec",
      title: "Government Borrowing Calendar",
      eventType: "government_borrowing",
      offset: 12,
      time: "09:30",
      importance: "medium",
      description: "Weekly G-Sec / SDL auction calendar and notified amounts.",
      expectedImpact: "Bond yields and bank treasury P&L",
      marketDirection: "neutral",
      affectedSectors: ["Banks", "Insurance"],
      tags: ["gsec", "borrowing", "india"],
      industry: "Fiscal",
      country: "India",
      authority: "RBI / Ministry of Finance",
      theme: "other",
      region: "india",
      frequency: "adhoc",
      indicator: {
        unit: "₹ Cr",
        dataSource: "RBI",
        previous: 32000,
        forecast: 30000,
        consensus: 30000,
      },
      sectorImpact: sectors(
        ["Banks on lighter supply"],
        ["Insurance / duration on heavy supply"],
        "Supply shocks reprice the curve."
      ),
      marketImpact: impact(
        "neutral",
        "low",
        ["BANKNIFTY", "FINNIFTY"],
        "Bond-market first; equity second-order."
      ),
    },
    {
      id: "macro-oil-inv",
      title: "US Crude Oil Inventory",
      eventType: "oil_inventory",
      offset: 2,
      time: "20:00",
      importance: "medium",
      description: "EIA weekly crude oil inventory report.",
      expectedImpact: "Crude prices → India CAD and OMCs",
      marketDirection: "mixed",
      affectedSectors: ["Oil & Gas", "Aviation", "Paints"],
      tags: ["oil", "inventory", "global"],
      industry: "Energy",
      country: "United States",
      authority: "Energy Information Administration",
      theme: "other",
      region: "global",
      frequency: "adhoc",
      indicator: {
        unit: "mn barrels",
        dataSource: "EIA",
        previous: -2.1,
        forecast: -1.5,
        consensus: -1.4,
      },
      sectorImpact: sectors(
        ["OMCs on build / softer crude"],
        ["Upstream / refiners on large draw"],
        "Inventory surprises move Brent/WTI within minutes."
      ),
      marketImpact: impact(
        "mixed",
        "medium",
        ["NIFTY", "MIDCAP"],
        "India equities feel crude via OMCs, aviation and INR."
      ),
    },
    {
      id: "macro-crude",
      title: "Brent Crude Price Catalyst",
      eventType: "crude_prices",
      offset: -3,
      time: null,
      importance: "high",
      description:
        "Brent crude sustained move above key levels — India CAD and inflation cue.",
      expectedImpact: "OMCs, aviation, paints, INR",
      marketDirection: "bearish",
      affectedSectors: ["Oil & Gas", "Aviation", "Paints", "Tyres"],
      tags: ["crude", "oil", "global"],
      industry: "Energy",
      country: "Global",
      authority: "Market / ICE Brent",
      theme: "other",
      region: "global",
      frequency: "adhoc",
      indicator: {
        unit: "USD/bbl",
        dataSource: "ICE Brent",
        previous: 78,
        forecast: 80,
        consensus: 79,
        actual: 82,
      },
      sectorImpact: sectors(
        ["Upstream producers"],
        ["OMCs", "Aviation", "Paints", "Tyres"],
        "Higher crude raises input costs and CAD pressure."
      ),
      marketImpact: impact(
        "bearish",
        "medium",
        ["NIFTY", "MIDCAP"],
        "Sustained >$85 typically weighs on India risk premium."
      ),
    },
    {
      id: "macro-msci",
      title: "MSCI Semi-Annual Index Review",
      eventType: "msci_review",
      offset: 17,
      time: "22:00",
      importance: "critical",
      description: "MSCI announces inclusions, exclusions and weight changes.",
      expectedImpact: "Passive flow impact on reviewed names",
      marketDirection: "mixed",
      affectedSectors: ["All"],
      tags: ["msci", "rebalance", "flows", "global"],
      industry: "Index Rebalance",
      country: "Global",
      authority: "MSCI",
      theme: "other",
      region: "global",
      frequency: "adhoc",
      indicator: {
        unit: "names",
        dataSource: "MSCI",
        previous: 0,
        forecast: 2,
        consensus: 2,
      },
      sectorImpact: sectors(
        ["Included mid/large caps"],
        ["Excluded / down-weighted names"],
        "Passive flow asymmetry around effective date."
      ),
      marketImpact: impact(
        "mixed",
        "high",
        ["NIFTY", "MIDCAP", "SMALLCAP"],
        "Stock-specific volatility spikes into implementation."
      ),
      withHistoricalReaction: true,
      reactionLabel: "Last 8 MSCI Reviews",
    },
  ];

  return rows.map((row) => toMacroEvent(today, row));
}

/** @deprecated Prefer listMacroEvents — kept for Sprint 10D.2 import compatibility. */
export function listEconomicEvents(today: string): EventIntelligenceEvent[] {
  return listMacroEvents(today);
}

export const macroEventRepository = {
  list: listMacroEvents,
};

export const economicEventRepository = {
  list: listEconomicEvents,
};
