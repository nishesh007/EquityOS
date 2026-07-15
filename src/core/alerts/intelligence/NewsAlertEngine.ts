/**
 * News Alert Intelligence — Sprint 9C.R3.
 * Accepts news snapshots (live feed or seed); no duplicated research ranking.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  buildEventDecision,
  classifyNewsKinds,
  EVENT_ALERT_EMPTY,
  NEWS_KIND_LABELS,
  type NewsAlertKind,
  type NewsAlertSnapshot,
} from "./AlertInsightModels";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

export interface NewsAlertInput {
  news: NewsAlertSnapshot[];
  now?: Date;
}

function priorityForKind(kind: NewsAlertKind): AlertPriority {
  switch (kind) {
    case "breaking_news":
    case "analyst_downgrade":
    case "negative_news":
      return "High";
    case "analyst_upgrade":
    case "large_order_win":
    case "major_contract":
    case "management_change":
      return "High";
    case "target_price_change":
    case "policy_news":
      return "Medium";
    default:
      return "Medium";
  }
}

function severityForKind(kind: NewsAlertKind): AlertSeverity {
  switch (kind) {
    case "breaking_news":
    case "negative_news":
    case "analyst_downgrade":
      return "Major";
    case "positive_news":
    case "analyst_upgrade":
    case "large_order_win":
      return "Moderate";
    default:
      return "Moderate";
  }
}

export function decideNewsAlerts(snap: NewsAlertSnapshot): AlertDecision[] {
  const kinds = classifyNewsKinds(snap);
  const ticker = safeAlertText(snap.symbol, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker || "Market");

  return kinds.map((kind) => {
    const label = NEWS_KIND_LABELS[kind];
    return buildEventDecision({
      kind,
      label,
      sourceEngine: "News",
      suggestedCategory: "News",
      suggestedPriority: priorityForKind(kind),
      suggestedSeverity: severityForKind(kind),
      title: `${label} — ${safeAlertText(snap.title, company)}`,
      summary: safeAlertText(snap.summary, snap.title),
      reason: `News classified as ${label}`,
      evidence: [
        `source:${snap.source}`,
        `published:${snap.publishedAt}`,
        ...(snap.tags ?? []).map((t) => `tag:${t}`),
        ...(snap.sector ? [`sector:${snap.sector}`] : []),
      ],
      company,
      ticker,
      inPortfolio: snap.inPortfolio,
      inWatchlist: snap.inWatchlist,
      confidenceScore: snap.confidenceScore ?? 62,
      groupPrefix: "news",
      metadata: {
        relatedReport: "news",
        newsId: snap.id,
        businessImpact: snap.businessImpact ?? 50,
        urgency: snap.urgency ?? (kind === "breaking_news" ? 90 : 50),
        sector: snap.sector ?? "",
      },
    });
  });
}

export class NewsAlertEngine {
  generate(input: NewsAlertInput): EventIntelBatch {
    const now = input.now ?? new Date();
    if (!input.news.length) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.noNews);
    }
    const decisions = input.news.flatMap(decideNewsAlerts);
    return emitDecisionsAsBatch(decisions, EVENT_ALERT_EMPTY.noNews, now);
  }
}

let singleton: NewsAlertEngine | null = null;

export function getNewsAlertEngine(): NewsAlertEngine {
  if (!singleton) singleton = new NewsAlertEngine();
  return singleton;
}

export function resetNewsAlertEngine(): void {
  singleton = null;
}

/** Public API — generateNewsAlerts() */
export function generateNewsAlerts(input: NewsAlertInput): EventIntelBatch {
  try {
    return getNewsAlertEngine().generate(input);
  } catch {
    return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingAnalysis);
  }
}
