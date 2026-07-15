/**
 * Alert Decision Engine — decides which intelligence alert kinds to fire (Sprint 9C.R2).
 * Reuses opportunity / portfolio / watchlist snapshots; no duplicated research math.
 */

import type {
  OpportunityAlertKind,
  OpportunitySnapshot,
  PortfolioAlertKind,
  PortfolioHoldingSnapshot,
  PortfolioSnapshot,
  WatchlistAlertKind,
  WatchlistItemSnapshot,
} from "./AlertPresentationModels";
import {
  OPPORTUNITY_KIND_LABELS,
  PORTFOLIO_KIND_LABELS,
  WATCHLIST_KIND_LABELS,
} from "./AlertPresentationModels";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import type { AlertSourceEvent } from "../AlertTypes";
import { safeAlertText } from "../AlertModels";

export interface AlertDecision {
  kind: string;
  label: string;
  sourceEngine: "AI Research" | "Portfolio" | "Watchlist";
  suggestedCategory: "Opportunity" | "Portfolio" | "Watchlist" | "Risk";
  suggestedPriority: AlertPriority;
  suggestedSeverity: AlertSeverity;
  title: string;
  summary: string;
  description: string;
  reason: string;
  evidence: string[];
  company: string;
  ticker: string;
  inPortfolio: boolean;
  inWatchlist: boolean;
  confidenceScore: number;
  groupKey: string;
  dedupeKey: string;
  metadata: Record<string, string | number | boolean>;
}

const HIGH_CONVICTION = 75;
const STRONG_RS = 70;
const WEAK_RS = 35;
const HIGH_VOLUME_RATIO = 1.8;
const NEAR_ZONE_PCT = 2.5;
const POSITION_SIZE_WARN = 15;
const DIVERSIFICATION_WARN = 45;
const CONVICTION_DELTA = 5;
const RISK_DELTA = 5;
const GRADE_DELTA = 5;

function metric(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function nearLevel(
  price: number | null | undefined,
  level: number | null | undefined,
  pct = NEAR_ZONE_PCT
): boolean {
  const p = metric(price);
  const l = metric(level);
  if (p == null || l == null || l === 0) return false;
  return (Math.abs(p - l) / Math.abs(l)) * 100 <= pct;
}

function inEntryZone(
  price: number | null | undefined,
  low: number | null | undefined,
  high: number | null | undefined
): boolean {
  const p = metric(price);
  const lo = metric(low);
  const hi = metric(high);
  if (p == null || lo == null || hi == null) return false;
  const pad = (hi - lo) * 0.05;
  return p >= lo - pad && p <= hi + pad;
}

export function decideOpportunityAlerts(
  current: OpportunitySnapshot,
  prior: OpportunitySnapshot | null,
  flags?: { inPortfolio?: boolean; inWatchlist?: boolean }
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const inPortfolio = flags?.inPortfolio === true;
  const inWatchlist = flags?.inWatchlist === true;
  const symbol = safeAlertText(current.symbol, "").toUpperCase();
  const company = safeAlertText(current.company, symbol || "Unknown Company");
  const conviction = metric(current.aiConvictionScore) ?? 0;
  const rs = metric(current.relativeStrength);
  const momentum = metric(current.momentum);
  const grade = metric(current.institutionalGrade);
  const rr = metric(current.riskReward) ?? 0;

  const push = (
    kind: OpportunityAlertKind,
    priority: AlertPriority,
    severity: AlertSeverity,
    reason: string,
    evidence: string[],
    confidence = current.confidencePercent || conviction
  ) => {
    decisions.push(
      buildDecision({
        kind,
        label: OPPORTUNITY_KIND_LABELS[kind],
        sourceEngine: "AI Research",
        suggestedCategory: kind.includes("risk") ? "Risk" : "Opportunity",
        suggestedPriority: priority,
        suggestedSeverity: severity,
        title: `${OPPORTUNITY_KIND_LABELS[kind]} — ${symbol || company}`,
        summary: reason,
        description: safeAlertText(current.reason, reason),
        reason,
        evidence,
        company,
        ticker: symbol,
        inPortfolio,
        inWatchlist,
        confidenceScore: confidence,
        groupKey: `opportunity::${symbol || current.id}::${kind}`,
        dedupeKey: `opportunity::${symbol || current.id}::${kind}`,
        metadata: {
          kind,
          category: current.category,
          conviction,
          riskReward: rr,
        },
      })
    );
  };

  // New buy opportunity
  if (!prior) {
    push(
      "new_buy_opportunity",
      inPortfolio ? "High" : "Medium",
      "Moderate",
      `New ${current.category} opportunity detected for ${symbol}`,
      [`category:${current.category}`, `conviction:${conviction}`]
    );
  }

  // High conviction
  if (conviction >= HIGH_CONVICTION || current.category === "ai_high_conviction") {
    push(
      "high_conviction_opportunity",
      "High",
      "Major",
      `High AI conviction (${conviction}) on ${symbol}`,
      [`conviction:${conviction}`, `category:${current.category}`],
      conviction
    );
  }

  // Conviction deltas
  if (prior) {
    const prevConv = metric(prior.aiConvictionScore) ?? 0;
    const delta = conviction - prevConv;
    if (delta >= CONVICTION_DELTA) {
      push(
        "conviction_increased",
        "Medium",
        "Moderate",
        `Conviction rose from ${prevConv} to ${conviction}`,
        [`from:${prevConv}`, `to:${conviction}`]
      );
    } else if (delta <= -CONVICTION_DELTA) {
      push(
        "conviction_dropped",
        "High",
        "Major",
        `Conviction dropped from ${prevConv} to ${conviction}`,
        [`from:${prevConv}`, `to:${conviction}`]
      );
    }

    const prevT1 = metric(prior.target1);
    const curT1 = metric(current.target1);
    if (prevT1 != null && curT1 != null && Math.abs(curT1 - prevT1) / Math.abs(prevT1) > 0.02) {
      push(
        "target_revised",
        "Medium",
        "Moderate",
        `Target revised from ${prevT1} to ${curT1}`,
        [`from:${prevT1}`, `to:${curT1}`]
      );
    }

    const prevStop = metric(prior.stopLoss);
    const curStop = metric(current.stopLoss);
    if (
      prevStop != null &&
      curStop != null &&
      Math.abs(curStop - prevStop) / Math.abs(prevStop) > 0.02
    ) {
      push(
        "stop_loss_revised",
        "Medium",
        "Moderate",
        `Stop loss revised from ${prevStop} to ${curStop}`,
        [`from:${prevStop}`, `to:${curStop}`]
      );
    }

    const prevRr = metric(prior.riskReward) ?? 0;
    if (rr < prevRr - 0.15) {
      push(
        "risk_increased",
        "High",
        "Major",
        `Risk/reward weakened from ${prevRr} to ${rr}`,
        [`from:${prevRr}`, `to:${rr}`]
      );
    } else if (rr > prevRr + 0.15) {
      push(
        "risk_reduced",
        "Medium",
        "Minor",
        `Risk/reward improved from ${prevRr} to ${rr}`,
        [`from:${prevRr}`, `to:${rr}`]
      );
    }

    const prevGrade = metric(prior.institutionalGrade);
    if (grade != null && prevGrade != null) {
      if (grade - prevGrade >= GRADE_DELTA) {
        push(
          "institutional_grade_improved",
          "Medium",
          "Moderate",
          `Institutional grade improved from ${prevGrade} to ${grade}`,
          [`from:${prevGrade}`, `to:${grade}`]
        );
      } else if (prevGrade - grade >= GRADE_DELTA) {
        push(
          "institutional_grade_reduced",
          "High",
          "Major",
          `Institutional grade reduced from ${prevGrade} to ${grade}`,
          [`from:${prevGrade}`, `to:${grade}`]
        );
      }
    }

    const prevTrend = metric(prior.trendScore);
    const curTrend = metric(current.trendScore);
    if (
      prevTrend != null &&
      curTrend != null &&
      Math.sign(prevTrend) !== 0 &&
      Math.sign(curTrend) !== 0 &&
      Math.sign(prevTrend) !== Math.sign(curTrend)
    ) {
      push(
        "trend_reversal",
        "High",
        "Major",
        `Trend reversal signal on ${symbol}`,
        [`fromTrend:${prevTrend}`, `toTrend:${curTrend}`]
      );
    }
  }

  // Target achieved
  if (
    current.tradeStatus === "target1_hit" ||
    current.tradeStatus === "target2_hit"
  ) {
    push(
      "target_achieved",
      "High",
      "Major",
      `Target achieved (${current.tradeStatus}) for ${symbol}`,
      [`status:${current.tradeStatus}`, `target1:${current.target1}`]
    );
  }

  // Momentum / breakout
  if (
    current.category === "breakout" ||
    current.category === "momentum" ||
    (momentum != null && momentum >= 70)
  ) {
    push(
      "momentum_breakout",
      "High",
      "Major",
      `Momentum / breakout conditions on ${symbol}`,
      [
        `category:${current.category}`,
        ...(momentum != null ? [`momentum:${momentum}`] : []),
      ]
    );
  }

  // Relative strength
  if (rs != null && rs >= STRONG_RS) {
    push(
      "strong_relative_strength",
      "Medium",
      "Moderate",
      `Strong relative strength (${rs}) on ${symbol}`,
      [`relativeStrength:${rs}`]
    );
  } else if (rs != null && rs <= WEAK_RS) {
    push(
      "weak_relative_strength",
      "Medium",
      "Moderate",
      `Weak relative strength (${rs}) on ${symbol}`,
      [`relativeStrength:${rs}`]
    );
  }

  return decisions;
}

export function decidePortfolioAlerts(
  current: PortfolioSnapshot,
  prior: PortfolioSnapshot | null,
  holdingOpportunities?: Map<string, OpportunitySnapshot>
): AlertDecision[] {
  const decisions: AlertDecision[] = [];

  const pushPortfolio = (
    kind: PortfolioAlertKind,
    priority: AlertPriority,
    severity: AlertSeverity,
    reason: string,
    evidence: string[],
    holding?: PortfolioHoldingSnapshot,
    confidence = 65
  ) => {
    const symbol = safeAlertText(holding?.symbol, "PORTFOLIO").toUpperCase();
    const company = safeAlertText(holding?.name, symbol);
    decisions.push(
      buildDecision({
        kind,
        label: PORTFOLIO_KIND_LABELS[kind],
        sourceEngine: "Portfolio",
        suggestedCategory:
          kind.includes("risk") || kind.includes("diversification")
            ? "Risk"
            : "Portfolio",
        suggestedPriority: priority,
        suggestedSeverity: severity,
        title: `${PORTFOLIO_KIND_LABELS[kind]}${holding ? ` — ${symbol}` : ""}`,
        summary: reason,
        description: reason,
        reason,
        evidence,
        company,
        ticker: holding ? symbol : "",
        inPortfolio: true,
        inWatchlist: false,
        confidenceScore: confidence,
        groupKey: holding
          ? `portfolio::${symbol}::${kind}`
          : `portfolio::book::${kind}`,
        dedupeKey: holding
          ? `portfolio::${symbol}::${kind}`
          : `portfolio::book::${kind}`,
        metadata: { kind, overallRisk: current.overallRisk },
      })
    );
  };

  if (prior) {
    const riskDelta = current.overallRisk - prior.overallRisk;
    if (riskDelta >= RISK_DELTA) {
      pushPortfolio(
        "portfolio_risk_increased",
        "High",
        "Major",
        `Portfolio risk increased from ${prior.overallRisk} to ${current.overallRisk}`,
        [`from:${prior.overallRisk}`, `to:${current.overallRisk}`]
      );
    } else if (riskDelta <= -RISK_DELTA) {
      pushPortfolio(
        "portfolio_risk_reduced",
        "Medium",
        "Minor",
        `Portfolio risk reduced from ${prior.overallRisk} to ${current.overallRisk}`,
        [`from:${prior.overallRisk}`, `to:${current.overallRisk}`]
      );
    }

    if (
      prior.aiRecommendationHash &&
      current.aiRecommendationHash &&
      prior.aiRecommendationHash !== current.aiRecommendationHash
    ) {
      pushPortfolio(
        "ai_recommendation_changed",
        "Medium",
        "Moderate",
        "AI portfolio recommendation changed",
        ["recommendation:changed"]
      );
    }

    const prevTrust = metric(prior.trustScore);
    const curTrust = metric(current.trustScore);
    if (prevTrust != null && curTrust != null && Math.abs(curTrust - prevTrust) >= 3) {
      pushPortfolio(
        "trust_score_changed",
        "High",
        "Major",
        `Trust score changed from ${prevTrust} to ${curTrust}`,
        [`from:${prevTrust}`, `to:${curTrust}`],
        undefined,
        curTrust
      );
    }
  }

  if (current.diversificationScore < DIVERSIFICATION_WARN) {
    pushPortfolio(
      "diversification_warning",
      "High",
      "Major",
      `Diversification score ${current.diversificationScore} below institutional threshold`,
      [`diversification:${current.diversificationScore}`]
    );
  }

  const validation = safeAlertText(current.validationStatus, "").toUpperCase();
  const priorValidation = safeAlertText(
    prior?.validationStatus,
    ""
  ).toUpperCase();
  if (validation === "FAILED" || validation === "REJECTED") {
    pushPortfolio(
      "validation_failed",
      "Critical",
      "Critical",
      `Portfolio validation ${validation}`,
      [`status:${validation}`]
    );
  } else if (
    (validation === "APPROVED" || validation === "PASSED") &&
    priorValidation !== validation &&
    (priorValidation === "FAILED" ||
      priorValidation === "REJECTED" ||
      priorValidation === "WARNING" ||
      priorValidation === "")
  ) {
    pushPortfolio(
      "validation_passed",
      "Medium",
      "Minor",
      `Portfolio validation ${validation}`,
      [`status:${validation}`, `from:${priorValidation || "none"}`]
    );
  }

  for (const holding of current.holdings) {
    if (holding.weightPercent >= POSITION_SIZE_WARN) {
      pushPortfolio(
        "position_size_too_large",
        "High",
        "Major",
        `${holding.symbol} weight ${holding.weightPercent}% exceeds size guidance`,
        [`weight:${holding.weightPercent}`],
        holding
      );
    }

    const opp = holdingOpportunities?.get(holding.symbol.toUpperCase());
    const conviction =
      metric(holding.convictionScore) ?? metric(opp?.aiConvictionScore) ?? 0;

    if (conviction >= HIGH_CONVICTION) {
      pushPortfolio(
        "new_high_conviction_holding",
        "High",
        "Major",
        `${holding.symbol} is a high-conviction holding (${conviction})`,
        [`conviction:${conviction}`],
        holding,
        conviction
      );
    }

    const quality = metric(holding.qualityScore);
    if (
      (quality != null && quality < 40) ||
      (conviction > 0 && conviction < 45) ||
      holding.changePercent <= -8
    ) {
      pushPortfolio(
        "weak_holding",
        "High",
        "Major",
        `${holding.symbol} flagged as weak holding`,
        [
          ...(quality != null ? [`quality:${quality}`] : []),
          `change:${holding.changePercent}`,
        ],
        holding
      );
    }

    const status = safeAlertText(holding.tradeStatus ?? opp?.tradeStatus, "");
    if (status === "target1_hit" || status === "target2_hit") {
      pushPortfolio(
        "target_achieved",
        "High",
        "Major",
        `${holding.symbol} target achieved`,
        [`status:${status}`],
        holding
      );
    }
    if (status === "stopped") {
      pushPortfolio(
        "stop_loss_triggered",
        "Critical",
        "Critical",
        `${holding.symbol} stop loss triggered`,
        [`status:${status}`],
        holding
      );
    }
  }

  return decisions;
}

export function decideWatchlistAlerts(
  item: WatchlistItemSnapshot,
  prior: WatchlistItemSnapshot | null,
  opportunity?: OpportunitySnapshot | null
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const symbol = safeAlertText(item.symbol, "").toUpperCase();
  const company = safeAlertText(item.name, symbol || "Unknown Company");
  const conviction =
    metric(item.convictionScore) ?? metric(opportunity?.aiConvictionScore) ?? 0;
  const volumeRatio =
    metric(item.volumeRatio) ?? metric(opportunity?.volumeRatio);
  const category = safeAlertText(
    item.category ?? opportunity?.category,
    ""
  );
  const price = metric(item.price);
  const entryLow = metric(item.entryLow ?? opportunity?.entryZone.low);
  const entryHigh = metric(item.entryHigh ?? opportunity?.entryZone.high);
  const target1 = metric(item.target1 ?? opportunity?.target1);

  const push = (
    kind: WatchlistAlertKind,
    priority: AlertPriority,
    severity: AlertSeverity,
    reason: string,
    evidence: string[],
    confidence = conviction || 60
  ) => {
    decisions.push(
      buildDecision({
        kind,
        label: WATCHLIST_KIND_LABELS[kind],
        sourceEngine: "Watchlist",
        suggestedCategory: "Watchlist",
        suggestedPriority: priority,
        suggestedSeverity: severity,
        title: `${WATCHLIST_KIND_LABELS[kind]} — ${symbol}`,
        summary: reason,
        description: reason,
        reason,
        evidence,
        company,
        ticker: symbol,
        inPortfolio: false,
        inWatchlist: true,
        confidenceScore: confidence,
        groupKey: `watchlist::${symbol}::${kind}`,
        dedupeKey: `watchlist::${symbol}::${kind}`,
        metadata: { kind, category },
      })
    );
  };

  if (opportunity || conviction >= 60) {
    push(
      "watchlist_opportunity",
      "Medium",
      "Moderate",
      `Watchlist opportunity active for ${symbol}`,
      [
        ...(category ? [`category:${category}`] : []),
        `conviction:${conviction}`,
      ]
    );
  }

  if (category === "breakout" || (metric(opportunity?.momentum) ?? 0) >= 70) {
    push(
      "watchlist_breakout",
      "High",
      "Major",
      `Breakout conditions on watchlist symbol ${symbol}`,
      [`category:${category || "breakout"}`]
    );
  }

  if (
    category === "mean_reversion" ||
    (metric(item.changePercent) ?? 0) <= -5 ||
    (metric(opportunity?.relativeStrength) ?? 50) <= WEAK_RS
  ) {
    push(
      "watchlist_breakdown",
      "High",
      "Major",
      `Breakdown / weakness on watchlist symbol ${symbol}`,
      [`change:${item.changePercent}`]
    );
  }

  if (inEntryZone(price, entryLow, entryHigh) || nearLevel(price, entryLow) || nearLevel(price, entryHigh)) {
    push(
      "near_buy_zone",
      "High",
      "Major",
      `${symbol} trading near buy zone`,
      [
        ...(price != null ? [`price:${price}`] : []),
        ...(entryLow != null ? [`entryLow:${entryLow}`] : []),
        ...(entryHigh != null ? [`entryHigh:${entryHigh}`] : []),
      ]
    );
  }

  if (nearLevel(price, target1)) {
    push(
      "near_target",
      "Medium",
      "Moderate",
      `${symbol} approaching target`,
      [
        ...(price != null ? [`price:${price}`] : []),
        ...(target1 != null ? [`target1:${target1}`] : []),
      ]
    );
  }

  if (volumeRatio != null && volumeRatio >= HIGH_VOLUME_RATIO) {
    push(
      "high_volume",
      "Medium",
      "Moderate",
      `Elevated volume ratio ${volumeRatio} on ${symbol}`,
      [`volumeRatio:${volumeRatio}`]
    );
  }

  if (conviction >= HIGH_CONVICTION) {
    push(
      "high_conviction",
      "High",
      "Major",
      `High conviction watchlist name ${symbol} (${conviction})`,
      [`conviction:${conviction}`],
      conviction
    );
  }

  if (prior) {
    const prevConv = metric(prior.convictionScore) ?? 0;
    if (conviction - prevConv >= CONVICTION_DELTA) {
      push(
        "ai_score_improved",
        "Medium",
        "Moderate",
        `AI score improved from ${prevConv} to ${conviction}`,
        [`from:${prevConv}`, `to:${conviction}`]
      );
    }

    const prevVal = safeAlertText(prior.validationStatus, "");
    const curVal = safeAlertText(item.validationStatus, "");
    if (curVal && curVal !== prevVal) {
      push(
        "validation_updated",
        "Medium",
        "Moderate",
        `Validation updated to ${curVal}`,
        [`from:${prevVal || "none"}`, `to:${curVal}`]
      );
    }

    const prevTrust = metric(prior.trustScore);
    const curTrust = metric(item.trustScore);
    if (
      prevTrust != null &&
      curTrust != null &&
      Math.abs(curTrust - prevTrust) >= 3
    ) {
      push(
        "trust_updated",
        "Medium",
        "Moderate",
        `Trust updated from ${prevTrust} to ${curTrust}`,
        [`from:${prevTrust}`, `to:${curTrust}`],
        curTrust
      );
    }
  }

  return decisions;
}

function buildDecision(input: AlertDecision): AlertDecision {
  return {
    ...input,
    title: safeAlertText(input.title, input.label),
    summary: safeAlertText(input.summary, input.label),
    description: safeAlertText(input.description, input.summary),
    reason: safeAlertText(input.reason, input.label),
    evidence: input.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
    company: safeAlertText(input.company, input.ticker || "Unknown Company"),
    ticker: safeAlertText(input.ticker, ""),
  };
}

export function decisionToSourceEvent(decision: AlertDecision): AlertSourceEvent {
  return {
    sourceEngine: decision.sourceEngine,
    eventType: decision.kind,
    title: decision.title,
    summary: decision.summary,
    description: decision.description,
    reason: decision.reason,
    evidence: decision.evidence,
    company: decision.company,
    ticker: decision.ticker,
    inPortfolio: decision.inPortfolio,
    inWatchlist: decision.inWatchlist,
    suggestedCategory: decision.suggestedCategory,
    suggestedPriority: decision.suggestedPriority,
    suggestedSeverity: decision.suggestedSeverity,
    confidenceScore: decision.confidenceScore,
    groupKey: decision.groupKey,
    dedupeKey: decision.dedupeKey,
    metadata: {
      ...decision.metadata,
      kindLabel: decision.label,
    },
  };
}
