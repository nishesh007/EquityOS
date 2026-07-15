/**
 * Technical Signal Engine — detect technical alert kinds from snapshots (Sprint 9C.R4).
 * Reuses precomputed live-metrics / opportunity fields — no indicator recalculation.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  TECHNICAL_KIND_LABELS,
  buildSignalDecision,
  num,
  type TechnicalAlertKind,
  type TechnicalAlertSnapshot,
} from "./AlertSignalModels";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

const RSI_OB = 70;
const RSI_OS = 30;
const VOL_BREAKOUT = 1.8;
const ATR_EXPANSION_PCT = 3.5;
const MOMENTUM_STRONG = 70;
const MOMENTUM_WEAK = 35;

function push(
  decisions: AlertDecision[],
  snap: TechnicalAlertSnapshot,
  kind: TechnicalAlertKind,
  priority: AlertPriority,
  severity: AlertSeverity,
  reason: string,
  evidence: string[],
  indicators: string[]
): void {
  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker);
  const label = TECHNICAL_KIND_LABELS[kind];
  decisions.push(
    buildSignalDecision({
      kind,
      label,
      sourceEngine: "Market",
      suggestedCategory: "Technical",
      suggestedPriority: priority,
      suggestedSeverity: severity,
      title: `${label} — ${ticker}`,
      summary: reason,
      reason,
      evidence,
      company,
      ticker,
      inPortfolio: snap.inPortfolio,
      inWatchlist: snap.inWatchlist,
      confidenceScore: snap.confidenceScore ?? 65,
      groupPrefix: "technical",
      sector: snap.sector,
      relatedIndicators: indicators,
      scoreHints: {
        technicalStrength: snap.technicalStrength ?? snap.momentum ?? 50,
      },
    })
  );
}

export function detectTechnicalSignals(
  snap: TechnicalAlertSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const rsi = num(snap.rsi);
  const hist = num(snap.macdHistogram);
  const prevHist = num(snap.prevMacdHistogram);
  const ema20 = num(snap.ema20);
  const ema50 = num(snap.ema50);
  const ema200 = num(snap.ema200);
  const prevEma20 = num(snap.prevEma20);
  const prevEma50 = num(snap.prevEma50);
  const vol = num(snap.volumeRatio);
  const price = num(snap.price);
  const support = num(snap.support);
  const resistance = num(snap.resistance);
  const p52 = num(snap.priceTo52wHigh);
  const atrPct = num(snap.atrPct);
  const change = num(snap.changePercent);
  const closing = num(snap.closingStrength);
  const momentum = num(snap.momentum);
  const trend = num(snap.trendScore);
  const prevTrend = num(snap.prevTrendScore);

  if (rsi != null && rsi >= RSI_OB) {
    push(decisions, snap, "rsi_overbought", "Medium", "Moderate",
      `RSI overbought at ${rsi} on ${ticker}`, [`rsi:${rsi}`], ["RSI"]);
  }
  if (rsi != null && rsi <= RSI_OS) {
    push(decisions, snap, "rsi_oversold", "Medium", "Moderate",
      `RSI oversold at ${rsi} on ${ticker}`, [`rsi:${rsi}`], ["RSI"]);
  }

  if (hist != null && prevHist != null) {
    if (prevHist <= 0 && hist > 0) {
      push(decisions, snap, "macd_bullish_cross", "High", "Major",
        `MACD bullish cross on ${ticker}`, [`macdHist:${hist}`, `prev:${prevHist}`], ["MACD"]);
    }
    if (prevHist >= 0 && hist < 0) {
      push(decisions, snap, "macd_bearish_cross", "High", "Major",
        `MACD bearish cross on ${ticker}`, [`macdHist:${hist}`, `prev:${prevHist}`], ["MACD"]);
    }
  }

  if (ema50 != null && ema200 != null && prevEma50 != null) {
    if (prevEma50 <= ema200 && ema50 > ema200) {
      push(decisions, snap, "golden_cross", "High", "Major",
        `Golden cross on ${ticker}`, [`ema50:${ema50}`, `ema200:${ema200}`], ["EMA50", "EMA200"]);
    }
    if (prevEma50 >= ema200 && ema50 < ema200) {
      push(decisions, snap, "death_cross", "High", "Major",
        `Death cross on ${ticker}`, [`ema50:${ema50}`, `ema200:${ema200}`], ["EMA50", "EMA200"]);
    }
  }

  if (ema20 != null && ema50 != null && prevEma20 != null && prevEma50 != null) {
    if ((prevEma20 <= prevEma50 && ema20 > ema50) || (prevEma20 >= prevEma50 && ema20 < ema50)) {
      push(decisions, snap, "ema_cross", "Medium", "Moderate",
        `EMA cross on ${ticker}`, [`ema20:${ema20}`, `ema50:${ema50}`], ["EMA20", "EMA50"]);
    }
  }

  if (vol != null && vol >= VOL_BREAKOUT) {
    push(decisions, snap, "volume_breakout", "High", "Major",
      `Volume breakout (${vol}x) on ${ticker}`, [`volumeRatio:${vol}`], ["Volume"]);
  }

  if (resistance != null && price != null && price >= resistance) {
    push(decisions, snap, "price_breakout", "High", "Major",
      `Price breakout above resistance on ${ticker}`, [`price:${price}`, `resistance:${resistance}`], ["Price", "Resistance"]);
    push(decisions, snap, "resistance_broken", "High", "Major",
      `Resistance broken on ${ticker}`, [`resistance:${resistance}`], ["Resistance"]);
  }

  if (support != null && price != null && price <= support) {
    push(decisions, snap, "support_broken", "High", "Major",
      `Support broken on ${ticker}`, [`price:${price}`, `support:${support}`], ["Support"]);
  }

  if (p52 != null && p52 >= 0.98) {
    push(decisions, snap, "week_52_high", "High", "Major",
      `${ticker} near/at 52-week high`, [`priceTo52wHigh:${p52}`], ["52W High"]);
  }
  if (p52 != null && p52 <= 0.05) {
    push(decisions, snap, "week_52_low", "High", "Major",
      `${ticker} near/at 52-week low`, [`priceTo52wHigh:${p52}`], ["52W Low"]);
  }

  if (atrPct != null && atrPct >= ATR_EXPANSION_PCT) {
    push(decisions, snap, "atr_expansion", "Medium", "Moderate",
      `ATR expansion (${atrPct}%) on ${ticker}`, [`atrPct:${atrPct}`], ["ATR"]);
  }

  if ((change != null && change >= 2.5) || (closing != null && closing >= 80 && (change ?? 0) > 0)) {
    push(decisions, snap, "gap_up", "Medium", "Moderate",
      `Gap up / strong open bias on ${ticker}`, [
        ...(change != null ? [`change:${change}`] : []),
        ...(closing != null ? [`closingStrength:${closing}`] : []),
      ], ["Gap", "Change%"]);
  }
  if ((change != null && change <= -2.5) || (closing != null && closing <= 20 && (change ?? 0) < 0)) {
    push(decisions, snap, "gap_down", "Medium", "Moderate",
      `Gap down / weak open bias on ${ticker}`, [
        ...(change != null ? [`change:${change}`] : []),
        ...(closing != null ? [`closingStrength:${closing}`] : []),
      ], ["Gap", "Change%"]);
  }

  if (trend != null && prevTrend != null && Math.sign(trend) !== 0 && Math.sign(prevTrend) !== 0 && Math.sign(trend) !== Math.sign(prevTrend)) {
    push(decisions, snap, "trend_reversal", "High", "Major",
      `Trend reversal on ${ticker}`, [`trend:${trend}`, `prevTrend:${prevTrend}`], ["Trend"]);
  }

  if (momentum != null && momentum >= MOMENTUM_STRONG) {
    push(decisions, snap, "momentum_strength", "Medium", "Moderate",
      `Momentum strength on ${ticker}`, [`momentum:${momentum}`], ["Momentum"]);
  }
  if (momentum != null && momentum <= MOMENTUM_WEAK) {
    push(decisions, snap, "momentum_weakness", "Medium", "Moderate",
      `Momentum weakness on ${ticker}`, [`momentum:${momentum}`], ["Momentum"]);
  }

  return decisions;
}

export class TechnicalSignalEngine {
  detect(snapshots: readonly TechnicalAlertSnapshot[]): AlertDecision[] {
    return snapshots.flatMap(detectTechnicalSignals);
  }
}
