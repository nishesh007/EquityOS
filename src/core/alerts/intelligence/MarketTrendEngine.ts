/**
 * Market Trend Engine — market & sector trend signals (Sprint 9C.R4).
 * Reuses market pulse / breadth snapshots — no dashboard rebuild.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  MARKET_KIND_LABELS,
  SECTOR_KIND_LABELS,
  buildSignalDecision,
  num,
  type MarketAlertKind,
  type MarketAlertSnapshot,
  type SectorAlertKind,
  type SectorAlertSnapshot,
} from "./AlertSignalModels";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

function pushMarket(
  decisions: AlertDecision[],
  snap: MarketAlertSnapshot,
  kind: MarketAlertKind,
  priority: AlertPriority,
  severity: AlertSeverity,
  reason: string,
  evidence: string[]
): void {
  const label = MARKET_KIND_LABELS[kind];
  decisions.push(
    buildSignalDecision({
      kind,
      label,
      sourceEngine: "Market",
      suggestedCategory: "Technical",
      suggestedPriority: priority,
      suggestedSeverity: severity,
      title: label,
      summary: reason,
      reason,
      evidence,
      company: "Market",
      ticker: "",
      confidenceScore: snap.confidenceScore ?? 68,
      groupPrefix: "market",
      relatedIndicators: ["Market Pulse", "Breadth", "VIX"],
      scoreHints: {
        marketStrength: snap.marketStrength ?? snap.breadthScore ?? 50,
        urgency: kind === "vix_spike" ? 90 : 55,
      },
    })
  );
}

export function detectMarketSignals(
  snap: MarketAlertSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const trend = safeAlertText(snap.marketTrend, "");
  const prevTrend = safeAlertText(snap.prevMarketTrend, "");
  const vix = num(snap.indiaVix);
  const vixCh = num(snap.indiaVixChange);
  const breadth = num(snap.breadthScore);
  const prevBreadth = num(snap.prevBreadthScore);
  const indexCh = num(snap.indexChangePercent);
  const vol = num(snap.volatility);
  const liq = num(snap.liquidityScore);
  const prevLiq = num(snap.prevLiquidityScore);
  const advances = num(snap.advances);
  const declines = num(snap.declines);

  if (trend && prevTrend && trend !== prevTrend) {
    pushMarket(decisions, snap, "market_trend_changed", "High", "Major",
      `Market trend changed from ${prevTrend} to ${trend}`,
      [`from:${prevTrend}`, `to:${trend}`]);
  }

  if (safeAlertText(snap.rotatingSector, "")) {
    pushMarket(decisions, snap, "sector_rotation", "Medium", "Moderate",
      `Sector rotation toward ${snap.rotatingSector}`,
      [`sector:${snap.rotatingSector}`]);
  }

  if (indexCh != null && indexCh >= 1.2) {
    pushMarket(decisions, snap, "index_breakout", "High", "Major",
      `Index breakout (${indexCh}%)`, [`indexChange:${indexCh}`]);
  }
  if (indexCh != null && indexCh <= -1.2) {
    pushMarket(decisions, snap, "index_breakdown", "High", "Major",
      `Index breakdown (${indexCh}%)`, [`indexChange:${indexCh}`]);
  }

  if ((vol != null && vol >= 25) || (vix != null && vix >= 20)) {
    pushMarket(decisions, snap, "high_volatility", "High", "Major",
      `High market volatility`, [
        ...(vol != null ? [`volatility:${vol}`] : []),
        ...(vix != null ? [`vix:${vix}`] : []),
      ]);
  }
  if (vol != null && vol <= 10) {
    pushMarket(decisions, snap, "low_volatility", "Low", "Minor",
      `Low market volatility (${vol})`, [`volatility:${vol}`]);
  }

  if ((vixCh != null && vixCh >= 8) || (vix != null && vix >= 22 && (vixCh ?? 0) > 0)) {
    pushMarket(decisions, snap, "vix_spike", "Critical", "Critical",
      `VIX spike detected`, [
        ...(vix != null ? [`vix:${vix}`] : []),
        ...(vixCh != null ? [`vixChange:${vixCh}`] : []),
      ]);
  }

  if (
    (breadth != null && prevBreadth != null && breadth - prevBreadth >= 8) ||
    (advances != null && declines != null && advances > declines * 1.5)
  ) {
    pushMarket(decisions, snap, "breadth_improvement", "Medium", "Moderate",
      `Market breadth improving`, [
        ...(breadth != null ? [`breadth:${breadth}`] : []),
        ...(advances != null ? [`advances:${advances}`] : []),
      ]);
  }
  if (
    (breadth != null && prevBreadth != null && prevBreadth - breadth >= 8) ||
    (advances != null && declines != null && declines > advances * 1.5)
  ) {
    pushMarket(decisions, snap, "breadth_weakness", "High", "Major",
      `Market breadth weakening`, [
        ...(breadth != null ? [`breadth:${breadth}`] : []),
        ...(declines != null ? [`declines:${declines}`] : []),
      ]);
  }

  if (liq != null && prevLiq != null && liq > prevLiq * 1.15) {
    pushMarket(decisions, snap, "liquidity_increase", "Medium", "Moderate",
      `Liquidity increase`, [`liquidity:${liq}`, `prev:${prevLiq}`]);
  }
  if (liq != null && prevLiq != null && liq < prevLiq * 0.85) {
    pushMarket(decisions, snap, "liquidity_decline", "Medium", "Moderate",
      `Liquidity decline`, [`liquidity:${liq}`, `prev:${prevLiq}`]);
  }

  return decisions;
}

export function detectSectorSignals(
  snap: SectorAlertSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const sector = safeAlertText(snap.sector, "Sector");
  const ch = num(snap.changePercent) ?? 0;
  const prev = num(snap.prevChangePercent);
  const breadth = num(snap.breadth);
  const mom = num(snap.momentum);
  const mkt = num(snap.marketChangePercent) ?? 0;
  const rs = num(snap.relativeStrength);

  const push = (
    kind: SectorAlertKind,
    priority: AlertPriority,
    severity: AlertSeverity,
    reason: string,
    evidence: string[]
  ) => {
    const label = SECTOR_KIND_LABELS[kind];
    decisions.push(
      buildSignalDecision({
        kind,
        label,
        sourceEngine: "Market",
        suggestedCategory: "Technical",
        suggestedPriority: priority,
        suggestedSeverity: severity,
        title: `${label} — ${sector}`,
        summary: reason,
        reason,
        evidence,
        company: sector,
        ticker: "",
        confidenceScore: snap.confidenceScore ?? 64,
        groupPrefix: "sector",
        sector,
        relatedIndicators: ["Sector Breadth", "Relative Strength"],
        scoreHints: {
          sectorStrength: snap.sectorStrength ?? Math.abs(ch) * 10,
        },
      })
    );
  };

  if (ch >= 2 && (breadth == null || breadth >= 55)) {
    push("sector_leadership", "High", "Major",
      `${sector} showing leadership`, [`change:${ch}`, ...(breadth != null ? [`breadth:${breadth}`] : [])]);
  }
  if (ch <= -2) {
    push("sector_weakness", "High", "Major",
      `${sector} showing weakness`, [`change:${ch}`]);
  }
  if (mom != null && mom >= 65) {
    push("sector_momentum", "Medium", "Moderate",
      `${sector} momentum elevated`, [`momentum:${mom}`]);
  }
  if (prev != null && prev < -1 && ch > 0.5) {
    push("sector_recovery", "Medium", "Moderate",
      `${sector} recovering`, [`from:${prev}`, `to:${ch}`]);
  }
  if (prev != null && prev > 0 && ch <= -1.5) {
    push("sector_breakdown", "High", "Major",
      `${sector} breakdown`, [`from:${prev}`, `to:${ch}`]);
  }
  if (ch - mkt >= 1) {
    push("sector_outperformance", "Medium", "Moderate",
      `${sector} outperforming market`, [`sector:${ch}`, `market:${mkt}`]);
  }
  if (mkt - ch >= 1 || (rs != null && rs <= 35)) {
    push("sector_underperformance", "Medium", "Moderate",
      `${sector} underperforming`, [
        `sector:${ch}`,
        `market:${mkt}`,
        ...(rs != null ? [`rs:${rs}`] : []),
      ]);
  }

  return decisions;
}

export class MarketTrendEngine {
  detectMarket(snapshots: readonly MarketAlertSnapshot[]): AlertDecision[] {
    return snapshots.flatMap(detectMarketSignals);
  }

  detectSectors(snapshots: readonly SectorAlertSnapshot[]): AlertDecision[] {
    return snapshots.flatMap(detectSectorSignals);
  }
}
