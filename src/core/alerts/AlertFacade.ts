/**
 * Institutional AI Alert Engine — public façade (Sprint 9C.R1).
 * Idempotent registration + never-throw public API.
 */

import { AlertEngine } from "./AlertEngine";
import {
  getInstitutionalAlertHistoryStore,
  resetInstitutionalAlertHistoryStore,
} from "./AlertHistory";
import {
  ALERT_ENGINE_EMPTY,
  emptyAlertListView,
  type AlertGenerationResult,
  type AlertListView,
  type AlertQuery,
  type InstitutionalAlert,
} from "./AlertModels";
import {
  listSources,
  registerBuiltinSources,
  registerSource,
  resetAlertRegistry,
  type AlertSourceDefinition,
} from "./AlertRegistry";
import { resetAlertFactorySequence } from "./AlertFactory";
import type { AlertSourceEvent, AlertSourceEngine } from "./AlertTypes";
import type { AlertOperationalMetrics } from "./AlertMetrics";

export interface AlertEngineRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
  integrations: {
    aiResearch: boolean;
    earnings: boolean;
    portfolio: boolean;
    watchlist: boolean;
    validation: boolean;
    trust: boolean;
    reports: boolean;
    market: boolean;
    corporateActions: boolean;
    news: boolean;
    screener: boolean;
  };
}

let defaultEngine: AlertEngine | null = null;
let engineRegistered = false;

export function registerAlertEngine(options?: {
  engine?: AlertEngine;
  force?: boolean;
}): AlertEngineRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listSources().length,
      integrations: emptyIntegrations(),
    };
  }

  const builtins = registerBuiltinSources({ force: options?.force });

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.force) {
    defaultEngine = new AlertEngine(getInstitutionalAlertHistoryStore());
  }

  engineRegistered = true;

  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
    integrations: {
      aiResearch: true,
      earnings: true,
      portfolio: true,
      watchlist: true,
      validation: true,
      trust: true,
      reports: true,
      market: true,
      corporateActions: true,
      news: true,
      screener: true,
    },
  };
}

export function getAlertEngine(): AlertEngine {
  if (!defaultEngine) {
    registerAlertEngine();
  }
  return defaultEngine!;
}

export function resetAlertEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetAlertRegistry();
  resetInstitutionalAlertHistoryStore();
  resetAlertFactorySequence();
}

function emptyIntegrations(): AlertEngineRegistrationResult["integrations"] {
  return {
    aiResearch: false,
    earnings: false,
    portfolio: false,
    watchlist: false,
    validation: false,
    trust: false,
    reports: false,
    market: false,
    corporateActions: false,
    news: false,
    screener: false,
  };
}

function emptyGenerationResult(
  message: typeof ALERT_ENGINE_EMPTY.awaitingEvents
): AlertGenerationResult {
  return {
    alert: null,
    created: false,
    deduplicated: false,
    grouped: false,
    suppressed: true,
    emptyMessage: message,
    processingTimeMs: 0,
  };
}

/** Public API — generateAlert() */
export function generateAlert(
  event: AlertSourceEvent,
  now?: Date
): AlertGenerationResult {
  try {
    registerAlertEngine();
    return getAlertEngine().generateAlert(event, now);
  } catch {
    return emptyGenerationResult(ALERT_ENGINE_EMPTY.awaitingEvents);
  }
}

/** Public API — registerSource() */
export function registerAlertSource(
  definition: Omit<AlertSourceDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  try {
    registerAlertEngine();
    return registerSource(definition, options);
  } catch {
    return { registered: false, skipped: true };
  }
}

/** Public API — dismissAlert() */
export function dismissAlert(alertId: string): InstitutionalAlert | null {
  try {
    registerAlertEngine();
    return getAlertEngine().dismissAlert(alertId);
  } catch {
    return null;
  }
}

/** Public API — archiveAlert() */
export function archiveAlert(alertId: string): InstitutionalAlert | null {
  try {
    registerAlertEngine();
    return getAlertEngine().archiveAlert(alertId);
  } catch {
    return null;
  }
}

/** Public API — expireAlert() */
export function expireAlert(
  alertId: string,
  now?: Date
): InstitutionalAlert | null {
  try {
    registerAlertEngine();
    return getAlertEngine().expireAlert(alertId, now);
  } catch {
    return null;
  }
}

/** Public API — getAlerts() */
export function getAlerts(query?: AlertQuery, now?: Date): AlertListView {
  try {
    registerAlertEngine();
    return getAlertEngine().getAlerts(query, now);
  } catch {
    return emptyAlertListView(ALERT_ENGINE_EMPTY.noAlerts);
  }
}

/** Public API — getMetrics() */
export function getAlertMetrics(): AlertOperationalMetrics {
  try {
    registerAlertEngine();
    return getAlertEngine().getMetrics();
  } catch {
    return {
      generated: 0,
      active: 0,
      expired: 0,
      dismissed: 0,
      grouped: 0,
      deduplicated: 0,
      suppressed: 0,
      archived: 0,
      averageConfidence: 0,
      averageProcessingTimeMs: 0,
      lastGeneratedAt: null,
    };
  }
}

/** Public API alias — getMetrics() */
export function getMetrics(): AlertOperationalMetrics {
  return getAlertMetrics();
}

export function listAlertSources(): AlertSourceDefinition[] {
  try {
    registerAlertEngine();
    return listSources();
  } catch {
    return [];
  }
}

export type { AlertSourceEngine };
