/**
 * Trade Outcome Engine — lifecycle helpers.
 * Maps paper exits → outcome taxonomy and computes excursions.
 */

import type { PaperExitReason, PaperTrade } from "@/lib/paper-trading/types";
import type { TradeOutcomeExitReason } from "@/lib/paper-trading/outcomes/types";

export const TRADE_OUTCOME_EXIT_REASONS: TradeOutcomeExitReason[] = [
  "TARGET_1",
  "TARGET_2",
  "TARGET_3",
  "STOP_LOSS",
  "MANUAL_EXIT",
  "TIME_EXIT",
  "INVALIDATED",
];

export function emptyExitReasonDistribution(): Record<
  TradeOutcomeExitReason,
  number
> {
  return {
    TARGET_1: 0,
    TARGET_2: 0,
    TARGET_3: 0,
    STOP_LOSS: 0,
    MANUAL_EXIT: 0,
    TIME_EXIT: 0,
    INVALIDATED: 0,
  };
}

export function mapPaperExitReason(
  reason: PaperExitReason | undefined | null
): TradeOutcomeExitReason | null {
  if (!reason) return null;
  switch (reason) {
    case "target_1":
      return "TARGET_1";
    case "target_2":
      return "TARGET_2";
    case "target_3":
      return "TARGET_3";
    case "stop_loss":
      return "STOP_LOSS";
    case "market_close":
    case "session_end":
      return "TIME_EXIT";
    case "recommendation_expired":
      return "INVALIDATED";
    default:
      return "MANUAL_EXIT";
  }
}

export function isTargetExit(reason: TradeOutcomeExitReason | null): boolean {
  return (
    reason === "TARGET_1" || reason === "TARGET_2" || reason === "TARGET_3"
  );
}

export function isStopLossExit(reason: TradeOutcomeExitReason | null): boolean {
  return reason === "STOP_LOSS";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function returnPercentAt(entry: number, price: number): number {
  if (!(entry > 0) || !(price > 0)) return 0;
  return ((price - entry) / entry) * 100;
}

/**
 * Peak favorable / adverse excursion % vs entry (long-oriented).
 * Prefer persisted trade fields; else reconstruct from timeline + realized return.
 */
export function computeTradeExcursions(trade: PaperTrade): {
  mfe: number;
  mae: number;
  maxDrawdown: number;
} {
  if (
    typeof trade.mfePercent === "number" ||
    typeof trade.maePercent === "number"
  ) {
    return {
      mfe: round2(Math.max(0, trade.mfePercent ?? 0)),
      mae: round2(Math.min(0, trade.maePercent ?? 0)),
      maxDrawdown: round2(Math.max(0, trade.maxDrawdownPercent ?? 0)),
    };
  }

  const entry = trade.entryPrice;
  const priced = trade.timeline
    .map((event) => event.price)
    .filter((price): price is number => typeof price === "number" && price > 0);

  if (trade.exitPrice && trade.exitPrice > 0) {
    priced.push(trade.exitPrice);
  }
  if (trade.currentPrice > 0) {
    priced.push(trade.currentPrice);
  }

  if (!(entry > 0) || priced.length === 0) {
    const realized = trade.returnPercent;
    return {
      mfe: round2(Math.max(0, realized)),
      mae: round2(Math.min(0, realized)),
      maxDrawdown: round2(Math.max(0, -Math.min(0, realized))),
    };
  }

  let mfe = 0;
  let mae = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const price of priced) {
    const ret = returnPercentAt(entry, price);
    mfe = Math.max(mfe, ret);
    mae = Math.min(mae, ret);
    peak = Math.max(peak, ret);
    maxDrawdown = Math.max(maxDrawdown, peak - ret);
  }
  mfe = Math.max(0, mfe, trade.returnPercent);
  mae = Math.min(0, mae, trade.returnPercent);

  return {
    mfe: round2(mfe),
    mae: round2(mae),
    maxDrawdown: round2(maxDrawdown),
  };
}

/**
 * Update running MFE / MAE / max drawdown for an open (or closing) trade.
 */
export function applyPriceExcursion(
  trade: PaperTrade,
  price: number
): Pick<PaperTrade, "mfePercent" | "maePercent" | "maxDrawdownPercent"> {
  const ret = returnPercentAt(trade.entryPrice, price);
  const prevMfe = trade.mfePercent ?? 0;
  const prevMae = trade.maePercent ?? 0;
  const prevDd = trade.maxDrawdownPercent ?? 0;
  const peak = Math.max(prevMfe, ret);
  const drawdown = Math.max(0, peak - ret);

  return {
    mfePercent: round2(Math.max(0, prevMfe, ret)),
    maePercent: round2(Math.min(0, prevMae, ret)),
    maxDrawdownPercent: round2(Math.max(prevDd, drawdown)),
  };
}

export function resolveHorizon(trade: PaperTrade): string {
  if (trade.horizon?.trim()) return trade.horizon.trim();
  const holding = trade.recommendation.holdingPeriod?.trim();
  if (holding) return holding;
  return trade.recommendation.primaryStrategyId || trade.strategy;
}

export function resolveSessionId(trade: PaperTrade): string | null {
  return (
    trade.sessionId ??
    trade.recommendation.sessionId ??
    null
  );
}

export function resolveScanId(trade: PaperTrade): string | null {
  return trade.scanId ?? trade.recommendation.scanId ?? null;
}

export function resolveTimeToFirstTargetMs(trade: PaperTrade): number | null {
  if (typeof trade.timeToFirstTargetMs === "number") {
    return trade.timeToFirstTargetMs;
  }
  const targetEvent = trade.timeline.find((e) =>
    e.type.startsWith("target_")
  );
  if (!targetEvent) return null;
  const ms = Date.parse(targetEvent.timestamp) - Date.parse(trade.entryAt);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export function resolveTimeToStopLossMs(trade: PaperTrade): number | null {
  if (typeof trade.timeToStopLossMs === "number") {
    return trade.timeToStopLossMs;
  }
  const stopEvent = trade.timeline.find((e) => e.type === "stop_loss_hit");
  if (!stopEvent) return null;
  const ms = Date.parse(stopEvent.timestamp) - Date.parse(trade.entryAt);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export function holdingDaysFromMs(holdingMs: number): number {
  return round2(Math.max(0, holdingMs) / 86_400_000);
}
