/**
 * Watchlist Change Engine — delta tracking (Sprint 10B.R3).
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyChangesView,
  safeIntelNumber,
  safeIntelText,
  type ChangeKind,
  type WatchlistChangeItem,
  type WatchlistChangesView,
  type WatchlistIntelligenceContext,
} from "./WatchlistPresentationModels";

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function pushChange(
  out: WatchlistChangeItem[],
  ticker: string,
  kind: ChangeKind,
  summary: string,
  delta: string,
  at: string
): void {
  out.push({ ticker, kind, summary, delta, at });
}

export function getWatchlistChanges(
  context?: WatchlistIntelligenceContext | null
): WatchlistChangesView {
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const current = context?.snapshots ?? {};
  const prior = context?.priorSnapshots ?? {};
  const metrics = context?.metricsBySymbol ?? {};
  const alerts = context?.alertHistory ?? [];
  const at = stamp(context?.now);

  if (!symbols.length) {
    return emptyChangesView(WATCHLIST_INTELLIGENCE_EMPTY.noChanges);
  }

  const items: WatchlistChangeItem[] = [];

  for (const ticker of symbols) {
    const cur = current[ticker];
    const prev = prior[ticker];
    if (!cur) continue;

    if (prev && cur.changePercent !== prev.changePercent) {
      const delta = (cur.changePercent - prev.changePercent).toFixed(2);
      pushChange(
        items,
        ticker,
        "price_movement",
        `Price action shifted ${delta}%`,
        `${delta}%`,
        at
      );
    }

    if (
      prev &&
      cur.convictionScore != null &&
      prev.convictionScore != null &&
      cur.convictionScore !== prev.convictionScore
    ) {
      const delta = safeIntelNumber(cur.convictionScore) - safeIntelNumber(prev.convictionScore);
      pushChange(
        items,
        ticker,
        "conviction_change",
        `Conviction ${delta >= 0 ? "increased" : "decreased"}`,
        `${delta >= 0 ? "+" : ""}${delta}`,
        at
      );
    }

    if (
      prev &&
      cur.trustScore != null &&
      prev.trustScore != null &&
      cur.trustScore !== prev.trustScore
    ) {
      const delta = safeIntelNumber(cur.trustScore) - safeIntelNumber(prev.trustScore);
      pushChange(
        items,
        ticker,
        "trust_change",
        `Trust score updated`,
        `${delta >= 0 ? "+" : ""}${delta}`,
        at
      );
    }

    const curVal = safeIntelText(cur.validationStatus, "");
    const prevVal = prev ? safeIntelText(prev.validationStatus, "") : "";
    if (prev && curVal && prevVal && curVal !== prevVal) {
      pushChange(
        items,
        ticker,
        "validation_change",
        `Validation status: ${prevVal} → ${curVal}`,
        curVal,
        at
      );
    }

    const tech = metrics[ticker];
    const priorTech = prior ? metrics[`${ticker}_prior`] : undefined;
    if (tech && priorTech) {
      const momNow = safeIntelNumber(tech.momentum as number | null, NaN);
      const momPrev = safeIntelNumber(priorTech.momentum as number | null, NaN);
      if (Number.isFinite(momNow) && Number.isFinite(momPrev) && momNow !== momPrev) {
        pushChange(
          items,
          ticker,
          "technical_change",
          `Momentum shifted to ${momNow}`,
          `${momNow - momPrev >= 0 ? "+" : ""}${(momNow - momPrev).toFixed(1)}`,
          at
        );
      }
    }

    if (tech && priorTech) {
      const peNow = safeIntelNumber(tech.pe as number | null, NaN);
      const pePrev = safeIntelNumber(priorTech.pe as number | null, NaN);
      if (Number.isFinite(peNow) && Number.isFinite(pePrev) && peNow !== pePrev) {
        pushChange(
          items,
          ticker,
          "fundamental_change",
          `PE ratio updated`,
          `${peNow}`,
          at
        );
      }
    }
  }

  for (const alert of alerts) {
    const ticker = safeIntelText(alert.ticker, "").toUpperCase();
    if (!ticker || !symbols.includes(ticker)) continue;
    pushChange(
      items,
      ticker,
      "alert_history",
      safeIntelText(alert.title, "Alert"),
      "alert",
      safeIntelText(alert.at, at)
    );
  }

  if (items.length === 0) {
    return emptyChangesView(WATCHLIST_INTELLIGENCE_EMPTY.noChanges);
  }

  return {
    items: items.sort((a, b) => b.at.localeCompare(a.at)),
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

export class WatchlistChangeEngine {
  getWatchlistChanges = getWatchlistChanges;
}
