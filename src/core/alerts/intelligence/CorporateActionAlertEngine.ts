/**
 * Corporate Action Alert Intelligence — Sprint 9C.R3.
 * Reuses fundamentals corporate action shapes; emits into R1 Alert Engine.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  buildEventDecision,
  CORPORATE_ACTION_KIND_LABELS,
  EVENT_ALERT_EMPTY,
  mapCorporateActionKind,
  type CorporateActionAlertSnapshot,
} from "./AlertInsightModels";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

export interface CorporateActionAlertInput {
  actions: CorporateActionAlertSnapshot[];
  now?: Date;
}

function priorityForType(type: string): AlertPriority {
  const t = type.toLowerCase();
  if (/merger|acquisition|demerger|buyback/.test(t)) return "High";
  if (/rights|split|bonus/.test(t)) return "High";
  if (/dividend|board|agm|shareholding|promoter/.test(t)) return "Medium";
  return "Medium";
}

function severityForType(type: string): AlertSeverity {
  const t = type.toLowerCase();
  if (/merger|acquisition|demerger/.test(t)) return "Major";
  if (/buyback|rights/.test(t)) return "Major";
  return "Moderate";
}

export function decideCorporateActionAlerts(
  snap: CorporateActionAlertSnapshot
): AlertDecision[] {
  const kind = mapCorporateActionKind(snap.type);
  if (!kind) return [];

  const ticker = safeAlertText(snap.symbol, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker);
  const label = CORPORATE_ACTION_KIND_LABELS[kind];

  return [
    buildEventDecision({
      kind,
      label,
      sourceEngine: "Corporate Actions",
      suggestedCategory: "Corporate Action",
      suggestedPriority: priorityForType(snap.type),
      suggestedSeverity: severityForType(snap.type),
      title: `${label} — ${ticker}`,
      summary: safeAlertText(snap.title, `${label} for ${ticker}`),
      reason: safeAlertText(snap.description, `${label} corporate action`),
      evidence: [
        `type:${snap.type}`,
        `date:${snap.date}`,
        ...(snap.value ? [`value:${snap.value}`] : []),
      ],
      company,
      ticker,
      inPortfolio: snap.inPortfolio,
      inWatchlist: snap.inWatchlist,
      confidenceScore: snap.confidenceScore ?? 75,
      groupPrefix: "corpaction",
      metadata: {
        relatedReport: "corporate_action",
        actionId: snap.id,
        actionType: snap.type,
      },
    }),
  ];
}

export class CorporateActionAlertEngine {
  generate(input: CorporateActionAlertInput): EventIntelBatch {
    const now = input.now ?? new Date();
    if (!input.actions.length) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.noCorporateActions);
    }
    const decisions = input.actions.flatMap(decideCorporateActionAlerts);
    if (decisions.length === 0) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.noCorporateActions);
    }
    return emitDecisionsAsBatch(
      decisions,
      EVENT_ALERT_EMPTY.noCorporateActions,
      now
    );
  }
}

let singleton: CorporateActionAlertEngine | null = null;

export function getCorporateActionAlertEngine(): CorporateActionAlertEngine {
  if (!singleton) singleton = new CorporateActionAlertEngine();
  return singleton;
}

export function resetCorporateActionAlertEngine(): void {
  singleton = null;
}

/** Public API — generateCorporateActionAlerts() */
export function generateCorporateActionAlerts(
  input: CorporateActionAlertInput
): EventIntelBatch {
  try {
    return getCorporateActionAlertEngine().generate(input);
  } catch {
    return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingAnalysis);
  }
}
