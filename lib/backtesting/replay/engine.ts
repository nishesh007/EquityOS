/**
 * Sprint 11B.2 — Deterministic historical replay engine.
 * Guarantees no look-ahead: visible state never includes future bars/events/markers.
 */

import type {
  CorporateActionRecord,
  HistoricalDatasetBundle,
  HistoricalEventRecord,
  OhlcvBar,
} from "@/lib/backtesting/dataset/types";
import type {
  BacktestRecommendationSnapshot,
  BacktestSession,
  BacktestTrade,
  BacktestTradeEvent,
  ReplayConfiguration,
} from "@/lib/backtesting/types";

export type ReplaySpeed = 1 | 2 | 5 | 10 | 20;

export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10, 20];

/** Interval between auto-advance ticks at 1x (ms). Higher speeds divide this. */
export const REPLAY_BASE_TICK_MS = 800;

export type TradeMarkerKind =
  | "buy"
  | "stop_loss"
  | "target_1"
  | "target_2"
  | "target_3"
  | "sell";

export interface TradeMarker {
  id: string;
  kind: TradeMarkerKind;
  label: string;
  at: string;
  price: number;
  /** Index into the sorted OHLCV timeline (same order as steps). */
  barIndex: number;
  tradeId: string;
}

export interface ReplayTimelineStep {
  index: number;
  asOf: string;
  bar: OhlcvBar;
}

export interface ReplayBundle {
  session: BacktestSession;
  dataset: HistoricalDatasetBundle;
  steps: readonly ReplayTimelineStep[];
  markers: readonly TradeMarker[];
  configuration: ReplayConfiguration;
}

export interface ReplayStatistics {
  elapsedReplayTimeMs: number;
  tradesExecuted: number;
  openTrades: number;
  closedTrades: number;
  currentPnl: number;
  replayProgress: number;
  cursor: number;
  totalSteps: number;
  asOf: string | null;
}

export interface ReplayVisibleState {
  cursor: number;
  asOf: string | null;
  visibleBars: readonly OhlcvBar[];
  visibleMarkers: readonly TradeMarker[];
  visibleEvents: readonly HistoricalEventRecord[];
  visibleCorporateActions: readonly CorporateActionRecord[];
  recommendationTimeline: readonly BacktestRecommendationSnapshot[];
  /** Most recent recommendation with asOf <= current asOf (or null). */
  activeRecommendation: BacktestRecommendationSnapshot | null;
  tradeTimeline: readonly BacktestTradeEvent[];
  openTrades: readonly BacktestTrade[];
  closedTrades: readonly BacktestTrade[];
  statistics: ReplayStatistics;
}

function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortBars(bars: readonly OhlcvBar[]): OhlcvBar[] {
  return [...bars].sort((a, b) => {
    const byTime = compareIso(a.timestamp, b.timestamp);
    if (byTime !== 0) return byTime;
    return a.symbol.localeCompare(b.symbol);
  });
}

function findBarIndex(
  steps: readonly ReplayTimelineStep[],
  iso: string
): number {
  let best = -1;
  for (const step of steps) {
    if (compareIso(step.asOf, iso) <= 0) best = step.index;
    else break;
  }
  return best;
}

function markerKindFromEvent(
  type: string,
  targetIndex?: number
): TradeMarkerKind | null {
  const t = type.toLowerCase();
  if (t === "entry" || t === "buy") return "buy";
  if (t === "stop_loss") return "stop_loss";
  if (t === "target") {
    if (targetIndex === 1) return "target_2";
    if (targetIndex === 2) return "target_3";
    return "target_1";
  }
  if (t.startsWith("target_")) {
    if (t === "target_2") return "target_2";
    if (t === "target_3") return "target_3";
    return "target_1";
  }
  if (
    t === "sell" ||
    t === "session_end" ||
    t === "rule_exit" ||
    t === "time_exit" ||
    t === "expiry" ||
    t === "closed"
  ) {
    return "sell";
  }
  return null;
}

function markerLabel(kind: TradeMarkerKind): string {
  switch (kind) {
    case "buy":
      return "BUY";
    case "stop_loss":
      return "STOP LOSS";
    case "target_1":
      return "TARGET 1";
    case "target_2":
      return "TARGET 2";
    case "target_3":
      return "TARGET 3";
    case "sell":
      return "SELL";
  }
}

/**
 * Build a deterministic replay bundle from a completed session + dataset.
 * Same inputs always produce the same steps/markers order.
 */
export function buildReplayBundle(input: {
  session: BacktestSession;
  dataset: HistoricalDatasetBundle;
  speed?: ReplaySpeed;
}): ReplayBundle {
  const steps: ReplayTimelineStep[] = sortBars(input.dataset.ohlcv).map(
    (bar, index) => ({
      index,
      asOf: bar.timestamp,
      bar,
    })
  );

  const markers: TradeMarker[] = [];
  for (const trade of input.session.trades) {
    for (const event of trade.timeline) {
      const kind = markerKindFromEvent(event.type, trade.targetIndex);
      if (!kind) continue;
      if (event.price == null || !Number.isFinite(event.price)) continue;
      const barIndex = findBarIndex(steps, event.at);
      if (barIndex < 0) continue;
      markers.push({
        id: `${trade.id}:${event.id}`,
        kind,
        label: markerLabel(kind),
        at: event.at,
        price: event.price,
        barIndex,
        tradeId: trade.id,
      });
    }
  }

  markers.sort((a, b) => {
    if (a.barIndex !== b.barIndex) return a.barIndex - b.barIndex;
    return a.id.localeCompare(b.id);
  });

  return {
    session: input.session,
    dataset: input.dataset,
    steps,
    markers,
    configuration: {
      sessionId: input.session.id,
      speed: input.speed ?? 1,
      startAt: steps[0]?.asOf,
      endAt: steps[steps.length - 1]?.asOf,
      includeCorporateActions: true,
      includeEvents: true,
      includeRegime: true,
    },
  };
}

function isAtOrBefore(iso: string, asOf: string): boolean {
  return compareIso(iso, asOf) <= 0;
}

/**
 * Slice the universe to what was knowable at `cursor`.
 * This is the anti-look-ahead gate used by the Replay Center UI.
 */
export function sliceReplayVisibleState(
  bundle: ReplayBundle,
  cursor: number,
  options: { startedAtMs?: number; nowMs?: number } = {}
): ReplayVisibleState {
  const total = bundle.steps.length;
  const safeCursor =
    total === 0 ? -1 : Math.min(Math.max(cursor, 0), total - 1);
  const asOf = safeCursor >= 0 ? bundle.steps[safeCursor].asOf : null;

  const visibleBars =
    safeCursor < 0
      ? []
      : bundle.steps.slice(0, safeCursor + 1).map((step) => step.bar);

  const visibleMarkers =
    safeCursor < 0
      ? []
      : bundle.markers.filter((marker) => marker.barIndex <= safeCursor);

  const visibleEvents = asOf
    ? bundle.dataset.events.filter((event) => isAtOrBefore(event.at, asOf))
    : [];

  const visibleCorporateActions = asOf
    ? bundle.dataset.corporateActions.filter((action) =>
        isAtOrBefore(action.exDate, asOf)
      )
    : [];

  const recommendationTimeline = asOf
    ? bundle.dataset.recommendations
        .filter((rec) => isAtOrBefore(rec.asOf, asOf))
        .sort((a, b) => compareIso(a.asOf, b.asOf))
    : [];

  const activeRecommendation =
    recommendationTimeline.length > 0
      ? recommendationTimeline[recommendationTimeline.length - 1]
      : null;

  const openTrades = asOf
    ? bundle.session.trades.filter((trade) => {
        if (!trade.entryAt) return false;
        if (!isAtOrBefore(trade.entryAt, asOf)) return false;
        if (trade.exitAt && isAtOrBefore(trade.exitAt, asOf)) return false;
        return true;
      })
    : [];

  const closedTrades = asOf
    ? bundle.session.trades.filter(
        (trade) => trade.exitAt != null && isAtOrBefore(trade.exitAt, asOf)
      )
    : [];

  const tradeTimeline = asOf
    ? bundle.session.trades
        .flatMap((trade) => trade.timeline)
        .filter((event) => isAtOrBefore(event.at, asOf))
        .sort((a, b) => compareIso(a.at, b.at) || a.id.localeCompare(b.id))
    : [];

  const currentPnl =
    closedTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0) +
    openTrades.reduce((sum, trade) => {
      const last = visibleBars[visibleBars.length - 1];
      if (!last || trade.entryPrice == null) return sum;
      return sum + (last.close - trade.entryPrice) * trade.shares;
    }, 0);

  const startedAtMs = options.startedAtMs ?? 0;
  const nowMs = options.nowMs ?? startedAtMs;
  const elapsedReplayTimeMs = Math.max(0, nowMs - startedAtMs);

  const statistics: ReplayStatistics = {
    elapsedReplayTimeMs,
    tradesExecuted: openTrades.length + closedTrades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    currentPnl,
    replayProgress: total <= 0 ? 0 : ((safeCursor + 1) / total) * 100,
    cursor: safeCursor,
    totalSteps: total,
    asOf,
  };

  return {
    cursor: safeCursor,
    asOf,
    visibleBars,
    visibleMarkers,
    visibleEvents,
    visibleCorporateActions,
    recommendationTimeline,
    activeRecommendation,
    tradeTimeline,
    openTrades,
    closedTrades,
    statistics,
  };
}

export function clampReplayCursor(
  cursor: number,
  totalSteps: number
): number {
  if (totalSteps <= 0) return -1;
  return Math.min(Math.max(cursor, 0), totalSteps - 1);
}

export function jumpReplayToDate(
  bundle: ReplayBundle,
  isoDate: string
): number {
  if (bundle.steps.length === 0) return -1;
  const target = isoDate.includes("T")
    ? isoDate
    : `${isoDate}T23:59:59.999Z`;
  const idx = findBarIndex(bundle.steps, target);
  return idx < 0 ? 0 : idx;
}

export function tickIntervalMs(speed: ReplaySpeed): number {
  return Math.max(40, Math.round(REPLAY_BASE_TICK_MS / speed));
}

/** Hash-stable fingerprint for determinism tests. */
export function fingerprintReplayBundle(bundle: ReplayBundle): string {
  const steps = bundle.steps.map((s) => `${s.index}:${s.asOf}:${s.bar.close}`);
  const markers = bundle.markers.map(
    (m) => `${m.id}:${m.barIndex}:${m.kind}:${m.price}`
  );
  return `${bundle.session.id}|${steps.join(",")}|${markers.join(",")}`;
}
