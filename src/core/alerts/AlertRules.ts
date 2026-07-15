/**
 * Institutional AI Alert Engine — central rules (Sprint 9C.R1).
 * Priority, confidence, severity, deduplication, grouping, expiration, suppression, source weighting.
 */

import {
  ALERT_CATEGORY_ATTENTION_RANK,
  resolveAlertCategory,
  type AlertCategory,
} from "./AlertCategory";
import {
  resolveAlertConfidence,
  type AlertConfidence,
} from "./AlertConfidence";
import type { AlertContext } from "./AlertContext";
import {
  ALERT_PRIORITY_RANK,
  resolveAlertPriorityBand,
  type AlertPriority,
} from "./AlertPriority";
import {
  ALERT_SEVERITY_RANK,
  resolveAlertSeverityBand,
  type AlertSeverity,
} from "./AlertSeverity";
import {
  getSourceWeight,
  type AlertSourceEvent,
  type AlertSourceEngine,
} from "./AlertTypes";
import { safeAlertText } from "./AlertModels";

const CATEGORY_BY_SOURCE: Record<AlertSourceEngine, AlertCategory> = {
  "AI Research": "Opportunity",
  Earnings: "Earnings",
  Portfolio: "Portfolio",
  Watchlist: "Watchlist",
  Validation: "Validation",
  Trust: "Trust",
  Reports: "Platform",
  Market: "Technical",
  "Corporate Actions": "Corporate Action",
  News: "News",
  Screener: "Opportunity",
  Platform: "Platform",
};

const PRIORITY_BY_EVENT_HINT: Array<{
  pattern: RegExp;
  priority: AlertPriority;
}> = [
  { pattern: /critical|breach|halt|reject|fail/i, priority: "Critical" },
  { pattern: /major|miss|risk|downgrade|cut|alert/i, priority: "High" },
  { pattern: /watch|caution|warning|elevated/i, priority: "Medium" },
  { pattern: /info|update|note|summary/i, priority: "Informational" },
];

const SEVERITY_HINTS: Array<{ pattern: RegExp; severity: AlertSeverity }> = [
  { pattern: /critical|breach|halt|reject/i, severity: "Critical" },
  { pattern: /major|miss|fail|downgrade/i, severity: "Major" },
  { pattern: /moderate|caution|watch|elevated/i, severity: "Moderate" },
  { pattern: /minor|low/i, severity: "Minor" },
  { pattern: /info|update|note/i, severity: "Informational" },
];

export interface AlertRuleEvaluation {
  category: AlertCategory;
  priority: AlertPriority;
  severity: AlertSeverity;
  confidence: AlertConfidence;
  sourceWeight: number;
  expiresAt: string;
  suppress: boolean;
  groupKey: string;
  dedupeKey: string;
}

export function resolveCategoryFromEvent(
  event: AlertSourceEvent,
  ctx: AlertContext
): AlertCategory {
  if (ctx.categoryHint) return ctx.categoryHint;
  if (event.suggestedCategory) {
    return resolveAlertCategory(
      event.suggestedCategory,
      CATEGORY_BY_SOURCE[ctx.sourceEngine]
    );
  }
  return CATEGORY_BY_SOURCE[ctx.sourceEngine] ?? "Platform";
}

export function calculateAlertPriority(
  event: AlertSourceEvent,
  ctx: AlertContext,
  category: AlertCategory
): AlertPriority {
  if (ctx.priorityHint) return ctx.priorityHint;
  if (event.suggestedPriority) {
    return resolveAlertPriorityBand(event.suggestedPriority, "Medium");
  }

  let base: AlertPriority = "Medium";
  const haystack = `${event.eventType} ${event.title ?? ""} ${event.reason ?? ""}`;
  for (const hint of PRIORITY_BY_EVENT_HINT) {
    if (hint.pattern.test(haystack)) {
      base = hint.priority;
      break;
    }
  }

  if (ctx.inPortfolio && ALERT_PRIORITY_RANK[base] > 0) {
    base = bumpPriority(base);
  } else if (ctx.inWatchlist && ALERT_PRIORITY_RANK[base] > 1) {
    base = bumpPriority(base);
  }

  if (
    ALERT_CATEGORY_ATTENTION_RANK[category] <= 3 &&
    ALERT_PRIORITY_RANK[base] > 0
  ) {
    base = bumpPriority(base);
  }

  const weight = getSourceWeight(ctx.sourceEngine);
  if (weight >= 1.15 && ALERT_PRIORITY_RANK[base] >= 3) {
    base = "Medium";
  }

  return base;
}

export function calculateAlertSeverity(
  event: AlertSourceEvent,
  ctx: AlertContext,
  priority: AlertPriority
): AlertSeverity {
  if (ctx.severityHint) return ctx.severityHint;
  if (event.suggestedSeverity) {
    return resolveAlertSeverityBand(event.suggestedSeverity, "Moderate");
  }

  const haystack = `${event.eventType} ${event.title ?? ""} ${event.reason ?? ""}`;
  for (const hint of SEVERITY_HINTS) {
    if (hint.pattern.test(haystack)) return hint.severity;
  }

  switch (priority) {
    case "Critical":
      return "Critical";
    case "High":
      return "Major";
    case "Medium":
      return "Moderate";
    case "Low":
      return "Minor";
    default:
      return "Informational";
  }
}

export function calculateAlertConfidence(
  event: AlertSourceEvent,
  ctx: AlertContext
): AlertConfidence {
  const weight = getSourceWeight(ctx.sourceEngine);
  let score = ctx.confidenceHint;

  if (score == null || !Number.isFinite(score)) {
    score = 55 * weight;
  } else {
    score = score * Math.min(1.25, Math.max(0.75, weight));
  }

  const evidenceCount = (event.evidence ?? []).filter(
    (e) => safeAlertText(e, "") !== ""
  ).length;
  if (evidenceCount >= 3) score += 8;
  else if (evidenceCount >= 1) score += 4;

  if (ctx.inPortfolio) score += 3;

  return resolveAlertConfidence(score);
}

export function resolveExpiry(
  event: AlertSourceEvent,
  ctx: AlertContext
): string {
  if (event.expiresAt) {
    const parsed = Date.parse(event.expiresAt);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date(ctx.now.getTime() + ctx.defaultExpiryMs).toISOString();
}

export function shouldSuppressEvent(
  event: AlertSourceEvent,
  ctx: AlertContext
): boolean {
  if (ctx.suppress) return true;
  const title = safeAlertText(event.title, "");
  const summary = safeAlertText(event.summary, "");
  const eventType = safeAlertText(event.eventType, "");
  if (!title && !summary && !eventType) return true;
  return false;
}

export function evaluateAlertRules(
  event: AlertSourceEvent,
  ctx: AlertContext
): AlertRuleEvaluation {
  const suppress = shouldSuppressEvent(event, ctx);
  const category = resolveCategoryFromEvent(event, ctx);
  const priority = calculateAlertPriority(event, ctx, category);
  const severity = calculateAlertSeverity(event, ctx, priority);
  const confidence = calculateAlertConfidence(event, ctx);
  const sourceWeight = getSourceWeight(ctx.sourceEngine);

  return {
    category,
    priority,
    severity,
    confidence,
    sourceWeight,
    expiresAt: resolveExpiry(event, ctx),
    suppress,
    groupKey: ctx.groupKey,
    dedupeKey: ctx.dedupeKey,
  };
}

export function isExpiredAt(
  expiresAt: string,
  now: Date = new Date()
): boolean {
  const ts = Date.parse(expiresAt);
  if (!Number.isFinite(ts)) return false;
  return ts <= now.getTime();
}

export function bumpPriority(priority: AlertPriority): AlertPriority {
  const rank = ALERT_PRIORITY_RANK[priority];
  if (rank <= 0) return "Critical";
  const next = (Object.keys(ALERT_PRIORITY_RANK) as AlertPriority[]).find(
    (p) => ALERT_PRIORITY_RANK[p] === rank - 1
  );
  return next ?? priority;
}

export function moreSevere(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return ALERT_SEVERITY_RANK[a] <= ALERT_SEVERITY_RANK[b] ? a : b;
}

export function higherPriority(
  a: AlertPriority,
  b: AlertPriority
): AlertPriority {
  return ALERT_PRIORITY_RANK[a] <= ALERT_PRIORITY_RANK[b] ? a : b;
}
