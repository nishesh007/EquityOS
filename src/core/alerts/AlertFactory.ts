/**
 * Institutional AI Alert Engine — alert factory (Sprint 9C.R1).
 */

import { buildAlertContext, withContextHints } from "./AlertContext";
import { buildAlertMetadata } from "./AlertMetadata";
import {
  safeAlertText,
  type InstitutionalAlert,
} from "./AlertModels";
import {
  evaluateAlertRules,
  type AlertRuleEvaluation,
} from "./AlertRules";
import type { AlertSourceEvent } from "./AlertTypes";
import {
  isAlertCategory,
  type AlertCategory,
} from "./AlertCategory";
import {
  isAlertPriority,
  type AlertPriority,
} from "./AlertPriority";
import {
  isAlertSeverity,
  type AlertSeverity,
} from "./AlertSeverity";

let alertSeq = 0;

export function resetAlertFactorySequence(): void {
  alertSeq = 0;
}

export function createAlertId(
  sourceEngine: string,
  ticker: string,
  eventType: string,
  now: Date
): string {
  alertSeq += 1;
  const ts = now.getTime();
  const safeTicker = safeAlertText(ticker, "PLATFORM").toUpperCase();
  const safeType = safeAlertText(eventType, "event")
    .replace(/\s+/g, "_")
    .toLowerCase();
  return `alert::${sourceEngine}::${safeTicker}::${safeType}::${ts}::${alertSeq}`;
}

export interface AlertFactoryInput {
  event: AlertSourceEvent;
  now?: Date;
  categoryHint?: AlertCategory | null;
  priorityHint?: AlertPriority | null;
  severityHint?: AlertSeverity | null;
  processingTimeMs?: number;
  groupedCount?: number;
}

export interface AlertFactoryOutput {
  alert: InstitutionalAlert | null;
  evaluation: AlertRuleEvaluation;
  suppressed: boolean;
}

export function createAlertFromEvent(
  input: AlertFactoryInput
): AlertFactoryOutput {
  const now = input.now ?? new Date();
  let ctx = buildAlertContext(input.event, { now });

  const categoryHint =
    input.categoryHint ??
    (input.event.suggestedCategory &&
    isAlertCategory(input.event.suggestedCategory)
      ? input.event.suggestedCategory
      : null);
  const priorityHint =
    input.priorityHint ??
    (input.event.suggestedPriority &&
    isAlertPriority(input.event.suggestedPriority)
      ? input.event.suggestedPriority
      : null);
  const severityHint =
    input.severityHint ??
    (input.event.suggestedSeverity &&
    isAlertSeverity(input.event.suggestedSeverity)
      ? input.event.suggestedSeverity
      : null);

  ctx = withContextHints(ctx, {
    category: categoryHint,
    priority: priorityHint,
    severity: severityHint,
    confidence: input.event.confidenceScore,
  });

  const evaluation = evaluateAlertRules(input.event, ctx);
  if (evaluation.suppress) {
    return { alert: null, evaluation, suppressed: true };
  }

  const title = safeAlertText(
    input.event.title,
    safeAlertText(input.event.eventType, "Alert")
  );
  const summary = safeAlertText(
    input.event.summary,
    safeAlertText(input.event.description, title)
  );
  const description = safeAlertText(input.event.description, summary);
  const reason = safeAlertText(
    input.event.reason,
    `Generated from ${ctx.sourceEngine}`
  );
  const evidence = (input.event.evidence ?? [])
    .map((e) => safeAlertText(e, ""))
    .filter(Boolean);

  const alert: InstitutionalAlert = {
    id: createAlertId(ctx.sourceEngine, ctx.ticker, ctx.eventType, now),
    category: evaluation.category,
    priority: evaluation.priority,
    severity: evaluation.severity,
    confidence: evaluation.confidence,
    title,
    summary,
    description,
    reason,
    evidence,
    sourceEngine: ctx.sourceEngine,
    company: ctx.company,
    ticker: ctx.ticker,
    inPortfolio: ctx.inPortfolio,
    inWatchlist: ctx.inWatchlist,
    createdAt: now.toISOString(),
    expiresAt: evaluation.expiresAt,
    status: "Generated",
    metadata: buildAlertMetadata({
      eventType: ctx.eventType,
      sourceEngine: ctx.sourceEngine,
      groupKey: evaluation.groupKey,
      dedupeKey: evaluation.dedupeKey,
      href: input.event.href,
      tags: [
        evaluation.category,
        evaluation.priority,
        ctx.inPortfolio ? "portfolio" : "",
        ctx.inWatchlist ? "watchlist" : "",
      ].filter(Boolean),
      processingTimeMs: input.processingTimeMs ?? 0,
      sourceWeight: evaluation.sourceWeight,
      groupedCount: input.groupedCount ?? 1,
      suppressed: false,
      extras: input.event.metadata ?? null,
    }),
  };

  return { alert, evaluation, suppressed: false };
}

/** Merge two alerts in the same group — keep higher priority / severity / confidence. */
export function mergeGroupedAlerts(
  existing: InstitutionalAlert,
  incoming: InstitutionalAlert
): InstitutionalAlert {
  const useIncomingPriority =
    incoming.priority !== existing.priority &&
    // lower rank wins
    ["Critical", "High", "Medium", "Low", "Informational"].indexOf(
      incoming.priority
    ) <
      ["Critical", "High", "Medium", "Low", "Informational"].indexOf(
        existing.priority
      );

  const useIncomingSeverity =
    ["Critical", "Major", "Moderate", "Minor", "Informational"].indexOf(
      incoming.severity
    ) <
    ["Critical", "Major", "Moderate", "Minor", "Informational"].indexOf(
      existing.severity
    );

  const evidence = Array.from(
    new Set([...existing.evidence, ...incoming.evidence])
  );

  return {
    ...existing,
    priority: useIncomingPriority ? incoming.priority : existing.priority,
    severity: useIncomingSeverity ? incoming.severity : existing.severity,
    confidence:
      incoming.confidence.score > existing.confidence.score
        ? incoming.confidence
        : existing.confidence,
    summary: existing.summary,
    description:
      incoming.description.length > existing.description.length
        ? incoming.description
        : existing.description,
    reason: existing.reason,
    evidence,
    inPortfolio: existing.inPortfolio || incoming.inPortfolio,
    inWatchlist: existing.inWatchlist || incoming.inWatchlist,
    expiresAt:
      Date.parse(incoming.expiresAt) > Date.parse(existing.expiresAt)
        ? incoming.expiresAt
        : existing.expiresAt,
    metadata: {
      ...existing.metadata,
      groupedCount: existing.metadata.groupedCount + 1,
      tags: Array.from(
        new Set([...existing.metadata.tags, ...incoming.metadata.tags])
      ),
    },
  };
}
