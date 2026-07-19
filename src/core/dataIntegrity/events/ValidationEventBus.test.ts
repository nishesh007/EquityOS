/**
 * Institutional Validation Event Bus — unit tests (Prompt 9F.13).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationEventBus,
  registerValidationEventBus,
  resetValidationEventBus,
  publishEvent,
  subscribe,
  unsubscribe,
  getEventHistory,
  replayEvents,
  getEventMetrics,
  getEventHealth,
  getRegisteredEventTypes,
  resetEventTypeRegistrationState,
  DEFAULT_VALIDATION_EVENT_CONFIGURATION,
  type ValidationEvent,
} from "./index";

describe("Event Bus registration", () => {
  beforeEach(() => {
    resetValidationEventBus();
    resetEventTypeRegistrationState();
  });

  afterEach(() => {
    resetValidationEventBus();
    resetEventTypeRegistrationState();
  });

  it("registers event bus idempotently", () => {
    const first = registerValidationEventBus({
      force: true,
      startHealthMonitoring: false,
    });
    expect(first.registered).toBe(true);
    expect(first.eventTypesRegistered).toBeGreaterThanOrEqual(17);
    expect(getRegisteredEventTypes().length).toBeGreaterThanOrEqual(17);

    const second = registerValidationEventBus({
      startHealthMonitoring: false,
    });
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Publishing and subscriptions", () => {
  let bus: ValidationEventBus;

  beforeEach(() => {
    resetValidationEventBus();
    resetEventTypeRegistrationState();
    bus = new ValidationEventBus();
    registerValidationEventBus({
      bus,
      force: true,
      startHealthMonitoring: false,
    });
  });

  afterEach(() => {
    resetValidationEventBus();
  });

  it("publishes events to subscribers", async () => {
    const received: ValidationEvent[] = [];
    const subId = bus.subscribe((e) => {
      received.push(e);
    });

    const result = await bus.publishEvent({
      eventType: "ValidationStarted",
      module: "orchestrator",
      validationId: "v-1",
      entityId: "TATAMOTORS",
      payload: { stock: "TATAMOTORS" },
    });

    expect(result.event.eventId).toBeTruthy();
    expect(result.event.severity).toBe("INFO");
    expect(received.length).toBe(1);
    expect(received[0]?.eventType).toBe("ValidationStarted");
    expect(bus.unsubscribe(subId)).toBe(true);
  });

  it("supports unsubscribe and once subscriptions", async () => {
    const counts = { a: 0, b: 0 };
    const id = bus.subscribe(() => {
      counts.a += 1;
    });
    bus.subscribe(
      () => {
        counts.b += 1;
      },
      { once: true, eventType: "WarningRaised" }
    );

    await bus.publishEvent({
      eventType: "WarningRaised",
      module: "test",
      payload: {},
    });
    await bus.publishEvent({
      eventType: "WarningRaised",
      module: "test",
      payload: {},
    });

    expect(counts.a).toBe(2);
    expect(counts.b).toBe(1);
    bus.unsubscribe(id);
    await bus.publishEvent({
      eventType: "WarningRaised",
      module: "test",
      payload: {},
    });
    expect(counts.a).toBe(2);
  });

  it("supports wildcard, module, severity, and filtered subscriptions", async () => {
    const wild: string[] = [];
    const mods: string[] = [];
    const sev: string[] = [];
    const filtered: string[] = [];

    bus.subscribe((e) => { wild.push(e.eventType); }, { eventType: "*" });
    bus.subscribe((e) => { mods.push(e.eventType); }, { module: "trust" });
    bus.subscribe((e) => { sev.push(e.eventType); }, {
      filters: { severity: "CRITICAL" },
    });
    bus.subscribe((e) => { filtered.push(e.eventId); }, {
      filters: { stock: "INFY", eventType: "TrustScoreUpdated" },
    });

    await bus.publishEvent({
      eventType: "TrustScoreUpdated",
      module: "trust",
      severity: "INFO",
      payload: { stock: "INFY", trustScore: 92 },
    });
    await bus.publishEvent({
      eventType: "CriticalFailure",
      module: "orchestrator",
      severity: "CRITICAL",
      payload: { stock: "RELIANCE" },
    });

    expect(wild.length).toBe(2);
    expect(mods).toEqual(["TrustScoreUpdated"]);
    expect(sev).toEqual(["CriticalFailure"]);
    expect(filtered.length).toBe(1);
  });
});

describe("Filtering, history, retention", () => {
  let bus: ValidationEventBus;

  beforeEach(() => {
    resetValidationEventBus();
    bus = new ValidationEventBus({
      maxHistoryEntries: 5,
      retentionPeriodMs: 60_000,
    });
  });

  it("filters history and retains bounded entries", async () => {
    for (let i = 0; i < 8; i++) {
      await bus.publishEvent({
        eventType: i % 2 === 0 ? "ValidationCompleted" : "ValidationFailed",
        module: i % 2 === 0 ? "market" : "technical",
        validationId: `v-${i}`,
        payload: { stock: i < 3 ? "TATA" : "INFY" },
        severity: i % 2 === 0 ? "INFO" : "ERROR",
      });
    }

    expect(bus.getEventHistory().length).toBeLessThanOrEqual(5);
    const failed = bus.getFailedEvents();
    expect(failed.length).toBeGreaterThan(0);
    const critical = await bus.publishEvent({
      eventType: "CriticalFailure",
      module: "test",
      payload: {},
    });
    expect(bus.getCriticalEvents().some((e) => e.eventId === critical.event.eventId)).toBe(
      true
    );

    const filtered = bus.getEventHistory({
      module: "market",
      stock: "TATA",
    });
    expect(filtered.every((e) => e.module === "market")).toBe(true);
  });
});

describe("Replay", () => {
  let bus: ValidationEventBus;

  beforeEach(() => {
    resetValidationEventBus();
    bus = new ValidationEventBus();
  });

  it("replays by event id, validation id, failed and critical", async () => {
    const first = await bus.publishEvent({
      eventType: "ValidationFailed",
      module: "hallucination",
      validationId: "val-99",
      payload: {},
      severity: "ERROR",
    });
    await bus.publishEvent({
      eventType: "CriticalFailure",
      module: "orchestrator",
      validationId: "val-99",
      payload: {},
    });

    const byId = await bus.replayEvents({
      mode: "EVENT_ID",
      eventId: first.event.eventId,
    });
    expect(byId.count).toBe(1);

    const byVal = await bus.replayEvents({
      mode: "VALIDATION_ID",
      validationId: "val-99",
    });
    expect(byVal.count).toBeGreaterThanOrEqual(2);

    const failed = await bus.replayEvents({ mode: "FAILED" });
    expect(failed.count).toBeGreaterThan(0);

    const critical = await bus.replayEvents({ mode: "CRITICAL" });
    expect(critical.count).toBeGreaterThan(0);

    expect(bus.getEventMetrics().replayCount).toBeGreaterThan(0);
  });
});

describe("Queue, priority dispatch, failure recovery", () => {
  it("buffers events and flushes queue", async () => {
    const bus = new ValidationEventBus({
      dispatchMode: "BUFFERED",
      queueSize: 10,
    });
    const received: string[] = [];
    bus.subscribe((e) => { received.push(e.eventId); });

    await bus.publishEvent({
      eventType: "ValidationStarted",
      module: "test",
      payload: {},
    });
    expect(received.length).toBe(0);
    expect(bus.getEventMetrics().queueSize).toBeGreaterThan(0);

    await bus.flushQueue();
    expect(received.length).toBe(1);
  });

  it("priority queue favors CRITICAL events", async () => {
    const bus = new ValidationEventBus({
      dispatchMode: "PRIORITY_QUEUE",
      queueSize: 20,
    });
    // Enqueue INFO first without auto-flush (non-critical)
    await bus.publishEvent({
      eventType: "ValidationStarted",
      module: "test",
      severity: "INFO",
      payload: { n: 1 },
    });
    await bus.publishEvent({
      eventType: "WarningRaised",
      module: "test",
      severity: "WARNING",
      payload: { n: 2 },
    });

    const order: string[] = [];
    bus.subscribe((e) => { order.push(e.severity); });

    // Critical triggers flush
    await bus.publishEvent({
      eventType: "CriticalFailure",
      module: "test",
      severity: "CRITICAL",
      payload: { n: 3 },
    });
    await bus.flushQueue();

    expect(order[0]).toBe("CRITICAL");
  });

  it("recovers from subscriber failures without throwing", async () => {
    const bus = new ValidationEventBus({
      retryCount: 1,
      retryDelayMs: 5,
      timeoutMs: 200,
    });
    bus.subscribe(() => {
      throw new Error("subscriber boom");
    });
    const ok: string[] = [];
    bus.subscribe((e) => { ok.push(e.eventId); });

    const result = await bus.publishEvent({
      eventType: "ValidationCompleted",
      module: "test",
      payload: {},
    });

    expect(result.event.eventId).toBeTruthy();
    expect(ok.length).toBe(1);
    expect(result.dispatch.failures).toBeGreaterThanOrEqual(1);
  });
});

describe("Metrics and health", () => {
  it("tracks metrics and reports health", async () => {
    const bus = new ValidationEventBus();
    bus.subscribe(() => undefined);

    await bus.publishEvent({
      eventType: "ValidationCompleted",
      module: "market",
      payload: {},
    });
    await bus.publishEvent({
      eventType: "CriticalFailure",
      module: "trust",
      payload: {},
    });

    const metrics = bus.getEventMetrics();
    expect(metrics.totalEvents).toBe(2);
    expect(metrics.eventsPerModule.market).toBe(1);
    expect(metrics.criticalEvents).toBeGreaterThanOrEqual(1);
    expect(metrics.subscriberCount).toBeGreaterThanOrEqual(1);

    const health = bus.getEventHealth();
    expect(health.overall).toBeTruthy();
    expect(health.dispatcherHealth).toBeTruthy();
    expect(health.registryHealth).toBe("HEALTHY");

    const snap = bus.createSnapshot();
    expect(snap.snapshotId).toContain("eventbus:");
    expect(snap.engineVersion).toBe(
      DEFAULT_VALIDATION_EVENT_CONFIGURATION.engineVersion
    );
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationEventBus();
    resetEventTypeRegistrationState();
  });

  afterEach(() => {
    resetValidationEventBus();
  });

  it("exposes publish/subscribe/history/replay/metrics/health helpers", async () => {
    registerValidationEventBus({
      force: true,
      startHealthMonitoring: false,
    });

    const seen: string[] = [];
    const id = subscribe((e) => { seen.push(e.eventType); }, {
      eventType: "DashboardRefreshed",
    });

    await publishEvent({
      eventType: "DashboardRefreshed",
      module: "dashboard",
      payload: { healthScore: 90 },
    });

    expect(seen).toContain("DashboardRefreshed");
    expect(getEventHistory({ module: "dashboard" }).length).toBeGreaterThan(0);

    const replayed = await replayEvents({
      mode: "FILTERED",
      filters: { eventType: "DashboardRefreshed" },
    });
    expect(replayed.count).toBeGreaterThan(0);
    expect(getEventMetrics().totalEvents).toBeGreaterThan(0);
    expect(getEventHealth().checkedAt).toBeTruthy();
    expect(unsubscribe(id)).toBe(true);
  });
});
