/**
 * Paper Trading Lab — automated validation engine (Sprint 11E.1).
 * Creates virtual BUY entries and manages exits without user interaction.
 * Does not modify Recommendation Engine state.
 */

import { marketDataService } from "@/lib/market-data/server";
import { getMarketStatus, isMarketOpen } from "@/lib/market/session";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import { PAPER_TRADING_CONFIG } from "@/lib/paper-trading/config";
import { computeTradePnl } from "@/lib/paper-trading/kpis";
import {
  loadPaperTradingState,
  savePaperTradingState,
} from "@/lib/paper-trading/persistence";
import { selectCandidatesForStrategy } from "@/lib/paper-trading/selection";
import type {
  PaperExitReason,
  PaperRecommendationSnapshot,
  PaperStrategy,
  PaperTimelineEvent,
  PaperTrade,
  PaperTradeStatus,
  PaperTradingState,
} from "@/lib/paper-trading/types";

const STRATEGIES: PaperStrategy[] = ["intraday", "scalping", "swing"];

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function ensureThreeTargets(targets: number[], entry: number): number[] {
  const cleaned = targets.filter((t) => Number.isFinite(t) && t > 0);
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  const result = [...cleaned];
  let last = result[result.length - 1] ?? entry * 1.01;
  while (result.length < 3) {
    last = Math.round(last * 1.01 * 100) / 100;
    result.push(last);
  }
  return result;
}

function buildAiExplanation(rec: SharedRecommendation): string {
  const parts: string[] = [];
  if (rec.reasons?.length) {
    parts.push(rec.reasons.slice(0, 3).join(" · "));
  }
  if (rec.evidence?.length) {
    parts.push(`Evidence: ${rec.evidence.slice(0, 2).join("; ")}`);
  }
  if (rec.marketContext) {
    parts.push(`Context: ${rec.marketContext}`);
  }
  if (parts.length === 0) {
    return `${rec.primaryStrategy} setup on ${rec.symbol} with ${rec.conviction.toFixed(0)} conviction.`;
  }
  return parts.join(" ");
}

function toSnapshot(rec: SharedRecommendation): PaperRecommendationSnapshot {
  return {
    recommendationId: rec.id,
    symbol: rec.symbol,
    company: rec.company,
    action: rec.action,
    primaryStrategy: rec.primaryStrategy,
    primaryStrategyId: rec.primaryStrategyId,
    conviction: rec.conviction,
    confidence: rec.confidence,
    opportunityScore: rec.opportunityScore,
    riskReward: rec.riskReward,
    entry: rec.entry,
    stopLoss: rec.stopLoss,
    targets: ensureThreeTargets(rec.targets, rec.entry),
    holdingPeriod: rec.holdingPeriod,
    reasons: rec.reasons ?? [],
    evidence: rec.evidence ?? [],
    marketContext: rec.marketContext ?? "",
    marketRegime: rec.marketRegime ?? "",
    timestamp: rec.timestamp,
    aiExplanation: buildAiExplanation(rec),
  };
}

function timelineEvent(
  type: PaperTimelineEvent["type"],
  label: string,
  timestamp: string,
  price?: number
): PaperTimelineEvent {
  return {
    id: createId("evt"),
    type,
    label,
    timestamp,
    price,
  };
}

function createTradeFromRecommendation(
  rec: SharedRecommendation,
  strategy: PaperStrategy,
  now: Date
): PaperTrade {
  const entryPrice = rec.entry;
  const shares = PAPER_TRADING_CONFIG.defaultShares;
  const targets = ensureThreeTargets(rec.targets, entryPrice);
  const snapshot = toSnapshot(rec);
  const entryAt = now.toISOString();
  const { pnl, returnPercent } = computeTradePnl(entryPrice, entryPrice, shares);

  return {
    id: createId("pt"),
    strategy,
    status: "open",
    symbol: rec.symbol.toUpperCase(),
    company: rec.company || rec.symbol,
    shares,
    entryPrice,
    entryAt,
    currentPrice: entryPrice,
    targetsHit: 0,
    stopLoss: rec.stopLoss,
    targets,
    confidence: rec.confidence,
    conviction: rec.conviction,
    riskReward: rec.riskReward,
    recommendationScore: rec.opportunityScore,
    pnl,
    returnPercent,
    holdingMs: 0,
    recommendation: snapshot,
    timeline: [
      timelineEvent(
        "recommendation_generated",
        "Recommendation Generated",
        rec.timestamp
      ),
      timelineEvent("buy_executed", "BUY Executed", entryAt, entryPrice),
    ],
    updatedAt: entryAt,
  };
}

function parseHoldingExpiryMs(
  holdingPeriod: string,
  strategy: PaperStrategy
): number {
  const minuteMatch = holdingPeriod.match(/(\d+)\s*[–-]\s*(\d+)\s*Minutes/i);
  if (minuteMatch) {
    const mid = (Number(minuteMatch[1]) + Number(minuteMatch[2])) / 2;
    return mid * 60 * 1000;
  }
  const dayMatch = holdingPeriod.match(
    /(\d+)\s*[–-]\s*(\d+)\s*(?:Trading\s+)?Days/i
  );
  if (dayMatch) {
    const mid = (Number(dayMatch[1]) + Number(dayMatch[2])) / 2;
    return mid * 24 * 60 * 60 * 1000;
  }
  return PAPER_TRADING_CONFIG.defaultExpiryMs[strategy];
}

function shouldExpireRecommendation(trade: PaperTrade, now: Date): boolean {
  const expiryMs = parseHoldingExpiryMs(
    trade.recommendation.holdingPeriod,
    trade.strategy
  );
  const age = now.getTime() - Date.parse(trade.entryAt);
  return age >= expiryMs;
}

/** IST minutes since midnight for session-end checks. */
function getIstMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hours * 60 + minutes;
}

const MARKET_CLOSE_MINUTES = 15 * 60 + 30; // 15:30 IST

function shouldForceSessionClose(
  strategy: PaperStrategy,
  now: Date
): boolean {
  if (strategy === "swing") return false;

  const status = getMarketStatus(now);
  const afterClose =
    !isMarketOpen(now) &&
    (status === "post_close" || status === "closed" || status === "holiday");

  if (strategy === "intraday") {
    return afterClose;
  }

  // Scalping: force close before session end if still open
  if (strategy === "scalping") {
    if (afterClose) return true;
    if (!isMarketOpen(now)) return false;
    const cutoff =
      MARKET_CLOSE_MINUTES - PAPER_TRADING_CONFIG.scalpingCloseBeforeMinutes;
    return getIstMinutes(now) >= cutoff;
  }

  return false;
}

function highestTargetHit(trade: PaperTrade, price: number): 0 | 1 | 2 | 3 {
  let hit: 0 | 1 | 2 | 3 = 0;
  for (let i = 0; i < trade.targets.length; i++) {
    if (price >= trade.targets[i]) {
      hit = (i + 1) as 1 | 2 | 3;
    }
  }
  return hit;
}

function statusFromExit(reason: PaperExitReason): PaperTradeStatus {
  switch (reason) {
    case "target_1":
      return "target_1_hit";
    case "target_2":
      return "target_2_hit";
    case "target_3":
      return "target_3_hit";
    case "stop_loss":
      return "stop_loss_hit";
    case "recommendation_expired":
      return "expired";
    case "market_close":
    case "session_end":
    default:
      return "closed";
  }
}

function resolveExit(
  trade: PaperTrade,
  price: number,
  now: Date
): {
  reason: PaperExitReason;
  label: string;
  highestTarget: 0 | 1 | 2 | 3;
} | null {
  if (price <= trade.stopLoss) {
    return {
      reason: "stop_loss",
      label: "Stop Loss Hit",
      highestTarget: 0,
    };
  }

  const hit = highestTargetHit(trade, price);
  if (hit >= 1) {
    return {
      reason: `target_${hit}` as PaperExitReason,
      label: `Target ${hit} Hit`,
      highestTarget: hit,
    };
  }

  if (shouldExpireRecommendation(trade, now)) {
    return {
      reason: "recommendation_expired",
      label: "Recommendation Expired",
      highestTarget: 0,
    };
  }

  if (shouldForceSessionClose(trade.strategy, now)) {
    const isScalpingEarly =
      trade.strategy === "scalping" && isMarketOpen(now);
    return {
      reason: isScalpingEarly ? "session_end" : "market_close",
      label: isScalpingEarly
        ? "Scalping Session End"
        : "Intraday Market Close",
      highestTarget: 0,
    };
  }

  return null;
}

function closeTrade(
  trade: PaperTrade,
  exitPrice: number,
  reason: PaperExitReason,
  label: string,
  highestTarget: 0 | 1 | 2 | 3,
  now: Date
): PaperTrade {
  const exitAt = now.toISOString();
  const { pnl, returnPercent } = computeTradePnl(
    trade.entryPrice,
    exitPrice,
    trade.shares
  );
  const holdingMs = Math.max(0, now.getTime() - Date.parse(trade.entryAt));
  const targetsHit = Math.max(trade.targetsHit, highestTarget);
  const timeline = [...trade.timeline];

  if (reason.startsWith("target_")) {
    for (let level = trade.targetsHit + 1; level <= highestTarget; level++) {
      const isFinal = level === highestTarget;
      timeline.push(
        timelineEvent(
          `target_${level as 1 | 2 | 3}_hit`,
          isFinal ? label : `Target ${level} Hit`,
          exitAt,
          exitPrice
        )
      );
    }
  } else if (reason === "stop_loss") {
    timeline.push(timelineEvent("stop_loss_hit", label, exitAt, exitPrice));
  } else if (reason === "market_close") {
    timeline.push(timelineEvent("market_close", label, exitAt, exitPrice));
  } else if (reason === "session_end") {
    timeline.push(timelineEvent("session_end", label, exitAt, exitPrice));
  } else if (reason === "recommendation_expired") {
    timeline.push(
      timelineEvent("recommendation_expired", label, exitAt, exitPrice)
    );
  }

  timeline.push(timelineEvent("closed", "Closed", exitAt, exitPrice));

  return {
    ...trade,
    status: statusFromExit(reason),
    currentPrice: exitPrice,
    exitPrice,
    exitAt,
    exitReason: reason,
    targetsHit,
    pnl,
    returnPercent,
    holdingMs,
    timeline,
    updatedAt: exitAt,
  };
}

async function fetchPrices(symbols: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
  const prices = new Map<string, number>();
  if (unique.length === 0) return prices;

  try {
    const quotes = await marketDataService.getQuotes(unique);
    for (const [symbol, quote] of quotes) {
      const price = quote?.data?.ltp;
      if (typeof price === "number" && price > 0) {
        prices.set(symbol.toUpperCase(), price);
      }
    }
  } catch {
    // Keep last known prices when quote fetch fails.
  }
  return prices;
}

function openCountForStrategy(
  trades: readonly PaperTrade[],
  strategy: PaperStrategy
): number {
  return trades.filter((t) => t.status === "open" && t.strategy === strategy)
    .length;
}

/**
 * Run one automated paper-trading cycle:
 * 1) Mark-to-market open positions
 * 2) Auto-exit on SL / targets / expiry / session close
 * 3) Auto-enter highest-conviction recommendations (≤7 per strategy)
 */
export async function runPaperTradingCycle(
  recommendations: readonly SharedRecommendation[],
  options?: { now?: Date; persist?: boolean }
): Promise<PaperTradingState> {
  const now = options?.now ?? new Date();
  const persist = options?.persist !== false;
  const state = loadPaperTradingState();
  const testedIds = new Set(state.testedRecommendationIds);
  const marketClosed = !isMarketOpen(now);

  let trades = [...state.trades];
  const openSymbols = new Set(
    trades
      .filter((t) => t.status === "open")
      .map((t) => t.symbol.toUpperCase())
  );

  // --- Entries ---
  for (const strategy of STRATEGIES) {
    const openSlots =
      PAPER_TRADING_CONFIG.maxTradesPerStrategy -
      openCountForStrategy(trades, strategy);
    if (openSlots <= 0) continue;

    // Skip new intraday/scalping entries when market is closed
    if (
      marketClosed &&
      (strategy === "intraday" || strategy === "scalping")
    ) {
      continue;
    }

    const candidates = selectCandidatesForStrategy(recommendations, strategy, {
      testedIds,
      openSymbols,
      openSlotsRemaining: openSlots,
    });

    for (const rec of candidates) {
      const trade = createTradeFromRecommendation(rec, strategy, now);
      trades.push(trade);
      testedIds.add(rec.id);
      openSymbols.add(trade.symbol);
    }
  }

  // --- Mark-to-market + exits ---
  const openTrades = trades.filter((t) => t.status === "open");
  const prices = await fetchPrices(openTrades.map((t) => t.symbol));

  trades = trades.map((trade) => {
    if (trade.status !== "open") return trade;

    const price = prices.get(trade.symbol) ?? trade.currentPrice;
    const nowIso = now.toISOString();
    const holdingMs = Math.max(0, now.getTime() - Date.parse(trade.entryAt));
    const { pnl, returnPercent } = computeTradePnl(
      trade.entryPrice,
      price,
      trade.shares
    );

    const updated: PaperTrade = {
      ...trade,
      currentPrice: price,
      pnl,
      returnPercent,
      holdingMs,
      updatedAt: nowIso,
    };

    const exit = resolveExit(updated, price, now);
    if (exit) {
      return closeTrade(
        updated,
        price,
        exit.reason,
        exit.label,
        exit.highestTarget,
        now
      );
    }

    return updated;
  });

  const next: PaperTradingState = {
    version: 1,
    updatedAt: now.toISOString(),
    lastSyncAt: now.toISOString(),
    trades,
    testedRecommendationIds: Array.from(testedIds),
  };

  if (persist) {
    savePaperTradingState(next);
  }

  return next;
}

export function getPaperTradingState(): PaperTradingState {
  return loadPaperTradingState();
}
