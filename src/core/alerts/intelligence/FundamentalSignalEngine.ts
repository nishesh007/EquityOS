/**
 * Fundamental Signal Engine — detect fundamental alert kinds (Sprint 9C.R4).
 * Reuses fundamentals ratios / growth / shareholding — no recalculation.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  FUNDAMENTAL_KIND_LABELS,
  buildSignalDecision,
  num,
  type FundamentalAlertKind,
  type FundamentalAlertSnapshot,
} from "./AlertSignalModels";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

const PE_OVERVALUED = 45;
const GROWTH_STRONG = 12;
const GROWTH_WEAK = -5;
const MARGIN_DELTA = 0.8;
const HOLDING_DELTA = 0.5;

function push(
  decisions: AlertDecision[],
  snap: FundamentalAlertSnapshot,
  kind: FundamentalAlertKind,
  priority: AlertPriority,
  severity: AlertSeverity,
  reason: string,
  evidence: string[],
  indicators: string[]
): void {
  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker);
  const label = FUNDAMENTAL_KIND_LABELS[kind];
  decisions.push(
    buildSignalDecision({
      kind,
      label,
      sourceEngine: "AI Research",
      suggestedCategory: "Fundamental",
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
      confidenceScore: snap.confidenceScore ?? 70,
      groupPrefix: "fundamental",
      sector: snap.sector,
      relatedIndicators: indicators,
      scoreHints: {
        fundamentalStrength: snap.fundamentalStrength ?? 55,
      },
    })
  );
}

export function detectFundamentalSignals(
  snap: FundamentalAlertSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const pe = num(snap.pe);
  const prevPe = num(snap.prevPe);
  const revG = num(snap.revenueGrowth);
  const epsG = num(snap.epsGrowth);
  const om = num(snap.operatingMargin);
  const prevOm = num(snap.prevOperatingMargin);
  const roe = num(snap.roe);
  const prevRoe = num(snap.prevRoe);
  const roce = num(snap.roce);
  const prevRoce = num(snap.prevRoce);
  const de = num(snap.debtToEquity);
  const prevDe = num(snap.prevDebtToEquity);
  const fcf = num(snap.freeCashFlow);
  const prevFcf = num(snap.prevFreeCashFlow);
  const promCh = num(snap.promoterChangeQoQ);
  const instCh = num(snap.institutionalChangeQoQ);

  if (pe != null && prevPe != null && pe < prevPe * 0.9) {
    push(decisions, snap, "pe_improved", "Medium", "Moderate",
      `PE improved from ${prevPe} to ${pe} on ${ticker}`, [`pe:${pe}`, `prevPe:${prevPe}`], ["PE"]);
  }
  if (pe != null && pe >= PE_OVERVALUED) {
    push(decisions, snap, "pe_overvalued", "High", "Major",
      `PE overvalued at ${pe} on ${ticker}`, [`pe:${pe}`], ["PE"]);
  }

  if (revG != null && revG >= GROWTH_STRONG) {
    push(decisions, snap, "revenue_growth", "Medium", "Moderate",
      `Revenue growth ${revG}% on ${ticker}`, [`revenueGrowth:${revG}`], ["Revenue"]);
  }
  if (revG != null && revG <= GROWTH_WEAK) {
    push(decisions, snap, "revenue_decline", "High", "Major",
      `Revenue decline ${revG}% on ${ticker}`, [`revenueGrowth:${revG}`], ["Revenue"]);
  }

  if (epsG != null && epsG >= GROWTH_STRONG) {
    push(decisions, snap, "eps_growth", "Medium", "Moderate",
      `EPS growth ${epsG}% on ${ticker}`, [`epsGrowth:${epsG}`], ["EPS"]);
  }
  if (epsG != null && epsG <= GROWTH_WEAK) {
    push(decisions, snap, "eps_decline", "High", "Major",
      `EPS decline ${epsG}% on ${ticker}`, [`epsGrowth:${epsG}`], ["EPS"]);
  }

  if (om != null && prevOm != null) {
    if (om - prevOm >= MARGIN_DELTA) {
      push(decisions, snap, "margin_expansion", "Medium", "Moderate",
        `Margin expansion on ${ticker}`, [`om:${om}`, `prevOm:${prevOm}`], ["Operating Margin"]);
    }
    if (prevOm - om >= MARGIN_DELTA) {
      push(decisions, snap, "margin_compression", "High", "Major",
        `Margin compression on ${ticker}`, [`om:${om}`, `prevOm:${prevOm}`], ["Operating Margin"]);
    }
  }

  if (roe != null && prevRoe != null && roe > prevRoe + 1) {
    push(decisions, snap, "roe_improved", "Medium", "Moderate",
      `ROE improved to ${roe} on ${ticker}`, [`roe:${roe}`], ["ROE"]);
  }
  if (roce != null && prevRoce != null && roce > prevRoce + 1) {
    push(decisions, snap, "roce_improved", "Medium", "Moderate",
      `ROCE improved to ${roce} on ${ticker}`, [`roce:${roce}`], ["ROCE"]);
  }

  if (de != null && prevDe != null) {
    if (de > prevDe * 1.1) {
      push(decisions, snap, "debt_increased", "High", "Major",
        `Debt increased on ${ticker}`, [`de:${de}`, `prevDe:${prevDe}`], ["Debt/Equity"]);
    }
    if (de < prevDe * 0.9) {
      push(decisions, snap, "debt_reduced", "Medium", "Minor",
        `Debt reduced on ${ticker}`, [`de:${de}`, `prevDe:${prevDe}`], ["Debt/Equity"]);
    }
  }

  if (fcf != null && prevFcf != null) {
    if (fcf > prevFcf * 1.1) {
      push(decisions, snap, "cash_flow_improved", "Medium", "Moderate",
        `Cash flow improved on ${ticker}`, [`fcf:${fcf}`], ["FCF"]);
    }
    if (fcf < prevFcf * 0.9) {
      push(decisions, snap, "cash_flow_weakening", "High", "Major",
        `Cash flow weakening on ${ticker}`, [`fcf:${fcf}`], ["FCF"]);
    }
  }

  if (promCh != null && promCh >= HOLDING_DELTA) {
    push(decisions, snap, "promoter_holding_increased", "Medium", "Moderate",
      `Promoter holding increased on ${ticker}`, [`promoterChangeQoQ:${promCh}`], ["Promoter"]);
  }
  if (promCh != null && promCh <= -HOLDING_DELTA) {
    push(decisions, snap, "promoter_holding_reduced", "High", "Major",
      `Promoter holding reduced on ${ticker}`, [`promoterChangeQoQ:${promCh}`], ["Promoter"]);
  }

  if (instCh != null && instCh >= HOLDING_DELTA) {
    push(decisions, snap, "institutional_holding_increased", "Medium", "Moderate",
      `Institutional holding increased on ${ticker}`, [`institutionalChangeQoQ:${instCh}`], ["FII/DII"]);
  }
  if (instCh != null && instCh <= -HOLDING_DELTA) {
    push(decisions, snap, "institutional_holding_reduced", "High", "Major",
      `Institutional holding reduced on ${ticker}`, [`institutionalChangeQoQ:${instCh}`], ["FII/DII"]);
  }

  return decisions;
}

export class FundamentalSignalEngine {
  detect(snapshots: readonly FundamentalAlertSnapshot[]): AlertDecision[] {
    return snapshots.flatMap(detectFundamentalSignals);
  }
}
