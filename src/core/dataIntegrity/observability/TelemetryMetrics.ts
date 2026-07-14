/**
 * Operational metrics for the observability engine.
 */

export interface ObservabilityOperationalMetrics {
  telemetryEvents: number;
  collectedMetrics: number;
  traceCount: number;
  exportCount: number;
  snapshotCount: number;
  droppedEvents: number;
  observabilityScore: number;
  averageCollectionTime: number;
  lastCollectionAt: string | null;
}

export class TelemetryMetricsTracker {
  private telemetryEvents = 0;
  private collectedMetrics = 0;
  private traceCount = 0;
  private exportCount = 0;
  private snapshotCount = 0;
  private droppedEvents = 0;
  private observabilityScore = 0;
  private collectionTimeSum = 0;
  private collections = 0;
  private lastCollectionAt: string | null = null;

  recordCollection(input: {
    runtimeMs: number;
    telemetryEvents: number;
    metricsCount: number;
    traceCount: number;
    droppedEvents: number;
    observabilityScore: number;
  }): void {
    this.collections += 1;
    this.collectionTimeSum += input.runtimeMs;
    this.telemetryEvents += input.telemetryEvents;
    this.collectedMetrics += input.metricsCount;
    this.traceCount += input.traceCount;
    this.droppedEvents += input.droppedEvents;
    this.observabilityScore = input.observabilityScore;
    this.lastCollectionAt = new Date().toISOString();
  }

  recordExport(): void {
    this.exportCount += 1;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ObservabilityOperationalMetrics {
    return {
      telemetryEvents: this.telemetryEvents,
      collectedMetrics: this.collectedMetrics,
      traceCount: this.traceCount,
      exportCount: this.exportCount,
      snapshotCount: this.snapshotCount,
      droppedEvents: this.droppedEvents,
      observabilityScore: this.observabilityScore,
      averageCollectionTime:
        this.collections === 0
          ? 0
          : round2(this.collectionTimeSum / this.collections),
      lastCollectionAt: this.lastCollectionAt,
    };
  }

  reset(): void {
    this.telemetryEvents = 0;
    this.collectedMetrics = 0;
    this.traceCount = 0;
    this.exportCount = 0;
    this.snapshotCount = 0;
    this.droppedEvents = 0;
    this.observabilityScore = 0;
    this.collectionTimeSum = 0;
    this.collections = 0;
    this.lastCollectionAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
