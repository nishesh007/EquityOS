/**
 * Institutional AI Alert Engine — core orchestration (Sprint 9C.R1).
 * Collects events from registered engines; generates, scores, classifies, exposes alerts.
 * NO notification delivery (email / push / SMS).
 */

import { AlertCache } from "./AlertCache";
import {
  createAlertFromEvent,
  mergeGroupedAlerts,
  resetAlertFactorySequence,
} from "./AlertFactory";
import {
  getInstitutionalAlertHistoryStore,
  type AlertHistoryStore,
} from "./AlertHistory";
import {
  isActiveLifecycle,
  isTerminalLifecycle,
  transitionLifecycle,
  type AlertLifecycleStatus,
} from "./AlertLifecycle";
import {
  ALERT_ENGINE_EMPTY,
  emptyAlertListView,
  type AlertGenerationResult,
  type AlertListView,
  type AlertQuery,
  type InstitutionalAlert,
} from "./AlertModels";
import { AlertMetricsTracker } from "./AlertMetrics";
import {
  isSourceEnabled,
  registerBuiltinSources,
} from "./AlertRegistry";
import { compareAlertPriority } from "./AlertPriority";
import { isExpiredAt } from "./AlertRules";
import type { AlertSourceEvent } from "./AlertTypes";

function sortAlerts(alerts: InstitutionalAlert[]): InstitutionalAlert[] {
  return [...alerts].sort((a, b) => {
    const pr = compareAlertPriority(a.priority, b.priority);
    if (pr !== 0) return pr;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export class AlertEngine {
  private readonly alerts = new Map<string, InstitutionalAlert>();
  private readonly cache = new AlertCache();
  private readonly metrics = new AlertMetricsTracker();
  private readonly history: AlertHistoryStore;

  constructor(history?: AlertHistoryStore) {
    this.history = history ?? getInstitutionalAlertHistoryStore();
    registerBuiltinSources();
  }

  resetOperationalState(): void {
    this.alerts.clear();
    this.cache.clear();
    this.metrics.reset();
    this.history.clear();
    resetAlertFactorySequence();
  }

  generateAlert(
    event: AlertSourceEvent,
    now = new Date()
  ): AlertGenerationResult {
    const started = Date.now();

    if (!isSourceEnabled(event.sourceEngine)) {
      return {
        alert: null,
        created: false,
        deduplicated: false,
        grouped: false,
        suppressed: true,
        emptyMessage: ALERT_ENGINE_EMPTY.awaitingEvents,
        processingTimeMs: Date.now() - started,
      };
    }

    // Expire sweep before generation
    this.expireDueAlerts(now);

    const processingTimeMs = () => Date.now() - started;
    const draft = createAlertFromEvent({ event, now });

    if (draft.suppressed || !draft.alert) {
      this.metrics.recordSuppressed();
      return {
        alert: null,
        created: false,
        deduplicated: false,
        grouped: false,
        suppressed: true,
        emptyMessage: ALERT_ENGINE_EMPTY.noAlerts,
        processingTimeMs: processingTimeMs(),
      };
    }

    // Deduplication
    const existingByDedupe = this.findByDedupeKey(
      draft.evaluation.dedupeKey
    );
    if (existingByDedupe && !isTerminalLifecycle(existingByDedupe.status)) {
      this.metrics.recordDeduplicated();
      this.cache.set(existingByDedupe);
      return {
        alert: existingByDedupe,
        created: false,
        deduplicated: true,
        grouped: false,
        suppressed: false,
        emptyMessage: "",
        processingTimeMs: processingTimeMs(),
      };
    }

    // Grouping
    const existingByGroup = this.findByGroupKey(draft.evaluation.groupKey);
    if (
      existingByGroup &&
      !isTerminalLifecycle(existingByGroup.status) &&
      existingByGroup.metadata.dedupeKey !== draft.evaluation.dedupeKey
    ) {
      const merged = mergeGroupedAlerts(existingByGroup, draft.alert);
      merged.status = transitionLifecycle(merged.status, "Active");
      merged.metadata = {
        ...merged.metadata,
        processingTimeMs: processingTimeMs(),
      };
      this.storeAlert(merged);
      this.history.recordTransition(
        merged.id,
        existingByGroup.status,
        merged.status,
        "grouped"
      );
      this.metrics.recordGrouped();
      return {
        alert: merged,
        created: false,
        deduplicated: false,
        grouped: true,
        suppressed: false,
        emptyMessage: "",
        processingTimeMs: processingTimeMs(),
      };
    }

    // New alert → Generated → Queued → Active
    let alert = draft.alert;
    const elapsed = processingTimeMs();
    alert = {
      ...alert,
      status: "Active",
      metadata: { ...alert.metadata, processingTimeMs: elapsed },
    };
    this.storeAlert(alert);
    this.history.seed(alert.id, "Generated");
    this.history.recordTransition(alert.id, "Generated", "Queued", "enqueue");
    this.history.activate(alert.id, "Queued");
    this.metrics.recordGenerated({
      confidence: alert.confidence.score,
      processingTimeMs: elapsed,
    });

    return {
      alert,
      created: true,
      deduplicated: false,
      grouped: false,
      suppressed: false,
      emptyMessage: "",
      processingTimeMs: elapsed,
    };
  }

  dismissAlert(alertId: string): InstitutionalAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    if (isTerminalLifecycle(alert.status) && alert.status !== "Dismissed") {
      return { ...alert };
    }
    const next = transitionLifecycle(alert.status, "Dismissed");
    if (next !== "Dismissed") return { ...alert };
    const updated = { ...alert, status: next as AlertLifecycleStatus };
    this.storeAlert(updated);
    this.history.dismiss(alertId, alert.status);
    this.metrics.recordDismissed();
    return updated;
  }

  archiveAlert(alertId: string): InstitutionalAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    const next = transitionLifecycle(alert.status, "Archived");
    if (next !== "Archived") return { ...alert };
    const updated = { ...alert, status: next as AlertLifecycleStatus };
    this.storeAlert(updated);
    this.history.archive(alertId, alert.status);
    this.metrics.recordArchived();
    return updated;
  }

  expireAlert(alertId: string, now = new Date()): InstitutionalAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    if (alert.status === "Expired") return { ...alert };
    const next = transitionLifecycle(alert.status, "Expired");
    if (next !== "Expired" && !isExpiredAt(alert.expiresAt, now)) {
      return { ...alert };
    }
    const updated: InstitutionalAlert = {
      ...alert,
      status: "Expired",
    };
    this.storeAlert(updated);
    this.history.expire(alertId, alert.status);
    this.metrics.recordExpired();
    return updated;
  }

  expireDueAlerts(now = new Date()): number {
    let count = 0;
    for (const alert of this.alerts.values()) {
      if (isTerminalLifecycle(alert.status)) continue;
      if (isExpiredAt(alert.expiresAt, now)) {
        this.expireAlert(alert.id, now);
        count += 1;
      }
    }
    this.syncActiveMetric();
    return count;
  }

  getAlert(alertId: string): InstitutionalAlert | null {
    const cached = this.cache.getById(alertId);
    if (cached) return cached;
    const alert = this.alerts.get(alertId);
    return alert ? { ...alert, evidence: [...alert.evidence] } : null;
  }

  getAlerts(query?: AlertQuery, now = new Date()): AlertListView {
    this.expireDueAlerts(now);

    let list = [...this.alerts.values()];

    if (!query?.includeTerminal) {
      list = list.filter((a) => !isTerminalLifecycle(a.status));
    }

    if (query?.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      list = list.filter((a) => statuses.includes(a.status));
    }
    if (query?.category) {
      const cats = Array.isArray(query.category)
        ? query.category
        : [query.category];
      list = list.filter((a) => cats.includes(a.category));
    }
    if (query?.priority) {
      const pris = Array.isArray(query.priority)
        ? query.priority
        : [query.priority];
      list = list.filter((a) => pris.includes(a.priority));
    }
    if (query?.sourceEngine) {
      const sources = Array.isArray(query.sourceEngine)
        ? query.sourceEngine
        : [query.sourceEngine];
      list = list.filter((a) => sources.includes(a.sourceEngine));
    }
    if (query?.ticker) {
      const t = query.ticker.toUpperCase();
      list = list.filter((a) => a.ticker.toUpperCase() === t);
    }
    if (query?.inPortfolio === true) {
      list = list.filter((a) => a.inPortfolio);
    }
    if (query?.inWatchlist === true) {
      list = list.filter((a) => a.inWatchlist);
    }

    list = sortAlerts(list);
    if (query?.limit != null && query.limit > 0) {
      list = list.slice(0, query.limit);
    }

    const activeCount = list.filter((a) => isActiveLifecycle(a.status)).length;

    if (list.length === 0) {
      const hasAny = this.alerts.size > 0;
      return emptyAlertListView(
        hasAny ? ALERT_ENGINE_EMPTY.noActive : ALERT_ENGINE_EMPTY.awaitingEvents
      );
    }

    return {
      alerts: list.map((a) => ({
        ...a,
        evidence: [...a.evidence],
        confidence: { ...a.confidence },
        metadata: {
          ...a.metadata,
          tags: [...a.metadata.tags],
          extras: { ...a.metadata.extras },
        },
      })),
      total: list.length,
      activeCount,
      empty: false,
      emptyMessage: ALERT_ENGINE_EMPTY.noAlerts,
    };
  }

  getMetrics() {
    this.syncActiveMetric();
    return this.metrics.getMetrics();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  private storeAlert(alert: InstitutionalAlert): void {
    this.alerts.set(alert.id, alert);
    this.cache.set(alert);
    this.syncActiveMetric();
  }

  private findByDedupeKey(dedupeKey: string): InstitutionalAlert | null {
    const cached = this.cache.getByDedupeKey(dedupeKey);
    if (cached) {
      const live = this.alerts.get(cached.id);
      return live ?? cached;
    }
    for (const alert of this.alerts.values()) {
      if (alert.metadata.dedupeKey === dedupeKey) return alert;
    }
    return null;
  }

  private findByGroupKey(groupKey: string): InstitutionalAlert | null {
    const cached = this.cache.getByGroupKey(groupKey);
    if (cached) {
      const live = this.alerts.get(cached.id);
      return live ?? cached;
    }
    for (const alert of this.alerts.values()) {
      if (alert.metadata.groupKey === groupKey) return alert;
    }
    return null;
  }

  private syncActiveMetric(): void {
    const active = [...this.alerts.values()].filter(
      (a) => isActiveLifecycle(a.status)
    ).length;
    this.metrics.setActiveCount(active);
  }
}
