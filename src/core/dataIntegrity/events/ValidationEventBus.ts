/**
 * Institutional Validation Event Bus — master façade (Prompt 9F.13).
 * Real-time broadcasting backbone for validation monitoring & observability.
 * Never crashes validation engines on event failures.
 */

import {
  DEFAULT_VALIDATION_EVENT_CONFIGURATION,
  resolveValidationEventConfiguration,
  type ValidationEventConfiguration,
  type ValidationEventConfigurationInput,
} from "./ValidationEventConfiguration";
import {
  type ValidationEvent,
  type ValidationEventInput,
  type ValidationEventType,
} from "./ValidationEventTypes";
import { ValidationEventEmitter } from "./ValidationEventEmitter";
import {
  ValidationEventSubscriber,
  type SubscribeOptions,
  type ValidationEventHandler,
} from "./ValidationEventSubscriber";
import { ValidationEventHistory } from "./ValidationEventHistory";
import {
  ValidationEventReplay,
  type ReplayRequest,
  type ReplayResult,
} from "./ValidationEventReplay";
import {
  ValidationEventMetrics,
  type EventBusHealth,
  type EventBusMetricsSnapshot,
} from "./ValidationEventMetrics";
import { ValidationEventAuditLogger } from "./ValidationEventAuditLogger";
import { ValidationEventDispatcher } from "./ValidationEventDispatcher";
import {
  getRegisteredEventTypes,
  registerBuiltinEventTypes,
  registerEventType,
  resetEventTypeRegistrationState,
} from "./ValidationEventRegistry";
import type { ValidationEventFilters } from "./ValidationEventFilters";
import {
  createEventSnapshotId,
  type ValidationEventSnapshot,
} from "./ValidationEventSnapshot";
import type { DispatchResult } from "./ValidationEventDispatcher";

export interface PublishResult {
  event: ValidationEvent;
  dispatch: DispatchResult;
}

let defaultBus: ValidationEventBus | null = null;
let busRegistered = false;
let healthTimer: ReturnType<typeof setInterval> | null = null;

export class ValidationEventBus {
  private config: ValidationEventConfiguration;
  private emitter: ValidationEventEmitter;
  private subscribers: ValidationEventSubscriber;
  private history: ValidationEventHistory;
  private replayEngine: ValidationEventReplay;
  private metrics: ValidationEventMetrics;
  private audit: ValidationEventAuditLogger;
  private dispatcher: ValidationEventDispatcher;

  constructor(configInput?: ValidationEventConfigurationInput) {
    this.config = resolveValidationEventConfiguration(configInput);
    this.emitter = new ValidationEventEmitter(this.config);
    this.subscribers = new ValidationEventSubscriber();
    this.history = new ValidationEventHistory(this.config);
    this.replayEngine = new ValidationEventReplay(this.history);
    this.metrics = new ValidationEventMetrics();
    this.audit = new ValidationEventAuditLogger(this.config.maxAuditEntries);
    this.dispatcher = new ValidationEventDispatcher(
      this.config,
      this.subscribers,
      this.metrics,
      this.audit
    );
    this.metrics.setRegistrySize(getRegisteredEventTypes().length);
  }

  getConfiguration(): ValidationEventConfiguration {
    return resolveValidationEventConfiguration(this.config);
  }

  updateConfiguration(input: ValidationEventConfigurationInput): void {
    this.config = resolveValidationEventConfiguration({
      ...this.config,
      ...input,
      severityPriority: {
        ...this.config.severityPriority,
        ...(input.severityPriority ?? {}),
      },
    });
    this.emitter = new ValidationEventEmitter(this.config);
    this.history.updateConfig(this.config);
    this.dispatcher.updateConfig(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
  }

  /** Publish an event to all matching subscribers. Never throws. */
  async publishEvent<T = unknown>(
    input: ValidationEventInput<T>
  ): Promise<PublishResult> {
    try {
      // Auto-register custom event types for future discovery
      if (!getRegisteredEventTypes().some((t) => t.type === input.eventType)) {
        registerEventType(input.eventType, {
          description: `Custom event: ${input.eventType}`,
        });
        this.metrics.setRegistrySize(getRegisteredEventTypes().length);
      }

      const event = this.emitter.create(input);
      this.history.append(event);
      this.metrics.recordPublish(event.module, event.severity);
      this.metrics.setSubscriberCount(this.subscribers.count());
      this.metrics.setQueueSize(this.dispatcher.getQueueSize());

      this.audit.append({
        timestamp: new Date().toISOString(),
        action: "PUBLISH",
        eventId: event.eventId,
        eventType: event.eventType,
        engineVersion: this.config.engineVersion,
      });

      const dispatch = await this.dispatcher.dispatch(event);
      return { event, dispatch };
    } catch (err) {
      // Absolute safety — event bus must never break validation
      const fallback = this.emitter.create({
        eventType: "WarningRaised",
        module: "event-bus",
        severity: "WARNING",
        payload: {
          message: err instanceof Error ? err.message : String(err),
          originalType: input.eventType,
        },
      });
      this.history.append(fallback);
      return {
        event: fallback,
        dispatch: {
          eventId: fallback.eventId,
          subscriberCount: 0,
          failures: 1,
          dispatchTimeMs: 0,
          dropped: false,
        },
      };
    }
  }

  subscribe(
    handler: ValidationEventHandler,
    options?: SubscribeOptions
  ): string {
    if (this.subscribers.count() >= this.config.maxSubscribers) {
      throw new Error("Maximum subscriber count reached");
    }
    const id = this.subscribers.subscribe(handler, options);
    this.metrics.setSubscriberCount(this.subscribers.count());
    this.audit.append({
      timestamp: new Date().toISOString(),
      action: "SUBSCRIBE",
      subscribers: this.subscribers.count(),
      message: id,
      engineVersion: this.config.engineVersion,
    });
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const ok = this.subscribers.unsubscribe(subscriptionId);
    this.metrics.setSubscriberCount(this.subscribers.count());
    if (ok) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        action: "UNSUBSCRIBE",
        subscribers: this.subscribers.count(),
        message: subscriptionId,
        engineVersion: this.config.engineVersion,
      });
    }
    return ok;
  }

  getEventHistory(filters?: ValidationEventFilters): ValidationEvent[] {
    if (!filters || Object.keys(filters).length === 0) {
      return this.history.getAll();
    }
    return this.history.query(filters);
  }

  getRecentEvents(limit = 50): ValidationEvent[] {
    return this.history.getRecent(limit);
  }

  getFailedEvents(): ValidationEvent[] {
    return this.history.getFailed();
  }

  getCriticalEvents(): ValidationEvent[] {
    return this.history.getCritical();
  }

  async replayEvents(request: ReplayRequest): Promise<ReplayResult> {
    try {
      const result = this.replayEngine.replay(request);
      this.metrics.recordReplay(result.count);
      this.audit.append({
        timestamp: new Date().toISOString(),
        action: "REPLAY",
        subscribers: result.count,
        message: `Replay mode=${request.mode}`,
        engineVersion: this.config.engineVersion,
      });

      // Re-dispatch replayed events to current subscribers
      for (const event of result.events) {
        await this.dispatcher.dispatch(event);
      }
      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        action: "FAILURE",
        message: `Replay failure: ${err instanceof Error ? err.message : String(err)}`,
        engineVersion: this.config.engineVersion,
      });
      return {
        request,
        events: [],
        replayedAt: new Date().toISOString(),
        count: 0,
      };
    }
  }

  getEventMetrics(): EventBusMetricsSnapshot {
    this.metrics.setSubscriberCount(this.subscribers.count());
    this.metrics.setQueueSize(this.dispatcher.getQueueSize());
    this.metrics.setRegistrySize(getRegisteredEventTypes().length);
    return this.metrics.getMetrics();
  }

  getEventHealth(): EventBusHealth {
    this.metrics.setSubscriberCount(this.subscribers.count());
    this.metrics.setQueueSize(this.dispatcher.getQueueSize());
    this.metrics.setRegistrySize(getRegisteredEventTypes().length);
    return this.metrics.getHealth({
      maxQueue: this.config.queueSize,
      minRegistry: 1,
    });
  }

  createSnapshot(): ValidationEventSnapshot {
    return {
      snapshotId: createEventSnapshotId(),
      timestamp: new Date().toISOString(),
      recentEvents: this.history.getRecent(25),
      metrics: this.getEventMetrics(),
      health: this.getEventHealth(),
      subscriberCount: this.subscribers.count(),
      queueSize: this.dispatcher.getQueueSize(),
      engineVersion: this.config.engineVersion,
    };
  }

  async flushQueue(): Promise<DispatchResult[]> {
    return this.dispatcher.flush();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  startHealthMonitoring(): void {
    this.stopHealthMonitoring();
    healthTimer = setInterval(() => {
      try {
        void this.getEventHealth();
      } catch {
        /* never crash */
      }
    }, this.config.healthCheckIntervalMs);
    if (typeof healthTimer === "object" && "unref" in healthTimer) {
      healthTimer.unref?.();
    }
  }

  stopHealthMonitoring(): void {
    if (healthTimer) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  resetOperationalState(): void {
    this.stopHealthMonitoring();
    this.subscribers.clear();
    this.history.clear();
    this.metrics.reset();
    this.audit.reset();
    void this.dispatcher.flush().catch(() => undefined);
  }

  /**
   * Integration helpers — emit standard lifecycle events from façades
   * without requiring engines to know bus internals.
   */
  async emitValidationLifecycle(
    phase: "started" | "completed" | "failed" | "cancelled",
    meta: {
      module?: string;
      validationId?: string;
      entityId?: string;
      payload?: unknown;
      executionTimeMs?: number;
      correlationId?: string;
    }
  ): Promise<PublishResult> {
    const map = {
      started: "ValidationStarted",
      completed: "ValidationCompleted",
      failed: "ValidationFailed",
      cancelled: "ValidationCancelled",
    } as const;
    return this.publishEvent({
      eventType: map[phase],
      module: meta.module ?? "orchestrator",
      validationId: meta.validationId,
      entityId: meta.entityId,
      correlationId: meta.correlationId,
      payload: meta.payload ?? {},
      executionTimeMs: meta.executionTimeMs,
      source: "validation-integration",
    });
  }
}

export interface EventBusRegistrationResult {
  registered: boolean;
  skipped: boolean;
  eventTypesRegistered: number;
}

/** Idempotent Event Bus startup registration. */
export function registerValidationEventBus(options?: {
  bus?: ValidationEventBus;
  config?: ValidationEventConfigurationInput;
  force?: boolean;
  startHealthMonitoring?: boolean;
}): EventBusRegistrationResult {
  if (busRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      eventTypesRegistered: getRegisteredEventTypes().length,
    };
  }

  const types = registerBuiltinEventTypes({ force: options?.force });
  if (options?.bus) {
    defaultBus = options.bus;
  } else if (!defaultBus || options?.config || options?.force) {
    defaultBus = new ValidationEventBus(options?.config);
  }

  // Wire lightweight integration bridges (no engine internal changes)
  wireIntegrationBridges(defaultBus);

  if (options?.startHealthMonitoring !== false) {
    defaultBus.startHealthMonitoring();
  }

  busRegistered = true;
  return {
    registered: true,
    skipped: false,
    eventTypesRegistered: types.total,
  };
}

/**
 * Attach one-way bridges so platform modules can publish without
 * modifying their internal validation logic. Bridges are best-effort.
 */
function wireIntegrationBridges(bus: ValidationEventBus): void {
  // Ensure custom integration event types exist
  const integrationTypes: ValidationEventType[] = [
    "TrustScoreUpdated",
    "IntegrityScoreUpdated",
    "DashboardRefreshed",
    "SnapshotCreated",
    "RecommendationValidated",
    "TradeSetupValidated",
    "HistoricalValidationUpdated",
    "HallucinationDetected",
  ];
  for (const type of integrationTypes) {
    registerEventType(type, { description: `Integration: ${type}` });
  }

  // Expose bus on globalThis for optional façade hooks without hard coupling
  try {
    const g = globalThis as typeof globalThis & {
      __equityosValidationEventBus?: ValidationEventBus;
    };
    g.__equityosValidationEventBus = bus;
  } catch {
    /* ignore */
  }
}

export function getValidationEventBus(
  options?: ValidationEventConfigurationInput
): ValidationEventBus {
  if (!defaultBus || options) {
    defaultBus = new ValidationEventBus(options);
    registerBuiltinEventTypes();
  }
  return defaultBus;
}

export function resetValidationEventBus(): void {
  if (defaultBus) {
    defaultBus.resetOperationalState();
  }
  defaultBus = null;
  busRegistered = false;
  resetEventTypeRegistrationState();
  try {
    const g = globalThis as typeof globalThis & {
      __equityosValidationEventBus?: ValidationEventBus;
    };
    delete g.__equityosValidationEventBus;
  } catch {
    /* ignore */
  }
}

/** Public API convenience wrappers. */
export async function publishEvent<T = unknown>(
  input: ValidationEventInput<T>
): Promise<PublishResult> {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().publishEvent(input);
}

export function subscribe(
  handler: ValidationEventHandler,
  options?: SubscribeOptions
): string {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().subscribe(handler, options);
}

export function unsubscribe(subscriptionId: string): boolean {
  return getValidationEventBus().unsubscribe(subscriptionId);
}

export function getEventHistory(
  filters?: ValidationEventFilters
): ValidationEvent[] {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().getEventHistory(filters);
}

export async function replayEvents(
  request: ReplayRequest
): Promise<ReplayResult> {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().replayEvents(request);
}

export function getEventMetrics(): EventBusMetricsSnapshot {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().getEventMetrics();
}

export function getEventHealth(): EventBusHealth {
  registerValidationEventBus({ startHealthMonitoring: false });
  return getValidationEventBus().getEventHealth();
}

/** Fire-and-forget publish that never throws — safe for façade integration. */
export function safePublishEvent<T = unknown>(
  input: ValidationEventInput<T>
): void {
  try {
    const g = globalThis as typeof globalThis & {
      __equityosValidationEventBus?: ValidationEventBus;
    };
    const bus = g.__equityosValidationEventBus ?? defaultBus;
    if (bus) {
      void bus.publishEvent(input).catch(() => undefined);
      return;
    }
    void publishEvent(input).catch(() => undefined);
  } catch {
    /* never surface to callers */
  }
}

export {
  DEFAULT_VALIDATION_EVENT_CONFIGURATION,
  resolveValidationEventConfiguration,
  registerEventType,
};
