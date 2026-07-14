/**
 * Event bus metrics and health monitoring.
 */

export interface EventBusMetricsSnapshot {
  totalEvents: number;
  eventsPerModule: Record<string, number>;
  criticalEvents: number;
  averageDispatchTime: number;
  failureRate: number;
  replayCount: number;
  subscriberCount: number;
  eventsPerSecond: number;
  averageDispatchTimeMs: number;
  queueSize: number;
  droppedEvents: number;
  failureCount: number;
}

export type HealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";

export interface EventBusHealth {
  overall: HealthStatus;
  dispatcherHealth: HealthStatus;
  subscriberHealth: HealthStatus;
  queueHealth: HealthStatus;
  replayHealth: HealthStatus;
  registryHealth: HealthStatus;
  checkedAt: string;
}

export class ValidationEventMetrics {
  private totalEvents = 0;
  private criticalEvents = 0;
  private failureCount = 0;
  private droppedEvents = 0;
  private replayCount = 0;
  private dispatchTimeSum = 0;
  private dispatchCount = 0;
  private readonly eventsPerModule: Record<string, number> = {};
  private readonly recentTimestamps: number[] = [];
  private subscriberCount = 0;
  private queueSize = 0;
  private registrySize = 0;

  recordPublish(module: string, severity: string): void {
    this.totalEvents += 1;
    this.eventsPerModule[module] =
      (this.eventsPerModule[module] ?? 0) + 1;
    if (severity === "CRITICAL") this.criticalEvents += 1;
    const now = Date.now();
    this.recentTimestamps.push(now);
    // Keep ~10s window for EPS
    while (
      this.recentTimestamps.length > 0 &&
      now - this.recentTimestamps[0]! > 10_000
    ) {
      this.recentTimestamps.shift();
    }
  }

  recordDispatch(timeMs: number, failed: boolean): void {
    this.dispatchTimeSum += timeMs;
    this.dispatchCount += 1;
    if (failed) this.failureCount += 1;
  }

  recordDrop(): void {
    this.droppedEvents += 1;
  }

  recordReplay(count: number): void {
    this.replayCount += count;
  }

  setSubscriberCount(n: number): void {
    this.subscriberCount = n;
  }

  setQueueSize(n: number): void {
    this.queueSize = n;
  }

  setRegistrySize(n: number): void {
    this.registrySize = n;
  }

  getMetrics(): EventBusMetricsSnapshot {
    const avg =
      this.dispatchCount === 0
        ? 0
        : round2(this.dispatchTimeSum / this.dispatchCount);
    const windowSec = 10;
    return {
      totalEvents: this.totalEvents,
      eventsPerModule: { ...this.eventsPerModule },
      criticalEvents: this.criticalEvents,
      averageDispatchTime: avg,
      averageDispatchTimeMs: avg,
      failureRate:
        this.dispatchCount === 0
          ? 0
          : round2((this.failureCount / this.dispatchCount) * 100),
      replayCount: this.replayCount,
      subscriberCount: this.subscriberCount,
      eventsPerSecond: round2(this.recentTimestamps.length / windowSec),
      queueSize: this.queueSize,
      droppedEvents: this.droppedEvents,
      failureCount: this.failureCount,
    };
  }

  getHealth(input?: {
    maxQueue?: number;
    minRegistry?: number;
  }): EventBusHealth {
    const metrics = this.getMetrics();
    const maxQueue = input?.maxQueue ?? 1000;
    const minRegistry = input?.minRegistry ?? 1;

    const queueHealth: HealthStatus =
      metrics.queueSize >= maxQueue
        ? "CRITICAL"
        : metrics.queueSize >= maxQueue * 0.8
          ? "DEGRADED"
          : "HEALTHY";

    const dispatcherHealth: HealthStatus =
      metrics.failureRate >= 25
        ? "CRITICAL"
        : metrics.failureRate >= 10
          ? "DEGRADED"
          : "HEALTHY";

    const subscriberHealth: HealthStatus =
      metrics.subscriberCount > 0 || metrics.totalEvents === 0
        ? "HEALTHY"
        : "DEGRADED";

    const replayHealth: HealthStatus = "HEALTHY";

    const registryHealth: HealthStatus =
      this.registrySize >= minRegistry ? "HEALTHY" : "CRITICAL";

    const statuses = [
      queueHealth,
      dispatcherHealth,
      subscriberHealth,
      replayHealth,
      registryHealth,
    ];
    const overall: HealthStatus = statuses.includes("CRITICAL")
      ? "CRITICAL"
      : statuses.includes("DEGRADED")
        ? "DEGRADED"
        : "HEALTHY";

    return {
      overall,
      dispatcherHealth,
      subscriberHealth,
      queueHealth,
      replayHealth,
      registryHealth,
      checkedAt: new Date().toISOString(),
    };
  }

  reset(): void {
    this.totalEvents = 0;
    this.criticalEvents = 0;
    this.failureCount = 0;
    this.droppedEvents = 0;
    this.replayCount = 0;
    this.dispatchTimeSum = 0;
    this.dispatchCount = 0;
    this.recentTimestamps.length = 0;
    this.subscriberCount = 0;
    this.queueSize = 0;
    this.registrySize = 0;
    for (const key of Object.keys(this.eventsPerModule)) {
      delete this.eventsPerModule[key];
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
