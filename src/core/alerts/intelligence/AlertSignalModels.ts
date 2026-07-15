/**
 * Alert signal models — Technical / Fundamental / Market / Sector (Sprint 9C.R4).
 */

import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";
import type { AlertDecision } from "./AlertDecisionEngine";
import { INTELLIGENCE_ALERT_EMPTY } from "./AlertPresentationModels";
import { buildEventDecision } from "./AlertInsightModels";

export const SIGNAL_ALERT_EMPTY = {
  noTechnical: INTELLIGENCE_ALERT_EMPTY.noTechnical,
  noFundamental: INTELLIGENCE_ALERT_EMPTY.noFundamental,
  noMarket: INTELLIGENCE_ALERT_EMPTY.noMarket,
  noSector: INTELLIGENCE_ALERT_EMPTY.noSector,
  awaitingAnalysis: INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis,
} as const;

export const TECHNICAL_ALERT_KINDS = [
  "rsi_overbought",
  "rsi_oversold",
  "macd_bullish_cross",
  "macd_bearish_cross",
  "golden_cross",
  "death_cross",
  "ema_cross",
  "volume_breakout",
  "price_breakout",
  "support_broken",
  "resistance_broken",
  "week_52_high",
  "week_52_low",
  "atr_expansion",
  "gap_up",
  "gap_down",
  "trend_reversal",
  "momentum_strength",
  "momentum_weakness",
] as const;

export type TechnicalAlertKind = (typeof TECHNICAL_ALERT_KINDS)[number];

export const TECHNICAL_KIND_LABELS: Record<TechnicalAlertKind, string> = {
  rsi_overbought: "RSI Overbought",
  rsi_oversold: "RSI Oversold",
  macd_bullish_cross: "MACD Bullish Cross",
  macd_bearish_cross: "MACD Bearish Cross",
  golden_cross: "Golden Cross",
  death_cross: "Death Cross",
  ema_cross: "EMA Cross",
  volume_breakout: "Volume Breakout",
  price_breakout: "Price Breakout",
  support_broken: "Support Broken",
  resistance_broken: "Resistance Broken",
  week_52_high: "52 Week High",
  week_52_low: "52 Week Low",
  atr_expansion: "ATR Expansion",
  gap_up: "Gap Up",
  gap_down: "Gap Down",
  trend_reversal: "Trend Reversal",
  momentum_strength: "Momentum Strength",
  momentum_weakness: "Momentum Weakness",
};

export const FUNDAMENTAL_ALERT_KINDS = [
  "pe_improved",
  "pe_overvalued",
  "revenue_growth",
  "revenue_decline",
  "eps_growth",
  "eps_decline",
  "margin_expansion",
  "margin_compression",
  "roe_improved",
  "roce_improved",
  "debt_increased",
  "debt_reduced",
  "cash_flow_improved",
  "cash_flow_weakening",
  "promoter_holding_increased",
  "promoter_holding_reduced",
  "institutional_holding_increased",
  "institutional_holding_reduced",
] as const;

export type FundamentalAlertKind = (typeof FUNDAMENTAL_ALERT_KINDS)[number];

export const FUNDAMENTAL_KIND_LABELS: Record<FundamentalAlertKind, string> = {
  pe_improved: "PE Improved",
  pe_overvalued: "PE Overvalued",
  revenue_growth: "Revenue Growth",
  revenue_decline: "Revenue Decline",
  eps_growth: "EPS Growth",
  eps_decline: "EPS Decline",
  margin_expansion: "Margin Expansion",
  margin_compression: "Margin Compression",
  roe_improved: "ROE Improved",
  roce_improved: "ROCE Improved",
  debt_increased: "Debt Increased",
  debt_reduced: "Debt Reduced",
  cash_flow_improved: "Cash Flow Improved",
  cash_flow_weakening: "Cash Flow Weakening",
  promoter_holding_increased: "Promoter Holding Increased",
  promoter_holding_reduced: "Promoter Holding Reduced",
  institutional_holding_increased: "Institutional Holding Increased",
  institutional_holding_reduced: "Institutional Holding Reduced",
};

export const MARKET_ALERT_KINDS = [
  "market_trend_changed",
  "sector_rotation",
  "index_breakout",
  "index_breakdown",
  "high_volatility",
  "low_volatility",
  "vix_spike",
  "breadth_improvement",
  "breadth_weakness",
  "liquidity_increase",
  "liquidity_decline",
] as const;

export type MarketAlertKind = (typeof MARKET_ALERT_KINDS)[number];

export const MARKET_KIND_LABELS: Record<MarketAlertKind, string> = {
  market_trend_changed: "Market Trend Changed",
  sector_rotation: "Sector Rotation",
  index_breakout: "Index Breakout",
  index_breakdown: "Index Breakdown",
  high_volatility: "High Volatility",
  low_volatility: "Low Volatility",
  vix_spike: "VIX Spike",
  breadth_improvement: "Breadth Improvement",
  breadth_weakness: "Breadth Weakness",
  liquidity_increase: "Liquidity Increase",
  liquidity_decline: "Liquidity Decline",
};

export const SECTOR_ALERT_KINDS = [
  "sector_leadership",
  "sector_weakness",
  "sector_momentum",
  "sector_recovery",
  "sector_breakdown",
  "sector_outperformance",
  "sector_underperformance",
] as const;

export type SectorAlertKind = (typeof SECTOR_ALERT_KINDS)[number];

export const SECTOR_KIND_LABELS: Record<SectorAlertKind, string> = {
  sector_leadership: "Sector Leadership",
  sector_weakness: "Sector Weakness",
  sector_momentum: "Sector Momentum",
  sector_recovery: "Sector Recovery",
  sector_breakdown: "Sector Breakdown",
  sector_outperformance: "Sector Outperformance",
  sector_underperformance: "Sector Underperformance",
};

export interface TechnicalAlertSnapshot {
  ticker: string;
  company: string;
  sector?: string | null;
  rsi?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHistogram?: number | null;
  prevMacdHistogram?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  prevEma20?: number | null;
  prevEma50?: number | null;
  atr?: number | null;
  atrPct?: number | null;
  volumeRatio?: number | null;
  momentum?: number | null;
  relativeStrength?: number | null;
  trendScore?: number | null;
  prevTrendScore?: number | null;
  priceTo52wHigh?: number | null;
  weekHigh52?: number | null;
  weekLow52?: number | null;
  closingStrength?: number | null;
  support?: number | null;
  resistance?: number | null;
  price?: number | null;
  changePercent?: number | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
  technicalStrength?: number | null;
}

export interface FundamentalAlertSnapshot {
  ticker: string;
  company: string;
  sector?: string | null;
  pe?: number | null;
  prevPe?: number | null;
  eps?: number | null;
  revenueGrowth?: number | null;
  epsGrowth?: number | null;
  operatingMargin?: number | null;
  prevOperatingMargin?: number | null;
  netMargin?: number | null;
  roe?: number | null;
  prevRoe?: number | null;
  roce?: number | null;
  prevRoce?: number | null;
  debtToEquity?: number | null;
  prevDebtToEquity?: number | null;
  freeCashFlow?: number | null;
  prevFreeCashFlow?: number | null;
  promoter?: number | null;
  promoterChangeQoQ?: number | null;
  fii?: number | null;
  dii?: number | null;
  institutionalChangeQoQ?: number | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
  fundamentalStrength?: number | null;
}

export interface MarketAlertSnapshot {
  id: string;
  asOf: string;
  marketTrend?: string | null;
  prevMarketTrend?: string | null;
  indiaVix?: number | null;
  indiaVixChange?: number | null;
  breadthScore?: number | null;
  prevBreadthScore?: number | null;
  advances?: number | null;
  declines?: number | null;
  newHighs?: number | null;
  newLows?: number | null;
  indexChangePercent?: number | null;
  volatility?: number | null;
  liquidityScore?: number | null;
  prevLiquidityScore?: number | null;
  rotatingSector?: string | null;
  confidenceScore?: number | null;
  marketStrength?: number | null;
}

export interface SectorAlertSnapshot {
  sector: string;
  changePercent: number;
  breadth?: number | null;
  prevChangePercent?: number | null;
  relativeStrength?: number | null;
  momentum?: number | null;
  marketChangePercent?: number | null;
  confidenceScore?: number | null;
  sectorStrength?: number | null;
}

export interface SignalAlertCard {
  id: string;
  signal: string;
  summary: string;
  reason: string;
  evidence: string[];
  score: string;
  confidence: string;
  priority: string;
  severity: string;
  category: string;
  affectedSymbol: string;
  sector: string;
  relatedIndicators: string[];
  ready: boolean;
  emptyMessage: string;
}

export function toSignalAlertCard(input: {
  id: string;
  signal: string;
  summary: string;
  reason: string;
  evidence: readonly string[];
  score: number | string;
  confidence: string;
  priority: string;
  severity: string;
  category: string;
  affectedSymbol?: string | null;
  sector?: string | null;
  relatedIndicators?: readonly string[] | null;
}): SignalAlertCard {
  const scoreText =
    typeof input.score === "number" && Number.isFinite(input.score)
      ? String(Math.round(input.score * 100) / 100)
      : safeAlertText(String(input.score), "0");
  return {
    id: input.id,
    signal: safeAlertText(input.signal, "Signal"),
    summary: safeAlertText(input.summary, input.signal),
    reason: safeAlertText(input.reason, "Generated from signal intelligence"),
    evidence: input.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
    score: scoreText === "NaN" ? "0" : scoreText,
    confidence: safeAlertText(input.confidence, "Unavailable"),
    priority: safeAlertText(input.priority, "Informational"),
    severity: safeAlertText(input.severity, "Informational"),
    category: safeAlertText(input.category, "Technical"),
    affectedSymbol: safeAlertText(input.affectedSymbol, "MARKET"),
    sector: safeAlertText(input.sector, "—"),
    relatedIndicators: (input.relatedIndicators ?? [])
      .map((i) => safeAlertText(i, ""))
      .filter(Boolean),
    ready: true,
    emptyMessage: SIGNAL_ALERT_EMPTY.awaitingAnalysis,
  };
}

export function buildSignalDecision(input: {
  kind: string;
  label: string;
  sourceEngine: AlertDecision["sourceEngine"];
  suggestedCategory: AlertDecision["suggestedCategory"];
  suggestedPriority: AlertPriority;
  suggestedSeverity: AlertSeverity;
  title: string;
  summary: string;
  reason: string;
  evidence: string[];
  company: string;
  ticker: string;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number;
  groupPrefix: string;
  sector?: string | null;
  relatedIndicators?: readonly string[];
  scoreHints?: Record<string, number>;
}): AlertDecision {
  const decision = buildEventDecision({
    kind: input.kind,
    label: input.label,
    sourceEngine: input.sourceEngine,
    suggestedCategory: input.suggestedCategory,
    suggestedPriority: input.suggestedPriority,
    suggestedSeverity: input.suggestedSeverity,
    title: input.title,
    summary: input.summary,
    reason: input.reason,
    evidence: input.evidence,
    company: input.company,
    ticker: input.ticker,
    inPortfolio: input.inPortfolio,
    inWatchlist: input.inWatchlist,
    confidenceScore: input.confidenceScore,
    groupPrefix: input.groupPrefix,
    metadata: {
      kindLabel: input.label,
      sector: input.sector ?? "",
      relatedIndicators: (input.relatedIndicators ?? []).join("|"),
      relatedReport: input.groupPrefix,
      ...(input.scoreHints ?? {}),
    },
  });
  return decision;
}

export function num(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}
