/**
 * Build ValidationTradeRecord[] from demo replay bundles (deterministic).
 * Does not mutate BacktestTrade / recommendation engine outputs.
 */

import { listDemoReplayBundles, type ReplayBundle } from "@/lib/backtesting/replay";
import type {
  FailureCategory,
  MarketCapBucket,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";

const SYMBOL_META: Record<
  string,
  { sector: string; marketCap: MarketCapBucket }
> = {
  RELIANCE: { sector: "Energy", marketCap: "large" },
  TCS: { sector: "Information Technology", marketCap: "large" },
};

function plannedRr(
  entry: number | null | undefined,
  stop: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (entry == null || stop == null || target == null) return null;
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  return Math.abs(target - entry) / risk;
}

function enrichFromBundle(bundle: ReplayBundle): ValidationTradeRecord[] {
  const session = bundle.session;
  const recById = new Map(
    bundle.dataset.recommendations.map((r) => [r.recommendationId, r])
  );
  const events = bundle.dataset.events;

  return session.trades.map((trade) => {
    const rec = trade.recommendationId
      ? recById.get(trade.recommendationId)
      : undefined;
    const meta = SYMBOL_META[trade.symbol] ?? {
      sector: "Unknown",
      marketCap: "unknown" as MarketCapBucket,
    };
    const entry = trade.entryPrice ?? rec?.entry ?? null;
    const intended = rec?.entry ?? entry;
    const entryTimingBps =
      entry != null && intended != null && intended > 0
        ? ((entry - intended) / intended) * 10_000
        : null;
    const stop = rec?.stopLoss ?? null;
    const stopDistancePct =
      entry != null && stop != null && entry > 0
        ? (Math.abs(entry - stop) / entry) * 100
        : null;
    const firstTarget = rec?.targets?.[0] ?? null;
    const plannedRiskReward = plannedRr(intended, stop, firstTarget);
    const realizedRiskReward =
      trade.entryPrice != null &&
      stop != null &&
      trade.exitPrice != null &&
      Math.abs(trade.entryPrice - stop) > 0
        ? (trade.exitPrice - trade.entryPrice) /
          Math.abs(trade.entryPrice - stop)
        : null;

    const failureSeed: FailureCategory[] = [];
    if (trade.exitAt) {
      const nearEarnings = events.some(
        (e) =>
          e.eventType === "earnings" &&
          e.symbol === trade.symbol &&
          Math.abs(
            new Date(e.at).getTime() - new Date(trade.exitAt as string).getTime()
          ) <
            3 * 86_400_000
      );
      if (nearEarnings) failureSeed.push("earnings_impact");
      const nearMacro = events.some(
        (e) =>
          e.eventType === "macro" &&
          Math.abs(
            new Date(e.at).getTime() - new Date(trade.exitAt as string).getTime()
          ) <
            2 * 86_400_000
      );
      if (nearMacro) failureSeed.push("macro_event");
    }
    if (bundle.dataset.regimes.some((r) => r.regime === "volatile")) {
      failureSeed.push("high_volatility");
    }

    return {
      id: trade.id,
      sessionId: session.id,
      strategyId: session.strategyId,
      strategyLabel: session.strategyLabel,
      symbol: trade.symbol,
      company: trade.company,
      sector: meta.sector,
      marketCap: meta.marketCap,
      marketRegime: rec?.marketRegime ?? bundle.dataset.regimes[0]?.regime ?? "unknown",
      universeLabel: session.universe.label ?? session.universe.symbols.join(","),
      entryAt: trade.entryAt ?? session.startDate,
      exitAt: trade.exitAt ?? null,
      returnPercent: trade.returnPercent ?? 0,
      pnl: trade.pnl ?? 0,
      holdingMs: trade.holdingMs ?? 0,
      hitTarget: trade.hitTarget ?? false,
      hitStopLoss: trade.hitStopLoss ?? false,
      targetIndex: trade.targetIndex ?? null,
      conviction: rec?.conviction ?? null,
      recommendationScore: rec?.recommendationScore ?? null,
      riskLabel: rec?.riskLabel ?? null,
      entryTimingBps,
      stopDistancePct,
      plannedRiskReward,
      realizedRiskReward,
      failureCategories: failureSeed,
      status: trade.status === "open" ? "open" : "closed",
    };
  });
}

export function buildValidationUniverse(
  bundles: readonly ReplayBundle[] = listDemoReplayBundles()
): ValidationTradeRecord[] {
  return bundles.flatMap(enrichFromBundle);
}
